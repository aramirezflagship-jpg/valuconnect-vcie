'use strict';

/**
 * Public themed-frame assets for NATURAL mode.
 *
 * GET /api/frames/:slug.png  → a transparent-PNG frame for the given occasion
 * category (fiesta, wedding, quinceanera, birthday, kids-birthday). These back
 * the seeded "frame-natural-*" catalogue records, and are what the kiosk
 * BackgroundPicker shows as thumbnails (via the Vercel /api proxy).
 *
 * No auth: frames are public, deterministic, AI-free assets.
 */

const express = require('express');
const framePresets = require('../services/framePresets');

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').replace(/\.png$/i, '');
    const buf = await framePresets.renderFrame(slug);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // 1 day; frames are stable
    return res.send(buf);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
