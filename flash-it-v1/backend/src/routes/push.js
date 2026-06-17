'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../services/db');

const router = express.Router();

// ── web-push init ─────────────────────────────────────────────────────────────
let webpush = null;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush = require('web-push');
  webpush.setVapidDetails(
    'mailto:' + (process.env.SENDGRID_FROM_EMAIL || 'noreply@flash-it.app'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled.');
}

/**
 * POST /api/push/subscribe
 * Requires auth.
 * Body: { endpoint, keys: { p256dh, auth } }
 * Saves the push subscription for the logged-in account.
 */
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'endpoint and keys (p256dh, auth) are required.' });
    }

    await db.savePushSubscription(req.userId, { endpoint, keys });
    return res.status(201).json({ message: 'Push subscription saved.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Requires auth.
 * Body: { endpoint }
 * Removes the push subscription.
 */
router.delete('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required.' });
    }

    await db.deletePushSubscription(req.userId, endpoint);
    return res.json({ message: 'Push subscription removed.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/push/test
 * Requires auth.
 * Sends a test push notification to all subscriptions of the requesting user.
 */
router.post('/test', requireAuth, async (req, res, next) => {
  try {
    if (!webpush) {
      return res.status(503).json({ error: 'Push notifications are not configured (VAPID keys missing).' });
    }

    const subscriptions = await db.getPushSubscriptions(req.userId);
    if (!subscriptions.length) {
      return res.status(404).json({ error: 'No push subscriptions found for this account.' });
    }

    const payload = JSON.stringify({
      title: 'Flash-it test notification',
      body: 'Push notifications are working correctly!',
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return res.json({ message: `Test push sent.`, sent, failed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
