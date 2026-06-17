'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../services/db');

const router = express.Router();

/**
 * GET /api/notifications
 * Requires auth. Returns all notifications for the logged-in account (newest first).
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifications = await db.getNotifications(req.userId);
    return res.json({ notifications, count: notifications.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Requires auth. Marks a notification as read.
 * Scoped to the requesting user — cannot mark another user's notifications.
 */
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const updated = await db.markNotificationRead(req.params.id, req.userId);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
