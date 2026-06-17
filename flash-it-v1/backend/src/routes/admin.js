'use strict';

const express = require('express');
const { adminAuth } = require('../middleware/auth');
// Use the db abstraction so admin views work in BOTH stores (jsonStore when
// SUPABASE_* is unset, Supabase when configured) with identical record shapes.
const { listEvents, getEventPhotos, updatePhotoPrintStatus } = require('../services/db');

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
