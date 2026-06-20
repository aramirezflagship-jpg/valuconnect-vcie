'use strict';

/**
 * Launch-readiness status — the auto-updating "what's missing" list.
 *
 * Inspects live configuration (env vars) and data (Supabase tables/counts) so
 * the admin Launch panel reflects the REAL current state every time it loads —
 * no manual checklist maintenance. Items that can't be auto-detected (A2P
 * registration, attorney review, the iPad dry-run) are returned with
 * `done: null` as manual reminders.
 */

const supabase = require('./supabase');

const envSet = (...names) => names.every((n) => !!process.env[n]);

/** True if a Supabase table exists and is queryable (→ its migration ran). */
async function tableReachable(table) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).select('id', { count: 'exact', head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Row count for a table (optionally filtered), or null if unavailable. */
async function rowCount(table, filter) {
  if (!supabase) return null;
  try {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    const { count, error } = await q;
    return error ? null : count || 0;
  } catch {
    return null;
  }
}

async function getLaunchStatus() {
  const config = {
    jwtSecret: !!process.env.JWT_SECRET,
    supabase: envSet('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
    storageR2: envSet('R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'),
    emailConfigured: !!process.env.SENDGRID_API_KEY,
    emailSender: !!process.env.SENDGRID_FROM_EMAIL,
    smsConfigured: envSet('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'),
    paymentsConfigured: !!process.env.STRIPE_SECRET_KEY,
    paymentsWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    sentry: !!process.env.SENTRY_DSN,
    geminiAI: !!process.env.GEMINI_API_KEY,
  };

  const mig0003 = await tableReachable('service_requests');
  const mig0004 = await tableReachable('message_templates');
  const backgroundsCount = await rowCount('backgrounds');
  const naturalFrames = await rowCount('backgrounds', { col: 'mode', val: 'natural' });
  const characterTemplates = await rowCount('backgrounds', { col: 'mode', val: 'character' });
  const messageTemplatesCount = mig0004 ? await rowCount('message_templates') : 0;
  const eventsCount = await rowCount('events');

  const data = { mig0003, mig0004, backgroundsCount, naturalFrames, characterTemplates, messageTemplatesCount, eventsCount };

  // done: true|false auto-detected; done: null = manual confirm (can't detect).
  const items = [
    { key: 'jwt', group: 'Config', blocker: true, done: config.jwtSecret, label: 'JWT_SECRET set in Render' },
    { key: 'supabase', group: 'Config', blocker: true, done: config.supabase, label: 'Supabase connected' },
    { key: 'storage', group: 'Config', blocker: true, done: config.storageR2, label: 'Photo storage (Cloudflare R2) configured' },
    { key: 'mig0003', group: 'Config', blocker: true, done: mig0003, label: 'Migration 0003 applied (admin dashboard)' },
    { key: 'mig0004', group: 'Config', blocker: false, done: mig0004, label: 'Migration 0004 applied (message templates)' },

    { key: 'email', group: 'Delivery', blocker: true, done: config.emailConfigured && config.emailSender, label: 'Email: SendGrid key + verified sender' },
    { key: 'sms', group: 'Delivery', blocker: false, done: config.smsConfigured, label: 'SMS: Twilio configured (after A2P 10DLC)' },

    { key: 'payments', group: 'Billing', blocker: false, done: config.paymentsConfigured && config.paymentsWebhook, label: 'Stripe: secret key + webhook secret' },

    { key: 'backgrounds', group: 'Content', blocker: true, done: (backgroundsCount || 0) > 0, label: 'Backgrounds in the catalogue', note: `${backgroundsCount ?? '—'} total · ${naturalFrames ?? '—'} natural · ${characterTemplates ?? '—'} character` },
    { key: 'character', group: 'Content', blocker: false, done: (characterTemplates || 0) > 0, label: 'At least one Character template uploaded' },
    { key: 'templates', group: 'Content', blocker: false, done: (messageTemplatesCount || 0) > 0, label: 'Customer message templates seeded', note: mig0004 ? `${messageTemplatesCount} saved` : 'needs 0004' },

    { key: 'sentry', group: 'Ops', blocker: false, done: config.sentry, label: 'Error monitoring (Sentry) enabled' },

    // Manual / external — cannot be auto-detected.
    { key: 'a2p', group: 'External (you confirm)', blocker: true, done: null, label: 'A2P 10DLC registration submitted', note: '1–3 weeks — start ASAP' },
    { key: 'legal', group: 'External (you confirm)', blocker: true, done: null, label: 'Legal placeholders filled + attorney review' },
    { key: 'refund', group: 'External (you confirm)', blocker: false, done: null, label: 'Refund policy reviewed/published' },
    { key: 'dryrun', group: 'External (you confirm)', blocker: true, done: null, label: 'iPad end-to-end dry-run passed' },
  ];

  const auto = items.filter((i) => i.done !== null);
  const summary = {
    autoTotal: auto.length,
    autoDone: auto.filter((i) => i.done).length,
    blockersOpen: items.filter((i) => i.blocker && i.done === false).length, // false only (null = manual)
    manualOpen: items.filter((i) => i.done === null).length,
  };

  return { generatedAt: new Date().toISOString(), config, data, items, summary };
}

module.exports = { getLaunchStatus };
