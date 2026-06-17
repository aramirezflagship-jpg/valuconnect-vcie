'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../services/db');

const router = express.Router({ mergeParams: true }); // inherit :eventId from parent

// ── Stripe init ───────────────────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('[addons] STRIPE_SECRET_KEY not set — Stripe features disabled.');
}

// ── Add-on catalogue ──────────────────────────────────────────────────────────
const ADDONS = {
  sms_credits_50: {
    price_cents: 500, // $5
    label: '50 SMS Credits',
    sms_add: 50,
  },
  sms_credits_100: {
    price_cents: 900, // $9
    label: '100 SMS Credits',
    sms_add: 100,
  },
  custom_theme: {
    price_cents: 9900, // $99
    label: 'Custom Theme',
    sms_add: 0,
  },
  branded_overlay: {
    price_cents: 4900, // $49
    label: 'Branded Overlay',
    sms_add: 0,
  },
};

/**
 * POST /api/events/:eventId/add-on
 * Requires auth.
 * Body: { addon: 'sms_credits_50' | 'sms_credits_100' | 'custom_theme' | 'branded_overlay' }
 * Creates a Stripe Checkout session for the add-on purchase.
 * Returns: { url }
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment processing is not configured.' });
    }

    const { eventId } = req.params;
    const { addon } = req.body;

    if (!addon || !ADDONS[addon]) {
      return res.status(400).json({
        error: `Invalid addon. Must be one of: ${Object.keys(ADDONS).join(', ')}.`,
      });
    }

    const event = await db.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: `Event "${eventId}" not found.` });
    }

    const addonConfig = ADDONS[addon];
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',')[0].trim();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: addonConfig.price_cents,
            product_data: {
              name: `Flash-it Add-on: ${addonConfig.label}`,
              description: `Add-on for event: ${event.name || eventId}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard?addon_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard`,
      metadata: {
        type: 'addon',
        addon,
        eventId,
        accountId: req.userId,
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events/:eventId/add-on/apply
 * Stripe webhook handler for add-on payments (checkout.session.completed).
 * Raw body — must be mounted before express.json() in index.js.
 *
 * On success:
 * - sms add-ons: increments sms_credits_limit on the event
 * - other add-ons: sets a flag on the event (e.g. custom_theme: true)
 */
router.post(
  '/apply',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    if (!stripe) {
      console.warn('[addons/apply] Stripe not configured — ignoring webhook.');
      return res.sendStatus(200);
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_ADDON_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (err) {
      console.error('[addons/apply] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type !== 'checkout.session.completed') {
      return res.sendStatus(200);
    }

    try {
      const session = event.data.object;
      const { type, addon, eventId, accountId } = session.metadata || {};

      if (type !== 'addon' || !addon || !ADDONS[addon] || !eventId) {
        // Not an add-on session — ignore
        return res.sendStatus(200);
      }

      const addonConfig = ADDONS[addon];

      if (addonConfig.sms_add > 0) {
        // Increment sms_credits_limit
        const existing = await db.getEvent(eventId);
        if (existing) {
          const newLimit = (existing.sms_credits_limit || 0) + addonConfig.sms_add;
          await db.updateEvent(eventId, { sms_credits_limit: newLimit });
          console.log(`[addons/apply] +${addonConfig.sms_add} SMS credits applied to event ${eventId}`);
        }
      } else {
        // Set feature flag on the event
        await db.updateEvent(eventId, { [addon]: true });
        console.log(`[addons/apply] ${addon} flag set on event ${eventId}`);
      }

      // Save payment record if accountId present
      if (accountId) {
        await db.createPaymentRecord({
          account_id: accountId,
          stripe_session_id: session.id,
          amount_cents: session.amount_total,
          plan_tier: `addon_${addon}`,
          event_id: eventId,
          status: 'completed',
          customer_email: session.customer_details?.email || '',
          event_name: addon,
        });

        // Notify account
        await db.saveNotification(
          accountId,
          'addon_applied',
          'Add-on activated!',
          `${addonConfig.label} has been applied to your event.`
        );
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('[addons/apply] Handler error:', err);
      return res.sendStatus(200);
    }
  }
);

module.exports = router;
