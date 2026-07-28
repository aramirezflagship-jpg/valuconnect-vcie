require('dotenv').config();
const axios = require('axios');
const logger = require('./logger');

/**
 * ValuConnect CRM client — replaces monday-connector for prospect capture.
 *
 * Every prospect ValuConnect discovers or receives (crawler, intake form, brief
 * generator) belongs in OUR sales pipeline, not in a third-party board. This
 * posts to the leak engine's /api/sales/import, which dedupes on sourceUrl and
 * only overwrites fields the caller actually supplied.
 *
 * Monday.com is still used elsewhere in this repo for CLIENT DELIVERY (building
 * boards we sell to clients). That is a different thing and stays.
 */

function engineUrl() {
  return (process.env.LEAK_ENGINE_URL || '').replace(/\/+$/, '');
}
function engineToken() {
  return process.env.INTERNAL_API_TOKEN || '';
}

function isConfigured() {
  return Boolean(engineUrl() && engineToken());
}

/**
 * Turn any axios/network failure into something an operator can act on.
 * A refused connection arrives as an AggregateError whose .message is empty
 * (Node tries IPv4 and IPv6 and wraps both), so reading err.message alone
 * reports "" and hides the actual reason the CRM could not be reached.
 */
function describeError(err) {
  if (err.response) {
    const body = JSON.stringify(err.response.data || {}).slice(0, 200);
    return `HTTP ${err.response.status} ${body}`;
  }
  if (err.errors?.length) {
    const codes = [...new Set(err.errors.map(e => e.code || e.message).filter(Boolean))];
    return `${err.code || 'connection failed'}${codes.length ? ' — ' + codes.join(', ') : ''}`;
  }
  return err.message || err.code || String(err);
}

/**
 * Send one prospect to the CRM.
 * Returns { ok, id } on success, or { ok:false, reason } — callers decide what
 * to do with a failure rather than having an exception thrown at them.
 */
async function saveProspect(lead) {
  if (!lead?.businessName) return { ok: false, reason: 'businessName required' };

  if (!isConfigured()) {
    return { ok: false, reason: 'LEAK_ENGINE_URL / INTERNAL_API_TOKEN not set' };
  }

  try {
    const res = await axios.post(
      `${engineUrl()}/api/sales/import`,
      { lead },
      {
        headers: {
          Authorization: `Bearer ${engineToken()}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    const id = res.data?.ids?.[0] ?? null;
    logger.info(`[CRM] saved prospect: ${lead.businessName}${id ? ` (#${id})` : ''}`);
    return { ok: true, id, url: id ? `${engineUrl()}/crm/#prospect-${id}` : null };
  } catch (err) {
    logger.warn(`[CRM] save failed for ${lead.businessName}: ${describeError(err)}`);
    return { ok: false, reason: describeError(err) };
  }
}

/**
 * Map the intake form's customer object onto CRM prospect fields.
 * The engine understands lead-discovery's snake_case names natively, so the
 * crawler path needs no mapping at all - this is only for the intake form.
 */
function fromIntake(customer) {
  const challenges = Array.isArray(customer.challenges) ? customer.challenges : [];
  const goals = Array.isArray(customer.goals) ? customer.goals : [];
  const why = [customer.notes, goals.length ? `Goals: ${goals.join(', ')}` : '']
    .filter(Boolean).join(' — ');

  return {
    businessName: customer.businessName,
    ownerName: customer.ownerName || null,
    email: customer.email || null,
    phone: customer.phone || customer.whatsapp || null,
    industryId: customer.industryId || null,
    langPref: (customer.langPref || customer.lang) === 'es' ? 'es' : 'en',
    city: customer.city || null,
    country: customer.country || null,
    website: customer.website || null,
    source: 'intake form',
    challenge_signals: challenges,
    why_valuconnect: why || null
  };
}

module.exports = { saveProspect, fromIntake, isConfigured };
