'use strict';

const { createHmac, timingSafeEqual } = require('crypto');
const supabase = require('../services/supabase');
const localAuth = require('../services/localAuth');

// ── Admin secret auth ─────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET || 'flash-it-admin-2026';

  const provided = req.headers['x-admin-secret'];
  if (!provided) {
    return res.status(401).json({ error: 'Missing X-Admin-Secret header.' });
  }

  if (!_timingSafeEqual(provided, secret)) {
    return res.status(403).json({ error: 'Invalid admin secret.' });
  }

  next();
}

function _timingSafeEqual(a, b) {
  const key = Buffer.from(process.env.ADMIN_SECRET || 'flash-it-admin-2026', 'utf8');
  const ha = createHmac('sha256', key).update(a).digest();
  const hb = createHmac('sha256', key).update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ── JWT auth (Supabase when configured, local JWT fallback otherwise) ─────────

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  // Supabase path
  if (supabase) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    req.user = user;
    return next();
  }

  // Local JWT fallback
  try {
    const decoded = localAuth.verifyToken(token);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) {
      req.userId = user.id;
      req.user = user;
    }
    return next();
  }

  try {
    const decoded = localAuth.verifyToken(token);
    req.userId = decoded.userId;
    req.user = decoded;
  } catch {
    // Invalid token — just ignore for optional auth
  }
  next();
}

module.exports = { adminAuth, requireAuth, optionalAuth };
