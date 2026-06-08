'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const { removeBackground } = require('../services/removebg');
const { transformWithTheme } = require('../services/ai-transform');
const { applyBranding } = require('../services/branding');
const { uploadPhoto } = require('../services/storage');
const { sendSMS, sendWhatsApp } = require('../services/delivery');
const { getEvent, logPhoto } = require('../services/events');

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

    // ── Resolve theme ─────────────────────────────────────────────────────────
    const themes = eventConfig.themes || [];
    const theme = themes.find((t) => t.id === themeId) || themes[0] || _defaultTheme();
    if (!theme) {
      return res.status(400).json({ error: 'No themes configured for this event.' });
    }

    console.log(`[capture] event=${eventId} theme=${theme.id} phone=${guestPhone || 'none'}`);

    // ── Pipeline ──────────────────────────────────────────────────────────────
    // 1. Background removal
    const cutoutBuffer = await removeBackground(imageBuffer);

    // 2. AI background + composite
    const transformedBuffer = await transformWithTheme(cutoutBuffer, theme, eventConfig);

    // 3. Branding overlay (logo, frame, event name, 4×6 @ 300 DPI)
    const brandedBuffer = await applyBranding(transformedBuffer, eventConfig);

    // 4. Upload to Cloudinary
    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const { url: photoUrl, publicId, thumbnailUrl } = await uploadPhoto(brandedBuffer, eventId, filename);

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

    // 7. Deliver to guest if phone number supplied
    let deliveryResult = null;
    if (guestPhone) {
      const channels = eventConfig.deliveryChannels || ['sms'];
      deliveryResult = await _deliver(guestPhone, photoUrl, eventConfig.name, channels);
    }

    return res.status(201).json({
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
