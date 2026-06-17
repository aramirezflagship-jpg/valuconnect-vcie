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
  { key: 'FAL_API_KEY',                   hint: 'fal.ai/dashboard — needed for AI generation + background removal' },
  { key: 'CLOUDFLARE_ACCOUNT_ID',        hint: 'dash.cloudflare.com → Workers & Pages → Overview → Account ID' },
  { key: 'R2_ACCESS_KEY_ID',             hint: 'dash.cloudflare.com → R2 → Manage R2 API tokens → Create token' },
  { key: 'R2_SECRET_ACCESS_KEY',         hint: 'Same R2 token creation page as above' },
  { key: 'R2_BUCKET_NAME',              hint: 'Name of your R2 bucket, e.g. flash-it' },
  { key: 'R2_PUBLIC_URL',               hint: 'Optional: custom domain or r2.dev public URL for the bucket' },
  { key: 'TWILIO_ACCOUNT_SID',          hint: 'console.twilio.com — needed for SMS/WhatsApp delivery' },
  { key: 'TWILIO_AUTH_TOKEN',           hint: 'console.twilio.com' },
  { key: 'TWILIO_PHONE_NUMBER',         hint: 'Your Twilio number in E.164 format, e.g. +15551234567' },
  // ── Supabase (optional for local dev, required in production) ────────────────
  { key: 'SUPABASE_URL',               hint: 'supabase.com → project → Settings → API → Project URL' },
  { key: 'SUPABASE_ANON_KEY',          hint: 'supabase.com → project → Settings → API → anon/public key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',  hint: 'supabase.com → project → Settings → API → service_role key (backend only — never expose to frontend)' },
  // ── Web Push / VAPID (optional for local dev, required for push notifications) ─
  { key: 'VAPID_PUBLIC_KEY',           hint: 'Run: npx web-push generate-vapid-keys — use the Public Key here' },
  { key: 'VAPID_PRIVATE_KEY',          hint: 'Run: npx web-push generate-vapid-keys — use the Private Key here' },
];

let errors = 0;
let warnings = 0;

console.log('\n  Flash-it — Environment Check\n  ' + '─'.repeat(40));

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
