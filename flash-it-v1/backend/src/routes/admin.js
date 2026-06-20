'use strict';

const express = require('express');
const crypto = require('crypto');
const localAuth = require('../services/localAuth');
const { adminAuth } = require('../middleware/auth');
// Use the db abstraction so admin views work in BOTH stores (jsonStore when
// SUPABASE_* is unset, Supabase when configured) with identical record shapes.
const {
  listEvents,
  getEventPhotos,
  updatePhotoPrintStatus,
  listServiceRequests,
  updateServiceRequestStatus,
  getAdminMetrics,
  getAdminCustomers,
} = require('../services/db');

const router = express.Router();

// All admin routes require a valid X-Admin-Secret header
router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Aggregate stats across all events: photo counts, estimated API costs.
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const events = await listEvents();

    let totalPhotos = 0;
    const eventStats = await Promise.all(
      events.map(async (event) => {
        const photos = await getEventPhotos(event.id);
        totalPhotos += photos.length;
        return {
          eventId: event.id,
          eventName: event.name,
          photoCount: photos.length,
          // Rough cost estimates based on public API pricing (USD)
          estimatedCost: _estimateCost(photos.length),
        };
      })
    );

    return res.json({
      totalEvents: events.length,
      totalPhotos,
      estimatedTotalCost: _estimateCost(totalPhotos),
      events: eventStats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/events
 * List all events including their PIN (admin view).
 */
router.get('/events', async (_req, res, next) => {
  try {
    const events = await listEvents();
    return res.json({ events, count: events.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/print-queue
 * Returns all photos with printStatus === 'pending' across all events.
 * Phase 2: a printing integration will poll this endpoint.
 */
router.get('/print-queue', async (_req, res, next) => {
  try {
    const events = await listEvents();

    const pending = [];
    await Promise.all(
      events.map(async (event) => {
        const photos = await getEventPhotos(event.id);
        for (const photo of photos) {
          if (photo.printStatus === 'pending') {
            pending.push({
              ...photo,
              eventName: event.name,
            });
          }
        }
      })
    );

    // Sort oldest-first so the printer works through them in order
    pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.json({ queue: pending, count: pending.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/print-queue/:jobId
 * Mark a print job as printed (or set any printStatus value).
 *
 * Body: { printStatus: 'printed' | 'failed' | 'pending' }
 */
router.patch('/print-queue/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { printStatus } = req.body;

    const validStatuses = ['pending', 'printed', 'failed'];
    if (!printStatus || !validStatuses.includes(printStatus)) {
      return res.status(400).json({
        error: `printStatus must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find the photo and update it (db abstraction: jsonStore or Supabase).
    const updated = await updatePhotoPrintStatus(jobId, printStatus);

    if (!updated) {
      return res.status(404).json({ error: `Print job "${jobId}" not found.` });
    }

    return res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});

// ── Service requests (Full Service leads) ─────────────────────────────────────

/**
 * GET /api/admin/service-requests
 * List all Full Service leads, newest first.
 */
router.get('/service-requests', async (_req, res, next) => {
  try {
    const requests = await listServiceRequests();
    return res.json({ requests, count: requests.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/service-requests/:id
 * Update a lead's status. Body: { status: 'new'|'contacted'|'won'|'lost' }.
 */
router.patch('/service-requests/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const valid = ['new', 'contacted', 'won', 'lost'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }

    const updated = await updateServiceRequestStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: `Service request "${req.params.id}" not found.` });
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Dashboard aggregates ──────────────────────────────────────────────────────

/**
 * GET /api/admin/metrics
 * Aggregate counts + breakdowns + 30-day timeseries for the dashboard charts.
 */
router.get('/metrics', async (_req, res, next) => {
  try {
    const metrics = await getAdminMetrics();
    return res.json(metrics);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers
 * Enriched account rows for the admin contact table (sorted by createdAt desc).
 */
router.get('/customers', async (_req, res, next) => {
  try {
    const customers = await getAdminCustomers();
    return res.json({ customers, count: customers.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/launch-status
 * Auto-detected launch-readiness (config + data) for the admin Launch panel.
 */
router.get('/launch-status', async (_req, res, next) => {
  try {
    const { getLaunchStatus } = require('../services/launchStatus');
    return res.json(await getLaunchStatus());
  } catch (err) {
    next(err);
  }
});

// ── Customer account management (admin) ───────────────────────────────────────
const _safeUser = (u) => (u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null);

/**
 * POST /api/admin/customers
 * Create a customer account. Body: { email, name?, password?, role? }. When no
 * password is given a temporary one is generated and returned for the admin to
 * share (the customer can change it via Forgot password).
 */
router.post('/customers', async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required.' });
    const normalized = String(email).toLowerCase().trim();
    const existing = await localAuth.getUserByEmail(normalized);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const provided = password && String(password).length >= 6;
    const pw = provided ? password : crypto.randomBytes(9).toString('base64url');
    const user = await localAuth.createUser(normalized, pw, name || normalized.split('@')[0], role === 'admin' ? 'admin' : 'customer');
    return res.status(201).json({ user: _safeUser(user), tempPassword: provided ? undefined : pw });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/customers/:id
 * Update a customer's name and/or role. Body: { name?, role? }.
 */
router.patch('/customers/:id', async (req, res, next) => {
  try {
    const { name, role } = req.body || {};
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (role !== undefined) fields.role = role === 'admin' ? 'admin' : 'customer';
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update (send name and/or role).' });

    const updated = await localAuth.updateUser(req.params.id, fields);
    if (!updated) return res.status(404).json({ error: 'Customer not found.' });
    return res.json({ user: _safeUser(updated) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/customers/:id/reset-password
 * Set a customer's password. Body: { password? } — if omitted, a temporary
 * password is generated and returned so the admin can share it.
 */
router.post('/customers/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const provided = password && String(password).length >= 6;
    const pw = provided ? password : crypto.randomBytes(9).toString('base64url');
    const updated = await localAuth.updateUserPassword(req.params.id, pw);
    if (!updated) return res.status(404).json({ error: 'Customer not found.' });
    return res.json({ success: true, tempPassword: provided ? undefined : pw });
  } catch (err) {
    next(err);
  }
});

/**
 * Estimate processing cost in USD for N photos.
 * Based on approximate public pricing as of mid-2024:
 *   - Remove.bg:  $0.10 / image (HD)
 *   - fal.ai FLUX: ~$0.005 / image (28 steps)
 *   - Cloudinary:  free tier covers most usage
 *   - Twilio SMS:  ~$0.0079 / message (US)
 * @private
 */
function _estimateCost(photoCount) {
  const removebg = photoCount * 0.1;
  const fal = photoCount * 0.005;
  const twilio = photoCount * 0.008;
  const total = removebg + fal + twilio;
  return {
    removebg: +removebg.toFixed(4),
    falAi: +fal.toFixed(4),
    twilio: +twilio.toFixed(4),
    total: +total.toFixed(4),
    currency: 'USD',
  };
}

module.exports = router;
