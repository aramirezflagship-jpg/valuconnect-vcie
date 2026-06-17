'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const sharp = require('sharp');
const { applyBranding } = require('../services/branding');
const { composeOnBackground } = require('../services/compositor');
const templatesSvc = require('../services/templates');
const backgroundsSvc = require('../services/backgrounds');
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
 *   - backgroundId {string} — which themed background to composite onto
 *                             (alias: themeId). Falls back to the event's
 *                             defaultBackgroundId, then a solid-color canvas.
 *   - templateId   {string} — optional layout template (default "single")
 *   - guestPhone   {string} — E.164 phone number; if supplied, triggers delivery
 *
 * Returns: { photoUrl, thumbnailUrl, qrCode, printJobId, eventId }
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { eventId, guestPhone } = req.body;
    const backgroundId = req.body.backgroundId || req.body.themeId || null;
    const templateId = req.body.templateId || null;

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

    // ── Resolve themed background ─────────────────────────────────────────────
    // No AI: the guest photo is composited into a template slot ON TOP of a
    // pre-made themed background image. Resolution order:
    //   request backgroundId/themeId → event.defaultBackgroundId → solid color.
    const resolvedBgId =
      backgroundId || eventConfig.defaultBackgroundId || (eventConfig.backgroundIds || [])[0] || null;
    const bgRecord = resolvedBgId ? backgroundsSvc.getBackground(resolvedBgId) : null;

    // ── Resolve layout template (defaults to single-photo 4×6) ────────────────
    const template =
      (templateId && templatesSvc.getTemplate(templateId)) ||
      templatesSvc.getTemplate('single') ||
      _defaultTemplate();

    console.log(
      `[capture] event=${eventId} background=${bgRecord ? bgRecord.id : 'none'} template=${template.id} phone=${guestPhone || 'none'}`
    );

    // ── Pipeline (NO external AI) ─────────────────────────────────────────────
    // Demo events skip compositing — upload the raw photo directly.
    const isDemo = !!eventConfig.is_demo;

    let composedBuffer;
    if (isDemo) {
      composedBuffer = imageBuffer;
    } else if (bgRecord && bgRecord.url) {
      // Fetch the themed background image and composite the guest photo over it.
      try {
        const { default: fetch } = require('node-fetch');
        const bgRes = await fetch(bgRecord.url);
        const bgBuffer = Buffer.from(await bgRes.arrayBuffer());
        composedBuffer = await composeOnBackground([imageBuffer], bgBuffer, template, {
          eventName: eventConfig.eventName || eventConfig.name,
        });
      } catch (bgErr) {
        console.error('[capture] background fetch/composite failed, using raw photo:', bgErr.message);
        composedBuffer = imageBuffer;
      }
    } else {
      // No themed background selected — render the photo onto the template's
      // solid-color canvas so output is still a clean, framed image.
      composedBuffer = await _composeOnSolid([imageBuffer], template, eventConfig);
    }

    // Branding overlay (logo, frame, event name, 4×6 @ 300 DPI)
    const brandedBuffer = isDemo ? composedBuffer : await applyBranding(composedBuffer, eventConfig);

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
      backgroundId: bgRecord ? bgRecord.id : null,
      templateId: template.id,
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
      backgroundId: bgRecord ? bgRecord.id : null,
      templateId: template.id,
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

/** Minimal single-photo 4×6 template used when no template store entry exists. */
function _defaultTemplate() {
  return {
    id: 'single',
    name: 'Classic Single',
    type: 'single',
    printWidth: 1200,
    printHeight: 1800,
    photoCount: 1,
    photoSlots: [{ index: 0, x: 60, y: 60, width: 1080, height: 1530 }],
    background: '#0d0d1a',
  };
}

/**
 * Compose guest photo(s) onto the template's solid-color canvas when no themed
 * background image is selected. Keeps output framed + print-sized without AI.
 * @private
 */
async function _composeOnSolid(photos, template, eventConfig) {
  const { compose } = require('../services/compositor');
  return compose(photos, template, {
    eventName: eventConfig.eventName || eventConfig.name,
    backgroundColor: template.background || eventConfig.brandColor || '#0d0d1a',
  });
}

module.exports = router;
