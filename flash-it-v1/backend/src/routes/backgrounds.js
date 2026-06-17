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

const { requireAuth, optionalAuth, adminAuth } = require('../middleware/auth');
const backgrounds = require('../services/backgrounds');
const storage = require('../services/storage');
const { generateCharacterArtwork, generateNaturalFrame } = require('../services/placeholderArt');

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
    const { category, mode } = req.query;
    const list = backgrounds.listBackgrounds(category, mode).map((b) => ({
      id: b.id,
      category: b.category,
      mode: backgrounds.normalizeMode(b.mode),
      name: b.name,
      url: b.url,
      thumbnailUrl: b.thumbnailUrl,
      faceSlot: b.faceSlot || null,
    }));
    return res.json({ backgrounds: list, count: list.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/backgrounds ─────────────────────────────────────────────────────
// multipart/form-data:
//   image     (file)   — for "character": the artwork PNG (transparent face hole, REQUIRED).
//                        for "natural": the frame/overlay PNG (transparent, OPTIONAL).
//   category  (string) — wedding|quinceanera|corporate|birthday|holiday|fiesta
//   mode      (string) — "natural" | "character"  (default "natural")
//   name      (string) — display name
//   faceSlot  (string) — JSON: {"x":..,"y":..,"width":..,"height":..,"shape":"oval"|"rect"}
//                        REQUIRED for "character"; ignored for "natural".

router.post('/', hostOrAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const category = backgrounds.normalizeCategory(req.body.category);
    const mode = backgrounds.normalizeMode(req.body.mode);
    const name = (req.body.name || '').toString().trim() || category;

    // Validate per-mode requirements.
    let faceSlot = null;
    if (mode === 'character') {
      if (!req.file) {
        return res.status(400).json({ error: 'Character mode requires the artwork PNG in the "image" field.' });
      }
      faceSlot = backgrounds.normalizeFaceSlot(req.body.faceSlot);
      if (!faceSlot) {
        return res.status(400).json({
          error: 'Character mode requires a valid "faceSlot" JSON: {x,y,width,height,shape:"oval"|"rect"}.',
        });
      }
    }

    const baseId = uuidv4().slice(0, 8);
    let url = null;
    let thumbnailUrl = null;
    let key = null;

    if (req.file) {
      // Both the character artwork and the natural frame/overlay carry
      // transparency, so encode as PNG (NOT JPEG) to preserve the alpha channel.
      const fullBuffer = await sharp(req.file.buffer)
        .rotate()
        .png()
        .toBuffer();
      const thumbBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(400, null, { withoutEnlargement: true })
        .png()
        .toBuffer();

      key = `flash-it/backgrounds/${category}/${baseId}.png`;
      const thumbKey = `flash-it/backgrounds/${category}/thumb_${baseId}.png`;

      url = await storage.uploadBuffer(fullBuffer, key, 'image/png');
      thumbnailUrl = await storage.uploadBuffer(thumbBuffer, thumbKey, 'image/png');
    }

    const record = backgrounds.createBackground({
      category,
      mode,
      name,
      url,
      thumbnailUrl,
      faceSlot,
      r2Key: key,
      accountId: req.userId || null,
    });

    return res.status(201).json({
      id: record.id,
      category: record.category,
      mode: record.mode,
      name: record.name,
      url: record.url,
      thumbnailUrl: record.thumbnailUrl,
      faceSlot: record.faceSlot || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/backgrounds/seed ────────────────────────────────────────────────
// Admin-only. Generates placeholder artwork (Sharp, AI-free), uploads to R2, and
// creates ONE natural template + ONE character template with FIXED ids so the
// frontend/tester can rely on them across redeploys (the JSON store is ephemeral
// on Render, so this is the supported way to re-seed). Idempotent: re-running
// overwrites the same two records.

const SEED_NATURAL_ID = 'seed-natural-fiesta';
const SEED_CHARACTER_ID = 'seed-character-fiesta';

router.post('/seed', adminAuth, async (_req, res, next) => {
  try {
    // ── Natural template (transparent frame/overlay) ──
    const frame = await generateNaturalFrame({ width: 1200, height: 1800, color: '#ffd24d' });
    const frameKey = `flash-it/backgrounds/fiesta/${SEED_NATURAL_ID}.png`;
    const frameThumbKey = `flash-it/backgrounds/fiesta/thumb_${SEED_NATURAL_ID}.png`;
    const frameThumb = await sharp(frame.buffer).resize(400, null, { withoutEnlargement: true }).png().toBuffer();
    const frameUrl = await storage.uploadBuffer(frame.buffer, frameKey, 'image/png');
    const frameThumbUrl = await storage.uploadBuffer(frameThumb, frameThumbKey, 'image/png');

    const naturalRecord = backgrounds.createBackground({
      id: SEED_NATURAL_ID,
      category: 'fiesta',
      mode: 'natural',
      name: 'Fiesta Frame (seed)',
      url: frameUrl,
      thumbnailUrl: frameThumbUrl,
      r2Key: frameKey,
    });

    // ── Character template (artwork + transparent face hole) ──
    const art = await generateCharacterArtwork({ width: 1200, height: 1800, label: 'FIESTA' });
    const artKey = `flash-it/backgrounds/fiesta/${SEED_CHARACTER_ID}.png`;
    const artThumbKey = `flash-it/backgrounds/fiesta/thumb_${SEED_CHARACTER_ID}.png`;
    const artThumb = await sharp(art.buffer).resize(400, null, { withoutEnlargement: true }).png().toBuffer();
    const artUrl = await storage.uploadBuffer(art.buffer, artKey, 'image/png');
    const artThumbUrl = await storage.uploadBuffer(artThumb, artThumbKey, 'image/png');

    const characterRecord = backgrounds.createBackground({
      id: SEED_CHARACTER_ID,
      category: 'fiesta',
      mode: 'character',
      name: 'Fiesta Character (seed)',
      url: artUrl,
      thumbnailUrl: artThumbUrl,
      faceSlot: art.faceSlot,
      r2Key: artKey,
    });

    return res.status(201).json({
      seeded: [
        { id: naturalRecord.id, mode: naturalRecord.mode, url: naturalRecord.url },
        { id: characterRecord.id, mode: characterRecord.mode, url: characterRecord.url, faceSlot: characterRecord.faceSlot },
      ],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
