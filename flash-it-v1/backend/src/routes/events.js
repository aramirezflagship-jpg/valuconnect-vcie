'use strict';

const express = require('express');
const multer = require('multer');
const { adminAuth, requireAuth, optionalAuth } = require('../middleware/auth');
const {
  getEvent,
  createEvent,
  updateEvent,
  getEventPhotos,
} = require('../services/db');
const jsonStore = require('../services/events'); // listEvents still from JSON store when not using Supabase
const analytics = require('../services/analytics');
const storage = require('../services/storage');

const router = express.Router();

// Multer for overlay file uploads (memory storage, PNG only)
const overlayUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'image/png') return cb(null, true);
    cb(Object.assign(new Error('Only PNG files are accepted for overlays.'), { status: 400 }));
  },
});

// ── Host self-serve: event creation + listing ─────────────────────────────────
// These MUST be declared before the generic GET /:eventId handler so the
// literal "mine" path is matched first.

/**
 * GET /api/events/mine  (host JWT)
 * List events owned by the logged-in host.
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    let events = [];
    if (process.env.SUPABASE_URL) {
      const supabase = require('../services/supabase');
      if (supabase) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('account_id', req.userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        events = data || [];
      }
    } else {
      events = await jsonStore.listEventsByAccount(req.userId);
    }
    return res.json({ events, count: events.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events/mine  (host JWT)  — alias of POST /api/events for hosts.
 * Stamps account_id = req.userId and is_demo = false.
 *
 * Body: { name, themeIds?/backgroundIds?, defaultBackgroundId?, date?, deliveryChannels? }
 * Returns the created event { id, code/event_code, ... }.
 */
router.post('/mine', requireAuth, async (req, res, next) => {
  return _createHostEvent(req, res, next);
});

async function _createHostEvent(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required.' });
    }

    const payload = {
      ...req.body,
      account_id: req.userId,
      is_demo: false,
      // Self-service product line: the host signs up and runs the booth.
      serviceType: 'solo',
      // Accept either backgroundIds or themeIds from the client.
      backgroundIds: req.body.backgroundIds || req.body.themeIds || [],
    };

    const event = await createEvent(payload, req.userId);
    // Expose a stable `code` alias for the frontend regardless of store shape.
    const code = event.event_code || event.eventCode || event.code || event.id;
    return res.status(201).json({ ...event, code });
  } catch (err) {
    next(err);
  }
}

// ── Public: gallery (host shares link to guests) ──────────────────────────────
// NOTE: this route is mounted at BOTH /api/gallery/:eventId (via the
// galleryRouter export) and /api/events/:eventId/gallery.  The more specific
// path pattern must come BEFORE the generic /:eventId handler.

/**
 * GET /api/events/:eventId/gallery  OR  GET /api/gallery/:eventId
 * Returns all photos captured at the event.
 */
router.get('/:eventId/gallery', async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const photos = await getEventPhotos(req.params.eventId);
    return res.json({
      eventId: req.params.eventId,
      eventName: event.name,
      photos,
      count: photos.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── Public: iPad kiosk reads this before a session ───────────────────────────

/**
 * GET /api/events/:eventId
 * Returns event config needed by the kiosk: name, logo, themes, delivery channels.
 * Guests read without auth; authenticated hosts see full config.
 */
router.get('/:eventId', optionalAuth, async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Strip sensitive fields before sending to the kiosk
    const { pin: _pin, ...publicFields } = event; // eslint-disable-line no-unused-vars

    // Attach virtual booth URL so the frontend can render/share the QR code
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',')[0].trim();
    publicFields.virtualBoothUrl = `${frontendUrl}/v/${publicFields.event_code || publicFields.eventCode || req.params.eventId}`;

    return res.json(publicFields);
  } catch (err) {
    next(err);
  }
});

// ── Admin: event management ───────────────────────────────────────────────────

/**
 * GET /api/events  (admin)
 * List all events.
 */
router.get('/', adminAuth, async (_req, res, next) => {
  try {
    // listEvents is only in the JSON file store; when Supabase is active we
    // query the events table directly via the admin supabase client.
    let events;
    if (process.env.SUPABASE_URL) {
      const supabase = require('../services/supabase');
      if (supabase) {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        events = data || [];
      } else {
        events = [];
      }
    } else {
      events = await jsonStore.listEvents();
    }
    return res.json({ events, count: events.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events
 * Create a new event. Accepts EITHER the admin secret header (admin create,
 * no owner stamp) OR a host JWT (self-serve create: stamps account_id +
 * is_demo=false). This stops logged-in hosts from getting a 401.
 *
 * Body: { name, date, venue, logoUrl, framePath, brandColor, themes,
 *         themeIds?/backgroundIds?, defaultBackgroundId?, deliveryChannels }
 */
router.post('/', async (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET || 'flash-it-admin-2026';

  // Admin path: x-admin-secret header (unchanged behaviour).
  if (req.headers['x-admin-secret']) {
    if (req.headers['x-admin-secret'] !== adminSecret) {
      return res.status(403).json({ error: 'Invalid admin secret.' });
    }
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Event name is required.' });
      }
      // Admin-created events are the managed (Full Service) product line by
      // default; allow an explicit serviceType in the body to override.
      const adminPayload = {
        ...req.body,
        serviceType: req.body.serviceType || req.body.service_type || 'managed',
      };
      const event = await createEvent(adminPayload, req.userId || null);
      return res.status(201).json(event);
    } catch (err) {
      return next(err);
    }
  }

  // Host path: require a valid JWT, then create as the host.
  return requireAuth(req, res, () => _createHostEvent(req, res, next));
});

/**
 * PATCH /api/events/:eventId  (admin)
 * Update an existing event (partial update).
 */
router.patch('/:eventId', adminAuth, async (req, res, next) => {
  try {
    const existing = await getEvent(req.params.eventId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const updated = await updateEvent(req.params.eventId, req.body);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Admin: analytics ──────────────────────────────────────────────────────────

/**
 * GET /api/events/:id/analytics  (admin)
 * Returns delivery analytics for the event.
 */
router.get('/:id/analytics', adminAuth, (req, res) => {
  const data = analytics.getEventAnalytics(req.params.id);
  return res.json(data);
});

// ── Admin: guest export ────────────────────────────────────────────────────────

/**
 * GET /api/events/:id/export  (admin)
 * Returns a CSV of guest emails and phone numbers collected for the event.
 */
router.get('/:id/export', adminAuth, (req, res) => {
  const data = analytics.getEventAnalytics(req.params.id);
  const emails = data.guestEmails || [];
  const phones = data.guestPhones || [];

  const maxRows = Math.max(emails.length, phones.length);
  let csv = 'email,phone\n';
  for (let i = 0; i < maxRows; i++) {
    csv += `${emails[i] || ''},${phones[i] || ''}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event-guests.csv"`);
  return res.send(csv);
});

// ── Admin: duplicate event ─────────────────────────────────────────────────────

/**
 * POST /api/events/:id/duplicate  (admin)
 * Creates a copy of the event with a new id and eventCode.
 */
router.post('/:id/duplicate', adminAuth, async (req, res, next) => {
  try {
    const original = await getEvent(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const { id: _id, pin: _pin, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = original;

    const copyData = {
      ...rest,
      name: rest.name,
      event_code: rest.event_code ? `COPY-${rest.event_code}` : undefined,
      eventCode: rest.eventCode ? `COPY-${rest.eventCode}` : undefined,
      status: 'active',
    };

    const newEvent = await createEvent(copyData, req.userId || null);
    return res.status(201).json(newEvent);
  } catch (err) {
    next(err);
  }
});

// ── Admin: overlay upload ──────────────────────────────────────────────────────

/**
 * POST /api/events/:id/overlay  (admin)
 * Accepts a PNG overlay file, uploads it to R2, and updates the event record.
 */
router.post('/:id/overlay', adminAuth, overlayUpload.single('overlay'), async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const existing = await getEvent(eventId);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No overlay file provided. Upload a PNG as the "overlay" field.' });
    }

    const key = `overlays/${eventId}.png`;
    const overlayUrl = await storage.uploadBuffer(req.file.buffer, key, 'image/png');

    const updated = await updateEvent(eventId, { overlayUrl });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
