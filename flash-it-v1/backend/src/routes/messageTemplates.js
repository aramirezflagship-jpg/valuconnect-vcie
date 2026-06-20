'use strict';

/**
 * Admin-managed customer message templates (self-contained CRM — no Monday.com).
 * All routes require X-Admin-Secret (adminAuth). Mounted at
 * /api/admin/message-templates.
 *
 *   GET    /                 list (built-in defaults + DB overrides/customs)
 *   GET    /:id              one
 *   POST   /                 create custom template
 *   PATCH  /:id              update (editing a default promotes it to an override)
 *   DELETE /:id              delete a custom template
 *   POST   /:id/preview      { lang?, contact? } → merged subject/html or text
 *   POST   /:id/send         { to, lang?, contact?, extra? } → actually send it
 */

const express = require('express');
const { adminAuth } = require('../middleware/auth');
const mt = require('../services/messageTemplates');
const { sendEmail } = require('../services/email');
const { sendText } = require('../services/delivery');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (_req, res, next) => {
  try {
    const templates = await mt.listTemplates();
    res.json({ templates, count: templates.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tpl = await mt.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });
    res.json(tpl);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'name is required.' });
    if (b.channel && !mt.CHANNELS.includes(b.channel)) return res.status(400).json({ error: `channel must be one of: ${mt.CHANNELS.join(', ')}` });
    const tpl = await mt.createTemplate(b);
    res.status(201).json(tpl);
  } catch (err) {
    if (/Supabase/.test(err.message)) return res.status(409).json({ error: err.message });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.channel && !mt.CHANNELS.includes(b.channel)) return res.status(400).json({ error: `channel must be one of: ${mt.CHANNELS.join(', ')}` });
    const tpl = await mt.updateTemplate(req.params.id, b);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });
    res.json(tpl);
  } catch (err) {
    if (/Supabase/.test(err.message)) return res.status(409).json({ error: err.message });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await mt.deleteTemplate(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Template not found.' });
    res.json({ success: true });
  } catch (err) {
    if (/cannot be deleted/.test(err.message)) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/** Preview the merged message without sending. */
router.post('/:id/preview', async (req, res, next) => {
  try {
    const tpl = await mt.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });
    const { lang = 'en', contact = {}, extra = {} } = req.body || {};
    const context = mt.contextFor(contact, extra);
    const out = mt.render(tpl, { lang, context });
    res.json({ ...out, lang });
  } catch (err) { next(err); }
});

/**
 * Send the template to a recipient. Outward-facing — the admin's authenticated
 * request IS the authorization. Gated on SendGrid/Twilio config; returns the
 * provider result so the UI can show success/skip.
 */
router.post('/:id/send', async (req, res, next) => {
  try {
    const tpl = await mt.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });

    const { to, lang = 'en', contact = {}, extra = {} } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Recipient "to" is required (email address or phone).' });

    const context = mt.contextFor(contact, extra);
    const out = mt.render(tpl, { lang, context });

    let result;
    if (out.channel === 'sms') {
      result = await sendText(to, out.text);
    } else {
      result = await sendEmail({ to, subject: out.subject, html: out.html });
    }

    const ok = !!(result && (result.sent || result.success));
    const notConfigured = !!(result && result.skipped);
    const provider = out.channel === 'sms' ? 'Twilio (SMS)' : 'SendGrid (email)';
    // 200 for sent OR "not configured yet" (an expected, non-error state the UI
    // surfaces as a notice); 502 only for an actual provider failure.
    return res.status(ok || notConfigured ? 200 : 502).json({
      channel: out.channel,
      to,
      sent: ok,
      notConfigured,
      result,
      message: ok ? 'Sent.' : notConfigured ? `Not sent — ${provider} isn't configured yet.` : `Send failed via ${provider}.`,
    });
  } catch (err) { next(err); }
});

module.exports = router;
