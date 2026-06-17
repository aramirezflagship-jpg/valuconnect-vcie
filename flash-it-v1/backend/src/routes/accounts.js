'use strict';

const express = require('express');
const { requireAuth, adminAuth } = require('../middleware/auth');
const db = require('../services/db');
const localAuth = require('../services/localAuth');

const router = express.Router();

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

    const updated = localAuth.updateUser(req.userId, { name: name.trim() });
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

    // Supabase path
    if (useSupabase && supabaseAnon && supabaseAdmin) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) return res.status(400).json({ error: authError.message });

      await db.createAccount(authData.user.id, email, name || email.split('@')[0]);

      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({ email, password });
      if (signInError) return res.status(201).json({ user: authData.user, session: null });
      return res.status(201).json({ user: signInData.user, session: signInData.session });
    }

    // Local fallback
    const { user, token } = localAuth.register(email, password, name);
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

    // Supabase path
    if (useSupabase && supabaseAnon) {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ error: error.message });
      return res.json({ user: data.user, session: data.session });
    }

    // Local fallback
    const { user, token } = localAuth.login(email, password);
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

module.exports = router;
