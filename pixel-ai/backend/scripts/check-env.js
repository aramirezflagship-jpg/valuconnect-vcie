#!/usr/bin/env node
'use strict';

/**
 * Run before starting the server to verify all required env vars are set.
 * Usage: node scripts/check-env.js
 * Called automatically by the "prestart" npm script.
 */

require('dotenv').config();

const REQUIRED = [
  { key: 'ADMIN_SECRET', hint: 'Set a random string, e.g.: openssl rand -hex 32' },
];

const RECOMMENDED = [
  { key: 'REMOVEBG_API_KEY',       hint: 'remove.bg/api — needed for background removal' },
  { key: 'FAL_API_KEY',             hint: 'fal.ai/dashboard — needed for AI generation' },
  { key: 'CLOUDINARY_CLOUD_NAME',   hint: 'cloudinary.com/console — needed for photo storage' },
  { key: 'CLOUDINARY_API_KEY',      hint: 'cloudinary.com/console' },
  { key: 'CLOUDINARY_API_SECRET',   hint: 'cloudinary.com/console' },
  { key: 'TWILIO_ACCOUNT_SID',      hint: 'console.twilio.com — needed for SMS/WhatsApp delivery' },
  { key: 'TWILIO_AUTH_TOKEN',       hint: 'console.twilio.com' },
  { key: 'TWILIO_PHONE_NUMBER',     hint: 'Your Twilio number in E.164 format, e.g. +15551234567' },
];

let errors = 0;
let warnings = 0;

console.log('\n  Pixel AI — Environment Check\n  ' + '─'.repeat(40));

for (const { key, hint } of REQUIRED) {
  if (!process.env[key]) {
    console.error(`  ✗ MISSING  ${key}`);
    console.error(`             ${hint}`);
    errors++;
  } else {
    console.log(`  ✓ OK       ${key}`);
  }
}

console.log('');

for (const { key, hint } of RECOMMENDED) {
  if (!process.env[key]) {
    console.warn(`  ⚠ NOT SET  ${key}`);
    console.warn(`             ${hint}`);
    warnings++;
  } else {
    console.log(`  ✓ OK       ${key}`);
  }
}

console.log('\n  ' + '─'.repeat(40));

if (errors > 0) {
  console.error(`\n  ✗ ${errors} required variable(s) missing — server will not start.\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n  ⚠ ${warnings} recommended variable(s) not set.`);
  console.warn('  The server will start, but those features will use fallback mode.\n');
} else {
  console.log('\n  ✓ All variables set. Ready to start.\n');
}
