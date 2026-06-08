'use strict';

const express = require('express');
const { adminAuth } = require('../middleware/auth');
const {
  getEvent,
  createEvent,
  updateEvent,
  listEvents,
  getEventPhotos,
} = require('../services/events');

const router = express.Router();

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
 * No authentication required — the iPad only needs a valid eventId.
 */
router.get('/:eventId', async (req, res, next) => {
  try {
    const event = await getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Strip sensitive fields before sending to the kiosk
    const { pin: _pin, ...publicFields } = event; // eslint-disable-line no-unused-vars
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
    const events = await listEvents();
    return res.json({ events, count: events.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events  (admin)
 * Create a new event.
 *
 * Body: { name, date, venue, logoUrl, framePath, brandColor, themes, deliveryChannels }
 */
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required.' });
    }

    const event = await createEvent(req.body);
    return res.status(201).json(event);
  } catch (err) {
    next(err);
  }
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

module.exports = router;
