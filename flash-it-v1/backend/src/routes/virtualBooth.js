'use strict';
const express = require('express');
const router = express.Router();
const { getEvent } = require('../services/db');

/**
 * GET /api/virtual-booth/:eventCode
 * Returns event config for the virtual booth web experience.
 * Public — no auth required.
 */
router.get('/:eventCode', async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventCode);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'expired') return res.status(410).json({ error: 'This event has ended' });

    // Return only fields the guest needs
    return res.json({
      eventCode: req.params.eventCode,
      eventName: event.name || event.eventName,
      themes: event.themes || [],
      overlayUrl: event.overlayUrl || null,
      gifEnabled: event.gifEnabled || false,
      planTier: event.plan_tier || event.planTier || 'celebration',
      maxGuests: event.maxGuests || 100,
      guestCount: event.guest_count || event.guestCount || 0,
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/virtual-booth/:eventCode/capture
 * Guest uploads their selfie → AI processes it → returns photo URL.
 * Reuses existing capture pipeline.
 * Body: JSON with { photoBase64: 'data:image/jpeg;base64,...', themeId? }
 */
router.post('/:eventCode/capture', async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventCode);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Extract photo from body (base64)
    const photoBase64 = req.body?.photoBase64;
    const themeId = req.body?.themeId || (event.themes && event.themes[0]) || 'galaxy';

    if (!photoBase64) return res.status(400).json({ error: 'photoBase64 is required' });

    // Remove data URL prefix if present
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const photoBuffer = Buffer.from(base64Data, 'base64');

    // Import AI pipeline
    const aiTransform = require('../services/ai-transform');
    const storage = require('../services/storage');
    const { v4: uuidv4 } = require('uuid');

    // Run AI transformation (same as regular capture)
    let finalBuffer = photoBuffer;
    try {
      finalBuffer = await aiTransform.transformWithTheme(photoBuffer, { id: themeId, name: themeId }, event);
    } catch (aiErr) {
      console.warn('[virtualBooth] AI transform failed, using original:', aiErr.message);
    }

    // Apply overlay if configured
    if (event.overlayUrl) {
      try {
        const sharp = require('sharp');
        const { default: fetch } = require('node-fetch');
        const overlayRes = await fetch(event.overlayUrl);
        const overlayBuf = Buffer.from(await overlayRes.arrayBuffer());
        finalBuffer = await sharp(finalBuffer).composite([{ input: overlayBuf, blend: 'over' }]).toBuffer();
      } catch (ovErr) {
        console.warn('[virtualBooth] Overlay failed:', ovErr.message);
      }
    }

    // Upload to R2
    const eventCode = req.params.eventCode;
    const key = `virtual-booth/${eventCode}/${uuidv4()}.jpg`;
    const photoUrl = await storage.uploadBuffer(finalBuffer, key, 'image/jpeg');

    // Track in db
    const db = require('../services/db');
    if (typeof db.addPhoto === 'function') {
      await db.addPhoto(event.id || eventCode, { url: photoUrl, source: 'virtual-booth' }).catch(() => {});
    }

    return res.json({ photoUrl, eventName: event.name || event.eventName });
  } catch (err) { next(err); }
});

module.exports = router;
