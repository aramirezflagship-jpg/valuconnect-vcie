'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const { composeNatural, composeCharacter } = require('../services/compositor');
const backgroundsSvc = require('../services/backgrounds');
const { uploadPhoto } = require('../services/storage');
const { sendSMS, sendWhatsApp } = require('../services/delivery');
const { getEvent, logPhoto, incrementGuestCount, decrementSmsCredits } = require('../services/db');

const router = express.Router();

// Multer: store upload in memory (max 15 MB), accept image/* only.
// Accept either "image" (natural full photo) or "faceImage" (character crop).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files are accepted.'), { status: 400 }));
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'faceImage', maxCount: 1 },
]);

/** Decode a base64 (optionally data-URI prefixed) string to a Buffer. */
function _b64ToBuffer(b64) {
  const clean = String(b64).replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

/** Fetch a remote asset URL into a Buffer. */
async function _fetchBuffer(url) {
  const { default: fetch } = require('node-fetch');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

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
router.post('/', upload, async (req, res, next) => {
  try {
    const { eventId, guestPhone } = req.body;
    const backgroundId = req.body.backgroundId || req.body.templateId || req.body.themeId || null;
    const templateId = req.body.templateId || null;
    // Mode: "natural" (real photo + frame + message) or "character"
    // (face-in-the-hole). Defaults to "natural".
    const mode = backgroundsSvc.normalizeMode(req.body.mode);
    const files = req.files || {};

    // ── Validate required fields ──────────────────────────────────────────────
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
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

    // ── Resolve the chosen template/background record ─────────────────────────
    // A "background" record now carries its mode (natural|character), category
    // (drives the 3D message font), and—for character—a faceSlot + artwork.
    const resolvedBgId =
      backgroundId || eventConfig.defaultBackgroundId || (eventConfig.backgroundIds || [])[0] || null;
    const bgRecord = resolvedBgId ? backgroundsSvc.getBackground(resolvedBgId) : null;

    // Effective mode: explicit request wins; else the record's mode; else natural.
    const effectiveMode = req.body.mode ? mode : backgroundsSvc.normalizeMode(bgRecord && bgRecord.mode);
    const category = (bgRecord && bgRecord.category) || req.body.category || eventConfig.category || 'fiesta';
    const message =
      req.body.message || eventConfig.message || eventConfig.eventName || eventConfig.name || '';

    console.log(
      `[capture] event=${eventId} mode=${effectiveMode} background=${bgRecord ? bgRecord.id : 'none'} phone=${guestPhone || 'none'}`
    );

    // ── Compose (NO external AI, $0/photo) ────────────────────────────────────
    let finalBuffer;

    if (effectiveMode === 'character') {
      // Need the cropped face + the artwork template with a faceSlot.
      if (!bgRecord) {
        return res.status(400).json({ error: 'Character mode requires a valid templateId/backgroundId.' });
      }
      if (!bgRecord.faceSlot || !bgRecord.url) {
        return res.status(400).json({ error: `Template "${bgRecord.id}" is not a usable character template (missing faceSlot or artwork).` });
      }

      let faceBuffer;
      if (files.faceImage && files.faceImage[0]) {
        faceBuffer = files.faceImage[0].buffer;
      } else if (req.body.faceImageBase64) {
        faceBuffer = _b64ToBuffer(req.body.faceImageBase64);
      } else if (files.image && files.image[0]) {
        // Tolerate clients that send the crop under "image".
        faceBuffer = files.image[0].buffer;
      } else {
        return res.status(400).json({ error: 'Character mode requires the cropped face as "faceImage" (multipart) or "faceImageBase64".' });
      }

      const artworkBuffer = await _fetchBuffer(bgRecord.url);
      finalBuffer = await composeCharacter(faceBuffer, artworkBuffer, bgRecord.faceSlot, {
        message,
        category,
      });
    } else {
      // Natural: full photo + optional frame/overlay + 3D message at top.
      let imageBuffer;
      if (files.image && files.image[0]) {
        imageBuffer = files.image[0].buffer;
      } else if (req.body.imageBase64) {
        imageBuffer = _b64ToBuffer(req.body.imageBase64);
      } else {
        return res.status(400).json({ error: 'Natural mode requires a photo as "image" (multipart) or "imageBase64".' });
      }

      const isDemo = !!eventConfig.is_demo;
      if (isDemo) {
        finalBuffer = imageBuffer;
      } else {
        let frameBuffer = null;
        if (bgRecord && bgRecord.url) {
          try {
            frameBuffer = await _fetchBuffer(bgRecord.url);
          } catch (frameErr) {
            console.error('[capture] frame fetch failed, skipping frame:', frameErr.message);
          }
        }
        finalBuffer = await composeNatural(imageBuffer, { frameBuffer, message, category });
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
      mode: effectiveMode,
      backgroundId: bgRecord ? bgRecord.id : null,
      templateId: bgRecord ? bgRecord.id : null,
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
      mode: effectiveMode,
      printJobId,
      eventId,
      backgroundId: bgRecord ? bgRecord.id : null,
      templateId: bgRecord ? bgRecord.id : null,
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

module.exports = router;
