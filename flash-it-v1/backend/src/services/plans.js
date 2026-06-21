'use strict';

/**
 * Solo / self-serve plan catalogue (single source of truth).
 *
 * Used by routes/payments.js (Stripe checkout + plan limits) and surfaced
 * read-only in the admin Products tab. Editing prices/limits from the admin UI
 * will persist overrides once a `plans` table exists (future migration); until
 * then these code values are authoritative.
 */
const PLANS = {
  starter: {
    price: 39,
    max_guests: 30,
    sms_credits_limit: 30,
    themes: ['galaxy'],
    expires_days: 7,
    label: 'Starter',
  },
  party: {
    price: 79,
    max_guests: 100,
    sms_credits_limit: 100,
    themes: ['galaxy', 'jungle', 'sunset'],
    expires_days: 30,
    label: 'Party',
  },
  celebration: {
    price: 149,
    max_guests: null,
    sms_credits_limit: 200,
    themes: null, // all themes
    expires_days: 90,
    label: 'Celebration',
  },
  brand: {
    price: 299,
    max_guests: null,
    sms_credits_limit: 500,
    themes: null, // all themes
    expires_days: 365,
    label: 'Brand',
  },
};

module.exports = { PLANS };
