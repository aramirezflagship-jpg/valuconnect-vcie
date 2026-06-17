'use strict';
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../../../config/analytics.json');

function readStore() {
  if (!fs.existsSync(STORE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return {}; }
}
function writeStore(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function trackSession(eventId, deliveryMethod, guestContact) {
  const store = readStore();
  if (!store[eventId]) store[eventId] = { sessions: 0, byMethod: {}, guestEmails: [], guestPhones: [] };
  const ev = store[eventId];
  ev.sessions++;
  ev.byMethod[deliveryMethod] = (ev.byMethod[deliveryMethod] || 0) + 1;
  if (deliveryMethod === 'email' && guestContact && !ev.guestEmails.includes(guestContact)) ev.guestEmails.push(guestContact);
  if (deliveryMethod === 'sms' && guestContact && !ev.guestPhones.includes(guestContact)) ev.guestPhones.push(guestContact);
  writeStore(store);
}

function getEventAnalytics(eventId) {
  const store = readStore();
  return store[eventId] || { sessions: 0, byMethod: {}, guestEmails: [], guestPhones: [] };
}

function getAllAnalytics() { return readStore(); }

module.exports = { trackSession, getEventAnalytics, getAllAnalytics };
