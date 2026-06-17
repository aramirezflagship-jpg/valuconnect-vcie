'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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
  const { name, email, phone, eventType, estimatedGuests, eventDate, location, message } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required.' });
  }

  const request = {
    id: uuidv4(),
    status: 'new',
    name,
    email,
    phone: phone || null,
    eventType: eventType || null,
    estimatedGuests: estimatedGuests != null ? estimatedGuests : null,
    eventDate: eventDate || null,
    location: location || null,
    message: message || null,
    createdAt: new Date().toISOString(),
  };

  // Save to JSON store (non-fatal)
  try {
    const store = _load();
    store.requests.push(request);
    _flush(store);
  } catch (err) {
    console.warn('[contact] Failed to persist service request:', err.message);
  }

  // Send email notification (non-fatal)
  _sendNotificationEmail(request).catch((err) => {
    console.warn('[contact] Unexpected email error:', err.message);
  });

  return res.status(201).json({
    id: request.id,
    message: "Request received. We'll contact you within 24 hours.",
  });
});

module.exports = router;
