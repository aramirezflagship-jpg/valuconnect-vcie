'use strict';

/**
 * Solo / self-serve plan catalogue (single source of truth).
 *
 * Code DEFAULTS are always valid. Admin price/limit edits are stored as
 * overrides in a `plans` table (migration 0005) and merged on top — so editing
 * a price in the admin Products tab changes what Stripe actually charges.
 * Overrides are cached in memory (refreshed on boot + after each edit) so the
 * checkout path stays synchronous and fast.
 *
 * Used by routes/payments.js (checkout + limits) and routes/admin.js (Products).
 */

const supabase = require('./supabase');

const DEFAULTS = {
  starter:     { price: 39,  max_guests: 30,   sms_credits_limit: 30,  themes: ['galaxy'],                      expires_days: 7,   label: 'Starter' },
  party:       { price: 79,  max_guests: 100,  sms_credits_limit: 100, themes: ['galaxy', 'jungle', 'sunset'], expires_days: 30,  label: 'Party' },
  celebration: { price: 149, max_guests: null, sms_credits_limit: 200, themes: null,                           expires_days: 90,  label: 'Celebration' },
  brand:       { price: 299, max_guests: null, sms_credits_limit: 500, themes: null,                           expires_days: 365, label: 'Brand' },
};

// Fields the admin may override (themes/structure stay code-controlled).
const EDITABLE = ['price', 'max_guests', 'sms_credits_limit', 'expires_days', 'label'];

let _overrides = {}; // { [key]: { price?, max_guests?, ... } }

const isValidPlan = (key) => Object.prototype.hasOwnProperty.call(DEFAULTS, key);
const planKeys = () => Object.keys(DEFAULTS);
const overridesEnabled = () => !!supabase;

/** Merged plan (code defaults + admin overrides), or null for unknown keys. */
function getPlan(key) {
  if (!isValidPlan(key)) return null;
  return { ...DEFAULTS[key], ...(_overrides[key] || {}) };
}

function getAllPlans() {
  const out = {};
  for (const k of planKeys()) out[k] = getPlan(k);
  return out;
}

/** Load overrides from the `plans` table into the in-memory cache (best-effort). */
async function refreshOverrides() {
  if (!supabase) return _overrides;
  try {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) return _overrides; // table missing (0005 not applied) → code defaults
    const next = {};
    for (const row of data || []) {
      if (!isValidPlan(row.key)) continue;
      const o = {};
      for (const f of EDITABLE) if (row[f] !== null && row[f] !== undefined) o[f] = row[f];
      next[row.key] = o;
    }
    _overrides = next;
  } catch {
    /* ignore — keep current cache */
  }
  return _overrides;
}

/** Persist an override for a plan (upsert) and refresh the cache. */
async function setOverride(key, patch) {
  if (!isValidPlan(key)) throw Object.assign(new Error('Unknown plan.'), { status: 404 });
  if (!supabase) throw Object.assign(new Error('Editing needs the plans table — apply migration 0005_plans.sql.'), { status: 409 });

  const row = { key };
  for (const f of EDITABLE) {
    if (patch[f] === undefined) continue;
    if (f === 'label') row[f] = String(patch[f]).slice(0, 60);
    else if (patch[f] === null) row[f] = null;
    else { const n = Number(patch[f]); if (Number.isFinite(n) && n >= 0) row[f] = Math.round(n); }
  }

  const { error } = await supabase.from('plans').upsert(row, { onConflict: 'key' });
  if (error) {
    if (/does not exist|schema cache|relation|could not find/i.test(error.message)) {
      throw Object.assign(new Error('Editing needs the plans table — apply migration 0005_plans.sql.'), { status: 409 });
    }
    throw Object.assign(new Error(error.message), { status: 500 });
  }
  await refreshOverrides();
  return getPlan(key);
}

module.exports = { DEFAULTS, EDITABLE, isValidPlan, planKeys, overridesEnabled, getPlan, getAllPlans, refreshOverrides, setOverride };
