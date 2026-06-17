'use strict';

/**
 * Themed-background store.
 *
 * Replaces the old AI background-removal + generation flow: guests now pick
 * from pre-made themed background images that the owner uploads per occasion
 * category (wedding, quinceanera, corporate, ...).  The guest photo is later
 * composited into a template slot ON TOP of the chosen background — no cutout,
 * no fal.ai, no remove.bg.
 *
 * Records are persisted in a small JSON file store (same pattern as
 * services/events.js).  NOTE: on Render the filesystem is ephemeral, so these
 * records reset on every redeploy.  We store the R2 object key alongside each
 * record so a future migration (Supabase) can make them durable, and so they
 * could be re-listed straight from R2 if needed.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORE_PATH = path.resolve(
  process.env.BACKGROUNDS_STORE_PATH ||
  path.join(__dirname, '../../../config/backgrounds.json')
);

/** Canonical, extensible list of occasion categories. */
const CATEGORIES = ['wedding', 'quinceanera', 'corporate', 'birthday', 'holiday', 'fiesta'];

/** Capture modes a template/background can support. */
const MODES = ['natural', 'character'];

/**
 * Normalise a mode string. Anything other than "character" resolves to
 * "natural" (the safe default — real photo + frame + message).
 * @param {string} mode
 * @returns {'natural'|'character'}
 */
function normalizeMode(mode) {
  return String(mode || '').toLowerCase().trim() === 'character' ? 'character' : 'natural';
}

/**
 * Normalise a faceSlot definition (character mode). Accepts an object or a JSON
 * string. Returns a clean { x, y, width, height, shape } object, or null when
 * not parseable. Coordinates are absolute pixels on the artwork canvas, with
 * the origin at the TOP-LEFT corner. shape is "oval" or "rect".
 * @param {object|string} raw
 * @returns {{x:number,y:number,width:number,height:number,shape:string}|null}
 */
function normalizeFaceSlot(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof obj !== 'object' || obj === null) return null;

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const x = num(obj.x);
  const y = num(obj.y);
  const width = num(obj.width);
  const height = num(obj.height);
  if (x === null || y === null || width === null || height === null) return null;
  if (width <= 0 || height <= 0) return null;

  const shape = String(obj.shape || 'oval').toLowerCase() === 'rect' ? 'rect' : 'oval';
  return { x, y, width, height, shape };
}

let _cache = null;

function _load() {
  if (_cache) return _cache;

  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(STORE_PATH)) {
      _cache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } else {
      _cache = { backgrounds: {} };
      _flush();
    }
  } catch (err) {
    console.error('[backgrounds-store] Failed to load store:', err.message);
    _cache = { backgrounds: {} };
  }

  return _cache;
}

function _flush() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(_cache, null, 2), 'utf8');
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.error('[backgrounds-store] Failed to flush store:', err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Normalise a category string. Returns a lowercase slug; falls back to 'fiesta'
 * when empty. Categories are extensible — anything is accepted, but only the
 * canonical set is advertised via listCategories().
 * @param {string} category
 * @returns {string}
 */
function normalizeCategory(category) {
  const slug = String(category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'fiesta';
}

/** @returns {string[]} canonical categories */
function listCategories() {
  return [...CATEGORIES];
}

/**
 * Create a background record.
 * @param {object} data
 * @param {string} data.category
 * @param {string} data.name
 * @param {string} data.url          - public R2 URL of the full image
 * @param {string} [data.thumbnailUrl]
 * @param {string} [data.r2Key]      - R2 object key (for durability / re-listing)
 * @param {string} [data.accountId]  - host who uploaded it (null for admin)
 * @returns {object} created record
 */
function createBackground(data) {
  const store = _load();
  const id = data.id || uuidv4();
  const record = {
    id,
    category: normalizeCategory(data.category),
    // mode: "natural" (real photo + frame/overlay + message) or
    //       "character" (face-in-the-hole: artwork on top, face shows through).
    mode: normalizeMode(data.mode),
    name: (data.name || 'Background').toString().trim(),
    // url/thumbnailUrl are the asset:
    //   natural   → the (optional) transparent-PNG frame/overlay; may be null.
    //   character → the character+scene artwork PNG (transparent face hole).
    url: data.url || null,
    thumbnailUrl: data.thumbnailUrl || data.url || null,
    // character-only: where the guest face is dropped in (absolute px on artwork).
    faceSlot: normalizeFaceSlot(data.faceSlot),
    r2Key: data.r2Key || null,
    accountId: data.accountId || null,
    createdAt: new Date().toISOString(),
  };
  store.backgrounds[id] = record;
  _flush();
  return record;
}

/**
 * List backgrounds, optionally filtered by category.
 * @param {string} [category]
 * @returns {object[]}
 */
function listBackgrounds(category, mode) {
  const store = _load();
  let all = Object.values(store.backgrounds);
  if (category) {
    const cat = normalizeCategory(category);
    all = all.filter((b) => b.category === cat);
  }
  if (mode) {
    const m = normalizeMode(mode);
    all = all.filter((b) => normalizeMode(b.mode) === m);
  }
  return all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

/**
 * Retrieve a single background by id.
 * @param {string} id
 * @returns {object|null}
 */
function getBackground(id) {
  if (!id) return null;
  const store = _load();
  return store.backgrounds[id] || null;
}

module.exports = {
  CATEGORIES,
  MODES,
  normalizeCategory,
  normalizeMode,
  normalizeFaceSlot,
  listCategories,
  createBackground,
  listBackgrounds,
  getBackground,
};
