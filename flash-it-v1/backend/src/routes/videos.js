'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const storage = require('../services/storage');
const { getEvent, logPhoto } = require('../services/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer: store upload in memory (max 100 MB), accept video/* only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(Object.assign(new Error('Only video files are accepted.'), { status: 400 }));
  },
});

/**
 * POST /api/videos/upload
 *
 * Accepts multipart/form-data:
 *   - video     {File}   — recorded video clip (webm or mp4)
 *   - eventId   {string} — which event this video belongs to
 *   - duration  {number} — clip length in seconds
 *
 * Returns: { videoUrl, key, duration, eventId }
 */
router.post('/upload', requireAuth, upload.single('video'), async (req, res, next) => {
  try {
    // ── Validate file presence ────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const { eventId, duration } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    // ── Load event config ─────────────────────────────────────────────────────
    const event = await getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    console.log(`[videos] upload event=${eventId} size=${req.file.size} mimetype=${req.file.mimetype}`);

    // ── Upload to R2 ──────────────────────────────────────────────────────────
    const uuid = uuidv4();
    const key = `videos/${eventId}/${Date.now()}-${uuid}.webm`;
    const videoUrl = await storage.uploadBuffer(req.file.buffer, key, req.file.mimetype);

    // ── Track in db (non-fatal) ───────────────────────────────────────────────
    const parsedDuration = parseFloat(duration) || 0;
    try {
      await logPhoto(eventId, { url: videoUrl, type: 'video', duration: parsedDuration });
    } catch (dbErr) {
      console.warn('[videos] db tracking failed (non-fatal):', dbErr.message);
    }

    return res.status(201).json({
      videoUrl,
      key,
      duration: parsedDuration,
      eventId,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
