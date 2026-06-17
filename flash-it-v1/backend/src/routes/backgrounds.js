'use strict';

/**
 * Themed background images, grouped by occasion category.
 *
 * GET  /api/backgrounds?category=<cat>   (public) — list backgrounds
 * GET  /api/backgrounds/categories       (public) — list canonical categories
 * POST /api/backgrounds                  (host OR admin) — upload a new background
 *
 * Uploaded images are stored in R2 under flash-it/backgrounds/<category>/ and
 * the record is persisted in the backgrounds JSON store.
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const { requireAuth, optionalAuth } = require('../middleware/auth');
const backgrounds = require('../services/backgrounds');
const storage = require('../services/storage');

const router = express.Router();

// Multer: accept a single image up to 15 MB, image/* only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files are accepted.'), { status: 400 }));
  },
});

/**
 * Auth gate that accepts EITHER a host JWT (requireAuth) OR the admin secret
 * header (x-admin-secret). Lets the owner seed backgrounds with the admin
 * secret while still allowing logged-in hosts to add their own.
 */
function hostOrAdmin(req, res, next) {
  const adminSecret = process.env.ADMIN_SECRET || 'flash-it-admin-2026';
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === adminSecret) {
    req.isAdmin = true;
    return next();
  }
  return requireAuth(req, res, next);
}

// ── GET /api/backgrounds/categories ───────────────────────────────────────────

router.get('/categories', (_req, res) => {
  return res.json({ categories: backgrounds.listCategories() });
});

// ── GET /api/backgrounds?category=<cat> ───────────────────────────────────────

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const { category } = req.query;
    const list = backgrounds.listBackgrounds(category).map((b) => ({
      id: b.id,
      category: b.category,
      name: b.name,
      url: b.url,
      thumbnailUrl: b.thumbnailUrl,
    }));
    return res.json({ backgrounds: list, count: list.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/backgrounds ─────────────────────────────────────────────────────
// multipart/form-data: image (file) + category (string) + name (string)

router.post('/', hostOrAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided. Upload a file as the "image" field.' });
    }

    const category = backgrounds.normalizeCategory(req.body.category);
    const name = (req.body.name || '').toString().trim() || category;

    // Normalise to JPEG for predictable compositing + a small thumbnail.
    const fullBuffer = await sharp(req.file.buffer)
      .rotate()
      .jpeg({ quality: 90 })
      .toBuffer();
    const thumbBuffer = await sharp(req.file.buffer)
      .rotate()
      .resize(400, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const baseId = uuidv4().slice(0, 8);
    const key = `flash-it/backgrounds/${category}/${baseId}.jpg`;
    const thumbKey = `flash-it/backgrounds/${category}/thumb_${baseId}.jpg`;

    const url = await storage.uploadBuffer(fullBuffer, key, 'image/jpeg');
    const thumbnailUrl = await storage.uploadBuffer(thumbBuffer, thumbKey, 'image/jpeg');

    const record = backgrounds.createBackground({
      category,
      name,
      url,
      thumbnailUrl,
      r2Key: key,
      accountId: req.userId || null,
    });

    return res.status(201).json({
      id: record.id,
      category: record.category,
      name: record.name,
      url: record.url,
      thumbnailUrl: record.thumbnailUrl,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
