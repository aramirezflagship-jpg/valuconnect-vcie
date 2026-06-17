'use strict';
const express = require('express');
const router = express.Router();
const { createGif } = require('../services/gif');
const { v4: uuidv4 } = require('uuid');

// Storage service (for R2 upload)
const storage = require('../services/storage');

/**
 * POST /api/gif/create
 * Body: { frames: string[], eventId?, boomerang?: boolean, delay?: number }
 * frames: array of 2-5 photo URLs (R2 public URLs)
 * Returns: { gifUrl }
 */
router.post('/create', async (req, res, next) => {
  try {
    const { frames, eventId, boomerang = false, delay = 500 } = req.body;
    if (!Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({ error: 'frames must be an array of 2+ URLs' });
    }
    if (frames.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 frames per GIF' });
    }

    const gifBuffer = await createGif(frames, { boomerang, delay });
    const key = `gifs/${eventId || 'standalone'}/${uuidv4()}.gif`;

    const gifUrl = await storage.uploadBuffer(gifBuffer, key, 'image/gif');

    return res.json({ gifUrl, key });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
