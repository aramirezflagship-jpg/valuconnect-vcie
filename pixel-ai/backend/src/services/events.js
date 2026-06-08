'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Path to the JSON file that persists all event data.
 * In production (Railway) the filesystem is ephemeral — a volume mount or
 * an external DB should be used. For MVP / local development this file-backed
 * store is sufficient and requires no external dependencies.
 */
const STORE_PATH = path.resolve(
  process.env.EVENTS_STORE_PATH ||
  path.join(__dirname, '../../../config/events.json')
);

// ── In-memory cache ───────────────────────────────────────────────────────────
// We keep a copy in memory and flush to disk on every write so reads are fast.
let _cache = null;

// ── Initialise ────────────────────────────────────────────────────────────────

/**
 * Load the store from disk into memory.
 * Ensures the config directory and file exist.
 * @returns {{ events: object, photos: object }}
 */
function _load() {
  if (_cache) return _cache;

  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      _cache = JSON.parse(raw);
    } else {
      _cache = { events: {}, photos: {} };
      _flush();
    }
  } catch (err) {
    console.error('[events-store] Failed to load store:', err.message);
    _cache = { events: {}, photos: {} };
  }

  return _cache;
}

/**
 * Persist the in-memory cache to disk atomically (write to tmp then rename).
 */
function _flush() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(_cache, null, 2), 'utf8');
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.error('[events-store] Failed to flush store:', err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieve a single event config by ID.
 * @param {string} eventId
 * @returns {object|null}
 */
async function getEvent(eventId) {
  const store = _load();
  return store.events[eventId] || null;
}

/**
 * List all events (array of event configs).
 * @returns {object[]}
 */
async function listEvents() {
  const store = _load();
  return Object.values(store.events);
}

/**
 * Create a new event.
 *
 * @param {object} data - Event fields
 * @param {string} data.name         - Display name (required)
 * @param {string} [data.date]       - ISO date string
 * @param {string} [data.venue]      - Venue name
 * @param {string} [data.logoUrl]    - URL to event logo PNG
 * @param {string} [data.framePath]  - URL or local path to frame overlay PNG
 * @param {string} [data.brandColor] - Hex brand colour, e.g. "#8b5cf6"
 * @param {Array}  [data.themes]     - Theme definitions
 * @param {Array}  [data.deliveryChannels] - e.g. ["sms", "whatsapp"]
 * @returns {object} The created event
 */
async function createEvent(data) {
  const store = _load();

  const id = _generateEventId(data.name);
  const pin = _generatePin();

  const event = {
    id,
    pin,
    name: data.name.trim(),
    date: data.date || null,
    venue: data.venue || null,
    logoUrl: data.logoUrl || null,
    framePath: data.framePath || null,
    brandColor: data.brandColor || '#8b5cf6',
    eventName: data.name.trim(),
    themes: data.themes || _defaultThemes(),
    deliveryChannels: data.deliveryChannels || ['sms'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.events[id] = event;
  store.photos[id] = [];
  _flush();

  return event;
}

/**
 * Update an existing event (partial update — only supplied fields are changed).
 * @param {string} eventId
 * @param {object} data
 * @returns {object} Updated event
 */
async function updateEvent(eventId, data) {
  const store = _load();

  if (!store.events[eventId]) {
    throw Object.assign(new Error(`Event "${eventId}" not found.`), { status: 404 });
  }

  // Merge supplied fields, protect immutable fields
  const immutable = ['id', 'pin', 'createdAt'];
  const updated = { ...store.events[eventId] };
  for (const [key, value] of Object.entries(data)) {
    if (!immutable.includes(key)) {
      updated[key] = value;
    }
  }
  updated.updatedAt = new Date().toISOString();

  store.events[eventId] = updated;
  _flush();

  return updated;
}

/**
 * Append a photo record to an event's photo log.
 * @param {string} eventId
 * @param {object} photoData - { id, photoUrl, thumbnailUrl, themeId, printStatus, ... }
 */
async function logPhoto(eventId, photoData) {
  const store = _load();

  if (!store.photos[eventId]) {
    store.photos[eventId] = [];
  }

  store.photos[eventId].push(photoData);
  _flush();
}

/**
 * Retrieve all photos logged for an event.
 * @param {string} eventId
 * @returns {object[]}
 */
async function getEventPhotos(eventId) {
  const store = _load();
  return store.photos[eventId] || [];
}

/**
 * Update the printStatus of a specific photo job across all events.
 * Returns the updated photo record, or null if not found.
 *
 * @param {string} jobId       - Photo record id (uuidv4)
 * @param {string} printStatus - 'pending' | 'printed' | 'failed'
 * @returns {object|null}
 */
async function updatePhotoPrintStatus(jobId, printStatus) {
  const store = _load();
  let found = null;

  for (const eventId of Object.keys(store.photos)) {
    const photos = store.photos[eventId];
    const idx = photos.findIndex((p) => p.id === jobId);
    if (idx !== -1) {
      photos[idx] = { ...photos[idx], printStatus, printedAt: new Date().toISOString() };
      found = photos[idx];
      break;
    }
  }

  if (found) _flush();
  return found;
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _generateEventId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const suffix = uuidv4().slice(0, 6);
  return `${slug}-${suffix}`;
}

function _generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Built-in theme catalogue used when an event is created without custom themes. */
function _defaultThemes() {
  return [
    {
      id: 'galaxy',
      name: 'Galaxy Dream',
      prompt: 'nebula galaxy space background, stars, cosmic purple and blue hues, ultra detailed',
      negativePrompt: 'people, text, watermark, blurry',
      style: 'photorealistic',
    },
    {
      id: 'tropical',
      name: 'Tropical Paradise',
      prompt: 'lush tropical beach at sunset, golden hour, palm trees, ocean horizon',
      negativePrompt: 'people, text, watermark',
      style: 'photorealistic',
    },
    {
      id: 'cyberpunk',
      name: 'Neon City',
      prompt: 'cyberpunk neon-lit city street at night, rain reflections, futuristic Tokyo, vibrant colours',
      negativePrompt: 'people, text, watermark',
      style: 'cinematic',
    },
    {
      id: 'enchanted',
      name: 'Enchanted Forest',
      prompt: 'magical glowing forest, bioluminescent plants, fairy lights, mystical fog, fantasy',
      negativePrompt: 'people, text, watermark',
      style: 'fantasy art',
    },
    {
      id: 'studio',
      name: 'Classic Studio',
      prompt: 'professional photography studio, seamless white backdrop, soft box lighting, clean minimal',
      negativePrompt: 'people, text, watermark, outdoor',
      style: 'photorealistic',
    },
  ];
}

module.exports = {
  getEvent,
  listEvents,
  createEvent,
  updateEvent,
  logPhoto,
  getEventPhotos,
  updatePhotoPrintStatus,
};
