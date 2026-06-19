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
const gemini = require('../services/gemini');
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

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, mode } = req.query;
    const list = (await backgrounds.listBackgrounds(category, mode)).map((b) => ({
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

router.post('/', adminAuth, upload.single('image'), async (req, res, next) => {
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
      let fullBuffer = await sharp(req.file.buffer).rotate().png().toBuffer();

      // Character mode: punch a transparent hole at the faceSlot so the guest's
      // face shows through. This lets the admin upload AI-generated artwork that
      // has a SOLID face circle (e.g. a white placeholder) and have it cut out
      // automatically — no external editor needed.
      if (mode === 'character' && faceSlot) {
        const meta = await sharp(fullBuffer).metadata();
        fullBuffer = await gemini.punchFaceHole(fullBuffer, faceSlot, meta.width, meta.height);
      }

      const thumbBuffer = await sharp(fullBuffer)
        .resize(400, null, { withoutEnlargement: true })
        .png()
        .toBuffer();

      key = `flash-it/backgrounds/${category}/${baseId}.png`;
      const thumbKey = `flash-it/backgrounds/${category}/thumb_${baseId}.png`;

      url = await storage.uploadBuffer(fullBuffer, key, 'image/png');
      thumbnailUrl = await storage.uploadBuffer(thumbBuffer, thumbKey, 'image/png');
    }

    const record = await backgrounds.createBackground({
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

    const naturalRecord = await backgrounds.createBackground({
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

    const characterRecord = await backgrounds.createBackground({
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

// ── GET /api/backgrounds/_genmodels ───────────────────────────────────────────
// Admin/host: discover which Gemini models the key can use (to find the right
// image-generation model id). Debug aid; safe (returns model names only).

router.get('/_genmodels', adminAuth, async (_req, res, next) => {
  try {
    if (!gemini.isConfigured()) {
      return res.status(503).json({ error: 'AI image generation is not configured.' });
    }
    const models = await gemini.listModels();
    const imageModels = models.filter(
      (m) => /image/i.test(m.name) || (m.methods || []).some((x) => /image/i.test(x))
    );
    return res.json({ activeModel: process.env.GEMINI_IMAGE_MODEL || null, imageModels, allCount: models.length, all: models.map((m) => m.name) });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message, detail: err.detail });
  }
});

// ── POST /api/backgrounds/generate ────────────────────────────────────────────
// Admin/host: generate themed artwork with Gemini and store it as a template.
// JSON body: { prompt, category, mode ('natural'|'character'), name?, faceSlot? }
// Character mode requires a faceSlot; the backend punches a transparent hole
// there so the guest's face shows through. NOT the guest capture path.

router.post('/generate', adminAuth, async (req, res, next) => {
  try {
    if (!gemini.isConfigured()) {
      return res.status(503).json({ error: 'AI image generation is not configured.' });
    }
    const prompt = (req.body.prompt || '').toString().trim();
    if (!prompt) return res.status(400).json({ error: 'A "prompt" is required.' });

    const category = backgrounds.normalizeCategory(req.body.category);
    const mode = backgrounds.normalizeMode(req.body.mode);
    const name = (req.body.name || '').toString().trim() || category;

    let faceSlot = null;
    if (mode === 'character') {
      faceSlot = backgrounds.normalizeFaceSlot(req.body.faceSlot);
      if (!faceSlot) {
        return res.status(400).json({ error: 'Character mode requires a valid "faceSlot" JSON: {x,y,width,height,shape}.' });
      }
    }

    // 1. Generate the raw artwork via Gemini.
    let raw;
    try {
      raw = await gemini.generateImage(prompt);
    } catch (genErr) {
      return res.status(genErr.status || 502).json({ error: genErr.message, detail: genErr.detail });
    }

    // 2. Normalize to the 1200×1800 template canvas.
    let artwork = await sharp(raw).resize(1200, 1800, { fit: 'cover', position: 'centre' }).png().toBuffer();

    // 3. Character mode → punch the transparent face hole at the slot.
    if (mode === 'character' && faceSlot) {
      artwork = await gemini.punchFaceHole(artwork, faceSlot, 1200, 1800);
    }

    // 4. Upload to R2 (full + thumbnail).
    const baseId = uuidv4().slice(0, 8);
    const key = `flash-it/backgrounds/${category}/gen-${baseId}.png`;
    const thumbKey = `flash-it/backgrounds/${category}/thumb_gen-${baseId}.png`;
    const thumb = await sharp(artwork).resize(400, null, { withoutEnlargement: true }).png().toBuffer();
    const url = await storage.uploadBuffer(artwork, key, 'image/png');
    const thumbnailUrl = await storage.uploadBuffer(thumb, thumbKey, 'image/png');

    // 5. Persist the catalogue record.
    const record = await backgrounds.createBackground({
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
      prompt,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/backgrounds/:id ───────────────────────────────────────────────
// Admin-only. Removes a template from the global catalogue.

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const removed = await backgrounds.deleteBackground(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Background not found.' });
    return res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
