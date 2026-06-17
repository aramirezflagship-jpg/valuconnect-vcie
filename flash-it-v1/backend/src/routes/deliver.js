'use strict';
const express = require('express');
const router = express.Router();
const { sendPhotoEmail } = require('../services/email');
const analytics = require('../services/analytics');

// Twilio (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * POST /api/deliver
 * Body: { method, to, photoUrl, eventName, eventId, gifUrl? }
 * method: 'email' | 'sms' | 'qr'
 */
router.post('/', async (req, res, next) => {
  try {
    const { method, to, photoUrl, eventName, eventId, gifUrl } = req.body;
    if (!method || !photoUrl) return res.status(400).json({ error: 'method and photoUrl are required' });

    if (method === 'email') {
      if (!to || !to.includes('@')) return res.status(400).json({ error: 'Valid email required' });
      await sendPhotoEmail(to, photoUrl, eventName || 'your event', gifUrl);
      if (eventId) analytics.trackSession(eventId, 'email', to);
      return res.json({ success: true, method: 'email' });
    }

    if (method === 'sms') {
      if (!to) return res.status(400).json({ error: 'Phone number required' });
      if (!twilioClient) return res.status(503).json({ error: 'SMS not configured' });
      const mediaUrl = gifUrl || photoUrl;
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body: `Your photo from ${eventName || 'Flash-it'} 📸`,
        mediaUrl: [mediaUrl],
      });
      if (eventId) analytics.trackSession(eventId, 'sms', to);
      return res.json({ success: true, method: 'sms' });
    }

    if (method === 'qr') {
      if (eventId) analytics.trackSession(eventId, 'qr', null);
      return res.json({ success: true, method: 'qr', url: gifUrl || photoUrl });
    }

    return res.status(400).json({ error: 'Invalid method. Use: email, sms, qr' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
