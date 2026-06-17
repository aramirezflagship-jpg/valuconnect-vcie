'use strict';

const express = require('express');
const { requireAuth, adminAuth } = require('../middleware/auth');
const db = require('../services/db');
const localAuth = require('../services/localAuth');
const email = require('../services/email');

const router = express.Router();

// ── Simple in-memory rate limiter (per key) ───────────────────────────────────
// Best-effort only; resets on redeploy. Used to throttle forgot-password by
// email + IP so the endpoint can't be used to spam inboxes or enumerate users.
const _rateBuckets = new Map();

function _rateLimited(key, max, windowMs) {
  const now = Date.now();
  const bucket = _rateBuckets.get(key) || [];
  const fresh = bucket.filter((ts) => now - ts < windowMs);
  if (fresh.length >= max) {
    _rateBuckets.set(key, fresh);
    return true;
  }
  fresh.push(now);
  _rateBuckets.set(key, fresh);
  return false;
}

// Supabase clients (only used when Supabase is configured)
let supabaseAnon = null;
let supabaseAdmin = null;
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

if (useSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  supabaseAdmin = require('../services/supabase');
}

// ── GET /api/accounts/me ──────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    let account = await db.getAccount(req.userId);

    if (!account) {
      // Local auth: build account object from JWT payload
      account = {
        id: req.userId,
        email: req.user.email,
        name: req.user.name || req.user.email,
        role: req.user.role || 'customer',
        created_at: new Date().toISOString(),
      };
    }

    // Fetch events for this account
    let events = [];
    if (useSupabase && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('events')
        .select('id, name, date, plan_tier, status, guest_count, expires_at')
        .eq('account_id', req.userId)
        .order('created_at', { ascending: false });
      events = data || [];
    } else {
      // JSON store: return all events where account_id matches (or demo events)
      const all = db.getAllEvents ? await db.getAllEvents() : [];
      events = all.filter((e) => e.account_id === req.userId || req.userId === 'a0000000-demo-4000-8000-000000000001');
    }

    return res.json({ account, events, events_count: events.length });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/accounts/me ────────────────────────────────────────────────────

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required.' });
    }

    if (useSupabase) {
      const updated = await db.updateAccount(req.userId, { name: name.trim() });
      return res.json(updated);
    }

    const updated = await localAuth.updateUser(req.userId, { name: name.trim() });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/accounts/register ───────────────────────────────────────────────

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Local-JWT identity in BOTH modes. localAuth persists to the Postgres
    // `accounts` table when SUPABASE_* is set, so Supabase is the database —
    // not the auth provider (one identity model app-wide).
    const { user, token } = await localAuth.register(email, password, name);
    return res.status(201).json({
      user,
      session: { access_token: token },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── POST /api/accounts/login ──────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    // Local-JWT identity in both modes (Postgres `accounts` table in Supabase mode).
    const { user, token } = await localAuth.login(email, password);
    return res.json({
      user,
      session: { access_token: token },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── POST /api/accounts/admin-login ───────────────────────────────────────────
// Admin-specific login: uses ADMIN_SECRET as the password credential.

router.post('/admin-login', async (req, res, next) => {
  try {
    const { email, secret } = req.body;
    const adminSecret = process.env.ADMIN_SECRET || 'flash-it-admin-2026';

    if (!secret || secret !== adminSecret) {
      return res.status(401).json({ error: 'Invalid admin secret.' });
    }

    // Build an admin token
    const adminUser = { id: 'admin', email: email || 'admin@flash-it.app', name: 'Admin', role: 'admin' };
    const token = localAuth.signToken(adminUser);
    return res.json({ user: adminUser, session: { access_token: token } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/accounts/all (admin only) ───────────────────────────────────────

router.get('/all', adminAuth, async (req, res, next) => {
  try {
    if (useSupabase && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('accounts').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // Local store
    const fs = require('fs');
    const storePath = require('path').join(__dirname, '../../../config/users.json');
    let store = { users: [] };
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
    const safe = (store.users || []).map(({ passwordHash, ...u }) => u);
    return res.json(safe);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/accounts/forgot-password ────────────────────────────────────────
// Always returns 200 (no user enumeration). If the account exists, emails a
// single-use, 15-minute reset link. Never leaks the token in the response.

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email_ = (req.body && req.body.email ? String(req.body.email) : '').trim().toLowerCase();
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';

    // Rate-limit: 5 per email / 15 min and 20 per IP / 15 min.
    const windowMs = 15 * 60 * 1000;
    if (email_ && _rateLimited(`fp:email:${email_}`, 5, windowMs)) {
      return res.status(200).json({ ok: true });
    }
    if (_rateLimited(`fp:ip:${ip}`, 20, windowMs)) {
      return res.status(200).json({ ok: true });
    }

    if (!email_) {
      // Don't reveal anything; still 200.
      return res.status(200).json({ ok: true });
    }

    const frontendBase = (process.env.FRONTEND_URL || 'https://valuconnect-vcie.vercel.app')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');

    // One identity model: generate a single-use token, store only its hash, and
    // email it via SendGrid (works in both jsonStore and Supabase modes).
    const result = await localAuth.createPasswordResetToken(email_);
    if (result) {
      const resetUrl = `${frontendBase}/reset-password?token=${result.token}`;
      try {
        const sent = await email.sendPasswordResetEmail(result.user.email, resetUrl);
        if (sent && sent.skipped) {
          // SENDGRID_API_KEY missing — log a warning but DO NOT leak the token.
          console.warn(`[forgot-password] email not sent (SendGrid unconfigured) for ${email_}`);
        }
      } catch (mailErr) {
        console.error('[forgot-password] email send failed:', mailErr.message);
      }
    } else {
      console.log(`[forgot-password] no account for ${email_} (responding 200 anyway)`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/accounts/reset-password ─────────────────────────────────────────
// Verifies the token (exists, unexpired, unused, hash match), enforces password
// rules, updates the password, and invalidates the token. Never reveals whether
// the email existed.

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const ok = await localAuth.consumePasswordResetToken(token, newPassword);
    if (!ok) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
