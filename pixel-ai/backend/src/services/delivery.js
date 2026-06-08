'use strict';

const twilio = require('twilio');

/**
 * Lazily create a Twilio client only when credentials are present.
 * Avoids throwing at startup when running locally without credentials.
 */
function _getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid.startsWith('AC_placeholder') || token === 'your_twilio_auth_token') {
    return null;
  }

  return twilio(sid, token);
}

/**
 * Send an SMS via Twilio with a link to the guest's photo.
 *
 * @param {string} phone    - Guest phone number (E.164 preferred, e.g. +12125551234)
 * @param {string} photoUrl - Public URL of the photo
 * @param {string} eventName
 * @returns {Promise<{ success: boolean, messageId: string|null, channel: 'sms' }>}
 */
async function sendSMS(phone, photoUrl, eventName) {
  const client = _getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !from) {
    console.warn('[delivery] Twilio not configured — SMS not sent');
    return { success: false, messageId: null, channel: 'sms', error: 'Twilio not configured' };
  }

  const to = _toE164(phone);
  const body = _smsBody(photoUrl, eventName);

  const message = await client.messages.create({ from, to, body });

  console.log(`[delivery] SMS sent to ${to} — SID: ${message.sid}`);
  return { success: true, messageId: message.sid, channel: 'sms' };
}

/**
 * Send a WhatsApp message via Twilio's WhatsApp API.
 *
 * @param {string} phone    - Guest phone number (E.164 preferred)
 * @param {string} photoUrl - Public URL of the photo
 * @param {string} eventName
 * @returns {Promise<{ success: boolean, messageId: string|null, channel: 'whatsapp' }>}
 */
async function sendWhatsApp(phone, photoUrl, eventName) {
  const client = _getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!client) {
    console.warn('[delivery] Twilio not configured — WhatsApp message not sent');
    return { success: false, messageId: null, channel: 'whatsapp', error: 'Twilio not configured' };
  }

  const to = `whatsapp:${_toE164(phone)}`;
  const body = _whatsappBody(photoUrl, eventName);

  const message = await client.messages.create({ from, to, body });

  console.log(`[delivery] WhatsApp sent to ${to} — SID: ${message.sid}`);
  return { success: true, messageId: message.sid, channel: 'whatsapp' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a phone number to E.164 format.
 * Strips all non-digit characters and prepends '+1' for 10-digit US numbers.
 * For numbers that already have a country code (>10 digits) it prepends '+'.
 */
function _toE164(phone) {
  const digits = phone.replace(/\D/g, '');

  // Already has a leading '+' — return as-is (caller may have passed '+1...')
  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }

  // 10-digit US/CA number
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11-digit with country code (e.g. 12125551234)
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // Fallback: prefix '+' and hope for the best
  return `+${digits}`;
}

function _smsBody(photoUrl, eventName) {
  const name = eventName ? `${eventName} ` : '';
  return `✨ Your ${name}photo is ready! Download it here: ${photoUrl}\n\nPowered by Pixel AI`;
}

function _whatsappBody(photoUrl, eventName) {
  const name = eventName ? `*${eventName}*` : 'your event';
  return (
    `🎉 Your photo from ${name} is ready!\n\n` +
    `📸 Download: ${photoUrl}\n\n` +
    `_Powered by Pixel AI_`
  );
}

module.exports = { sendSMS, sendWhatsApp };
