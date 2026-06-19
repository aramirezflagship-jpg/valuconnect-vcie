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

const supabase = require('./supabase'); // service-role client (null when unconfigured)

// Use Supabase when the project is configured for it. Reads need the URL +
// (anon or service) key; writes go through the service-role client. We gate on
// the same signal db.js uses so both stores switch together.
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const STORE_PATH = path.resolve(
  process.env.BACKGROUNDS_STORE_PATH ||
  path.join(__dirname, '../../../config/backgrounds.json')
);

/** Canonical, extensible list of occasion categories. */
const CATEGORIES = ['wedding', 'quinceanera', 'birthday', 'kids-birthday', 'corporate', 'holiday', 'fiesta'];

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

// ── Supabase row mapping (snake_case column ↔ camelCase record) ───────────────
// The routes read records in the JSON store's camelCase shape (b.thumbnailUrl,
// b.faceSlot). Normalise Supabase rows back to that shape so both stores return
// identical records to callers.
function _rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    category: normalizeCategory(row.category),
    mode: normalizeMode(row.mode),
    name: row.name || 'Background',
    url: row.url || null,
    thumbnailUrl: row.thumbnail_url || row.url || null,
    faceSlot: normalizeFaceSlot(row.face_slot),
    r2Key: row.r2_key || null,
    accountId: row.account_id || null,
    createdAt: row.created_at || null,
  };
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
async function createBackground(data) {
  const id = data.id || uuidv4();
  const category = normalizeCategory(data.category);
  // mode: "natural" (real photo + frame/overlay + message) or
  //       "character" (face-in-the-hole: artwork on top, face shows through).
  const mode = normalizeMode(data.mode);
  const name = (data.name || 'Background').toString().trim();
  // url/thumbnailUrl are the asset:
  //   natural   → the (optional) transparent-PNG frame/overlay; may be null.
  //   character → the character+scene artwork PNG (transparent face hole).
  const url = data.url || null;
  const thumbnailUrl = data.thumbnailUrl || data.url || null;
  // character-only: where the guest face is dropped in (absolute px on artwork).
  const faceSlot = normalizeFaceSlot(data.faceSlot);
  const r2Key = data.r2Key || null;
  const accountId = data.accountId || null;

  if (useSupabase && supabase) {
    // UPSERT on id so this is idempotent AND backfills the seed rows that
    // 0002_seed.sql created with url/thumbnail_url = NULL (work item 5).
    // We only send columns we have values for so a re-seed never NULLs out a
    // field that was already populated by another caller (use COALESCE-like
    // behaviour by omitting undefined keys).
    const row = {
      id,
      category,
      mode,
      name,
      url,
      thumbnail_url: thumbnailUrl,
      face_slot: faceSlot, // jsonb column accepts the object directly
      r2_key: r2Key,
      account_id: accountId,
    };

    const { data: created, error } = await supabase
      .from('backgrounds')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[backgrounds] createBackground (supabase) error:', error.message);
      throw new Error(`Failed to create background: ${error.message}`);
    }
    return _rowToRecord(created);
  }

  // ── jsonStore fallback (unchanged behaviour) ──
  const store = _load();
  const record = {
    id,
    category,
    mode,
    name,
    url,
    thumbnailUrl,
    faceSlot,
    r2Key,
    accountId,
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
async function listBackgrounds(category, mode) {
  if (useSupabase && supabase) {
    let q = supabase.from('backgrounds').select('*');
    if (category) q = q.eq('category', normalizeCategory(category));
    if (mode) q = q.eq('mode', normalizeMode(mode));
    q = q.order('created_at', { ascending: false });

    const { data, error } = await q;
    if (error) {
      console.error('[backgrounds] listBackgrounds (supabase) error:', error.message);
      return [];
    }
    return (data || []).map(_rowToRecord);
  }

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
async function getBackground(id) {
  if (!id) return null;

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('backgrounds')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[backgrounds] getBackground (supabase) error:', error.message);
      return null;
    }
    return _rowToRecord(data);
  }

  const store = _load();
  return store.backgrounds[id] || null;
}

/**
 * Delete a background by id from the active store.
 * (The R2 object is left in place — storage has no delete helper — but it's an
 * unreferenced orphan, which is harmless.)
 * @param {string} id
 * @returns {boolean} true if a record was removed
 */
async function deleteBackground(id) {
  if (!id) return false;

  if (useSupabase && supabase) {
    const { error, count } = await supabase
      .from('backgrounds')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) {
      console.error('[backgrounds] deleteBackground (supabase) error:', error.message);
      throw new Error(`Failed to delete background: ${error.message}`);
    }
    return (count || 0) > 0;
  }

  const store = _load();
  if (!store.backgrounds[id]) return false;
  delete store.backgrounds[id];
  _flush();
  return true;
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
  deleteBackground,
};
