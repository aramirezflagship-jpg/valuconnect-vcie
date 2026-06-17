'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const sharp = require('sharp');
const { removeBackground } = require('../services/removebg');
const { transformWithTheme } = require('../services/ai-transform');
const { applyBranding } = require('../services/branding');
const { uploadPhoto } = require('../services/storage');
const { sendSMS, sendWhatsApp } = require('../services/delivery');
const { getEvent, logPhoto, incrementGuestCount, decrementSmsCredits } = require('../services/db');

const router = express.Router();

// Multer: store upload in memory (max 15 MB), accept image/* only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files are accepted.'), { status: 400 }));
  },
});

/**
 * POST /api/capture
 *
 * Accepts multipart/form-data:
 *   - image        {File}   — photo from iPad camera (JPEG/PNG/WebP)
 *   - imageBase64  {string} — alternative: base64-encoded image (used when
 *                             sending JSON from some iPad frameworks)
 *   - eventId      {string} — which event this photo belongs to
 *   - themeId      {string} — which theme to apply (must be in event.themes)
 *   - guestPhone   {string} — E.164 phone number; if supplied, triggers delivery
 *
 * Returns: { photoUrl, thumbnailUrl, qrCode, printJobId, eventId }
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { eventId, themeId, guestPhone } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    // ── Resolve image buffer from file upload or base64 body ──────────────────
    let imageBuffer;
    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body.imageBase64) {
      const b64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(b64, 'base64');
    } else {
      return res.status(400).json({ error: 'No image provided. Send as multipart "image" field or "imageBase64" body field.' });
    }

    // ── Load event config ─────────────────────────────────────────────────────
    const eventConfig = await getEvent(eventId);
    if (!eventConfig) {
      return res.status(404).json({ error: `Event "${eventId}" not found.` });
    }

    // ── Enforce plan limits ───────────────────────────────────────────────────
    if (eventConfig.status && eventConfig.status !== 'active') {
      return res.status(403).json({ error: 'Event is not active.' });
    }

    if (eventConfig.expires_at && new Date() > new Date(eventConfig.expires_at)) {
      return res.status(403).json({ error: 'Event has expired.' });
    }

    if (eventConfig.max_guests != null && eventConfig.guest_count >= eventConfig.max_guests) {
      return res.status(403).json({ error: 'Event is full (guest limit reached).' });
    }

    // Determine if SMS can be sent (silently skip if credits exhausted)
    const smsBlocked =
      guestPhone &&
      eventConfig.sms_credits_limit != null &&
      eventConfig.sms_credits_used >= eventConfig.sms_credits_limit;

    // ── Resolve theme ─────────────────────────────────────────────────────────
    const themes = eventConfig.themes || [];
    const theme = themes.find((t) => t.id === themeId) || themes[0] || _defaultTheme();
    if (!theme) {
      return res.status(400).json({ error: 'No themes configured for this event.' });
    }

    console.log(`[capture] event=${eventId} theme=${theme.id} phone=${guestPhone || 'none'}`);

    // ── Pipeline ──────────────────────────────────────────────────────────────
    // Demo events skip AI processing — upload the raw photo directly.
    const isDemo = !!eventConfig.is_demo;

    // 1. Background removal
    const cutoutBuffer = isDemo ? imageBuffer : await removeBackground(imageBuffer);

    // 2. AI background + composite
    const transformedBuffer = isDemo ? cutoutBuffer : await transformWithTheme(cutoutBuffer, theme, eventConfig);

    // 3. Branding overlay (logo, frame, event name, 4×6 @ 300 DPI)
    const brandedBuffer = isDemo ? transformedBuffer : await applyBranding(transformedBuffer, eventConfig);

    // 3b. Event overlay compositing (if configured)
    let finalBuffer = brandedBuffer;
    if (eventConfig.overlayUrl) {
      try {
        const { default: fetch } = require('node-fetch');
        const overlayRes = await fetch(eventConfig.overlayUrl);
        const overlayBuffer = Buffer.from(await overlayRes.arrayBuffer());
        finalBuffer = await sharp(brandedBuffer)
          .composite([{ input: overlayBuffer, blend: 'over' }])
          .toBuffer();
      } catch (overlayErr) {
        console.error('[capture] overlay composite failed, using branded buffer:', overlayErr.message);
        finalBuffer = brandedBuffer;
      }
    }

    // 4. Upload to Cloudinary
    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const { url: photoUrl, publicId, thumbnailUrl } = await uploadPhoto(finalBuffer, eventId, filename);

    // 5. Generate QR code pointing at the photo URL
    const qrCode = await QRCode.toDataURL(photoUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
    });

    // 6. Create a print job record (Phase 2 printing integration)
    const printJobId = uuidv4();
    const photoRecord = {
      id: printJobId,
      eventId,
      themeId: theme.id,
      photoUrl,
      thumbnailUrl,
      publicId,
      qrCode,
      printStatus: 'pending',
      guestPhone: guestPhone || null,
      createdAt: new Date().toISOString(),
    };

    await logPhoto(eventId, photoRecord);

    // 7. Update plan counters after successful capture
    await incrementGuestCount(eventId);

    // 8. Deliver to guest if phone number supplied and credits remain
    let deliveryResult = null;
    let smsSent = false;
    if (guestPhone && !smsBlocked) {
      const channels = eventConfig.deliveryChannels || ['sms'];
      deliveryResult = await _deliver(guestPhone, photoUrl, eventConfig.name, channels);
      // Check if SMS was actually delivered to decrement credits
      const smsDelivered = deliveryResult && deliveryResult.some(
        (r) => r && r.success !== false && (r.channel === 'sms' || !r.channel)
      );
      if (smsDelivered) {
        smsSent = true;
        await decrementSmsCredits(eventId);
      }
    } else if (guestPhone && smsBlocked) {
      console.log(`[capture] SMS skipped for event=${eventId} — credits exhausted`);
    }

    return res.status(201).json({
      resultUrl: photoUrl,   // frontend expects resultUrl
      photoUrl,
      thumbnailUrl,
      qrCode,
      printJobId,
      eventId,
      themeId: theme.id,
      delivery: deliveryResult,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Dispatch delivery over the configured channels.
 * Returns an array of delivery results.
 * @private
 */
async function _deliver(phone, photoUrl, eventName, channels) {
  const results = [];
  const tasks = channels.map(async (channel) => {
    try {
      if (channel === 'sms') {
        const r = await sendSMS(phone, photoUrl, eventName);
        results.push(r);
      } else if (channel === 'whatsapp') {
        const r = await sendWhatsApp(phone, photoUrl, eventName);
        results.push(r);
      }
    } catch (err) {
      console.error(`[capture] delivery via ${channel} failed:`, err.message);
      results.push({ success: false, channel, error: err.message });
    }
  });
  await Promise.all(tasks);
  return results;
}

/** Minimal theme used when an event has no themes configured. */
function _defaultTheme() {
  return {
    id: 'default',
    name: 'Classic Studio',
    prompt: 'elegant photography studio backdrop, soft bokeh, professional lighting',
    negativePrompt: 'people, text, watermark',
    style: 'photorealistic',
  };
}

module.exports = router;
