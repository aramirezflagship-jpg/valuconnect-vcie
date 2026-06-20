'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');
const { sendEmail, sendLeadAutoReply } = require('../services/email');
const mt = require('../services/messageTemplates');

const router = express.Router();

const useSupabase = !!process.env.SUPABASE_URL;

// ── JSON store ────────────────────────────────────────────────────────────────

const STORE_PATH = path.resolve(
  process.env.SERVICE_REQUESTS_PATH ||
  path.join(__dirname, '../../../config/service-requests.json')
);

let _cache = null;

function _load() {
  if (_cache) return _cache;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(STORE_PATH)) {
      _cache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } else {
      _cache = { requests: [] };
      _flush(_cache);
    }
  } catch (err) {
    console.warn('[contact-store] Failed to load store:', err.message);
    _cache = { requests: [] };
  }
  return _cache;
}

function _flush(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.warn('[contact-store] Failed to flush store:', err.message);
  }
}

// ── Email notification ────────────────────────────────────────────────────────

async function _sendNotificationEmail(request) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[contact] SENDGRID_API_KEY not set — skipping email notification');
    return;
  }

  let sgMail;
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch {
    console.warn('[contact] @sendgrid/mail not available — skipping email notification');
    return;
  }

  const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@flash-it.app';
  const to = 'aramirez.flagship@gmail.com';

  const lines = [
    `<b>Name:</b> ${request.name}`,
    `<b>Email:</b> ${request.email}`,
    request.phone ? `<b>Phone:</b> ${request.phone}` : null,
    request.eventType ? `<b>Event Type:</b> ${request.eventType}` : null,
    request.estimatedGuests != null ? `<b>Estimated Guests:</b> ${request.estimatedGuests}` : null,
    request.eventDate ? `<b>Event Date:</b> ${request.eventDate}` : null,
    request.location ? `<b>Location:</b> ${request.location}` : null,
    request.message ? `<b>Message:</b> ${request.message}` : null,
  ].filter(Boolean).join('<br/>');

  const html = `
    <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1e293b;padding:2rem;">
      <h2>⚡ New Full Service Request — Flash-it</h2>
      <p><b>Request ID:</b> ${request.id}</p>
      <p><b>Submitted:</b> ${request.createdAt}</p>
      <hr/>
      <p>${lines}</p>
    </body></html>
  `;

  try {
    await sgMail.send({ to, from, subject: `New Full Service Request from ${request.name}`, html });
  } catch (err) {
    console.warn('[contact] Email send failed:', err.message);
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/contact
 * Accepts a Full Service Request form submission. No authentication required.
 */
router.post('/', async (req, res) => {
  const body = req.body || {};
  // The ServiceRequest form (frontend) sends `fullName` + `city`; older callers
  // sent `name` + `location`. Accept both so no submission silently loses data.
  const name = body.fullName || body.name;
  const email = body.email;
  const location = body.city || body.location || null;
  const { phone, eventType, estimatedGuests, eventDate, message, lang } = body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required.' });
  }

  // Coerce estimatedGuests ('100' from the number input) → integer or null.
  let guests = null;
  if (estimatedGuests != null && estimatedGuests !== '') {
    const n = parseInt(estimatedGuests, 10);
    guests = Number.isFinite(n) ? n : null;
  }

  const request = {
    id: uuidv4(),
    status: 'new',
    name,
    email,
    phone: phone || null,
    eventType: eventType || null,
    estimatedGuests: guests,
    eventDate: eventDate || null,
    location,
    message: message || null,
    lang: lang || null,
    createdAt: new Date().toISOString(),
  };

  // Persist (non-fatal): Supabase service_requests table when configured, else
  // the legacy JSON file store so the demo/local flow keeps working unchanged.
  if (useSupabase) {
    try {
      const saved = await db.createServiceRequest(request);
      if (saved && saved.id) request.id = saved.id; // surface the DB-generated id
    } catch (err) {
      console.error('[contact] Failed to persist service request to Supabase:', err.message);
      // Fall back to the JSON store so the lead isn't lost.
      _saveToJsonStore(request);
    }
  } else {
    _saveToJsonStore(request);
  }

  // Notify Andres internally (non-fatal)
  _sendNotificationEmail(request).catch((err) => {
    console.warn('[contact] Unexpected email error:', err.message);
  });

  // Auto-reply to the LEAD using the admin-editable 'lead-welcome' template, so
  // editing it in /admin changes this message. Falls back to the built-in copy
  // if the template can't be resolved (non-fatal, transactional).
  (async () => {
    try {
      const tpl = await mt.getByKey('lead-welcome');
      if (tpl) {
        const out = mt.render(tpl, { lang: request.lang || 'en', context: mt.contextFor(request) });
        await sendEmail({ to: request.email, subject: out.subject, html: out.html });
      } else {
        await sendLeadAutoReply(request);
      }
    } catch (err) {
      console.warn('[contact] Lead auto-reply failed:', err.message);
    }
  })();

  return res.status(201).json({
    id: request.id,
    message: "Request received. We'll contact you within 24 hours.",
  });
});

/** Append a request to the JSON file store (non-fatal). */
function _saveToJsonStore(request) {
  try {
    const store = _load();
    store.requests.push(request);
    _flush(store);
  } catch (err) {
    console.warn('[contact] Failed to persist service request:', err.message);
  }
}

module.exports = router;
