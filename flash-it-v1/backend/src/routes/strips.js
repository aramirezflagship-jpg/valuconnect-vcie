'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const { optionalAuth } = require('../middleware/auth');
const { getEvent, logPhoto } = require('../services/db');
const storage = require('../services/storage');
const compositor = require('../services/compositor');
const templates = require('../services/templates');

const router = express.Router();

/**
 * POST /api/strips/create
 *
 * Body (JSON): { eventId, photoUrls: string[], templateId?: string }
 * Auth: Bearer token (requireAuth)
 *
 * Returns: { stripUrl, thumbnailUrl, templateId, photoCount }
 */
router.post('/create', optionalAuth, async (req, res, next) => {
  try {
    const { eventId, photoUrls, templateId: requestedTemplateId } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: 'photoUrls must be a non-empty array.' });
    }

    // ── Load event ────────────────────────────────────────────────────────────
    const event = await getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: `Event "${eventId}" not found.` });
    }

    // ── Resolve template ──────────────────────────────────────────────────────
    const templateId = requestedTemplateId || event.templateId || event.template_id || 'single';
    const template = templates.getTemplate(templateId);
    if (!template) {
      return res.status(400).json({ error: `Template "${templateId}" not found.` });
    }

    // ── Validate photo count ──────────────────────────────────────────────────
    if (photoUrls.length !== template.photoCount) {
      return res.status(400).json({
        error: `Template "${templateId}" requires exactly ${template.photoCount} photo(s), but ${photoUrls.length} were provided.`,
      });
    }

    console.log(`[strips] composing strip event=${eventId} template=${templateId} photos=${photoUrls.length}`);

    // ── Download photos ───────────────────────────────────────────────────────
    const { default: fetch } = require('node-fetch');

    const photoBuffers = await Promise.all(
      photoUrls.map(async (url, idx) => {
        const resp = await fetch(url);
        if (!resp.ok) {
          throw Object.assign(
            new Error(`Failed to fetch photo ${idx + 1}: HTTP ${resp.status}`),
            { status: 422 }
          );
        }
        return Buffer.from(await resp.arrayBuffer());
      })
    );

    // ── Compose strip ─────────────────────────────────────────────────────────
    const composeOptions = { eventName: event.name || null };

    let stripBuffer;
    if (template.type === 'strip') {
      stripBuffer = await compositor.composeStrip(photoBuffers, template, composeOptions);
    } else {
      stripBuffer = await compositor.compose(photoBuffers, template, composeOptions);
    }

    // ── Upload full-res strip ─────────────────────────────────────────────────
    const uid = uuidv4();
    const stripKey = `strips/${eventId}/${uid}.png`;
    const stripUrl = await storage.uploadBuffer(stripBuffer, stripKey, 'image/png');

    // ── Generate + upload thumbnail ───────────────────────────────────────────
    const thumbBuffer = await sharp(stripBuffer)
      .resize(400, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbKey = `strips/${eventId}/thumb_${uid}.jpg`;
    const thumbnailUrl = await storage.uploadBuffer(thumbBuffer, thumbKey, 'image/jpeg');

    // ── Log to DB ─────────────────────────────────────────────────────────────
    try {
      await logPhoto(eventId, {
        photoUrl: stripUrl,
        thumbnailUrl,
        themeId: templateId,
      });
    } catch (logErr) {
      // Non-fatal — strip was already uploaded
      console.warn('[strips] logPhoto failed (non-fatal):', logErr.message);
    }

    return res.status(201).json({
      stripUrl,
      thumbnailUrl,
      templateId,
      photoCount: photoUrls.length,
    });
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
