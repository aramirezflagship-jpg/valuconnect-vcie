'use strict';

/**
 * Express middleware that enforces admin authentication via a shared secret
 * sent in the X-Admin-Secret request header.
 *
 * Usage: router.use(adminAuth) or router.get('/path', adminAuth, handler)
 */
function adminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    console.error('[auth] ADMIN_SECRET env var is not set — all admin requests will be rejected');
    return res.status(503).json({ error: 'Admin authentication is not configured on this server.' });
  }

  const provided = req.headers['x-admin-secret'];

  if (!provided) {
    return res.status(401).json({ error: 'Missing X-Admin-Secret header.' });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(provided, secret)) {
    return res.status(403).json({ error: 'Invalid admin secret.' });
  }

  next();
}

/**
 * Naive constant-time string comparison.
 * Node's crypto.timingSafeEqual requires equal-length Buffers; we pad here so
 * the comparison always takes the same wall time regardless of how early the
 * strings diverge.
 */
function timingSafeEqual(a, b) {
  const { timingSafeEqual: tse, createHmac } = require('crypto');
  // HMAC the strings with a random key known only to this process so an
  // attacker cannot infer length from a thrown exception.
  const key = Buffer.from(process.env.ADMIN_SECRET || 'fallback', 'utf8');
  const ha = createHmac('sha256', key).update(a).digest();
  const hb = createHmac('sha256', key).update(b).digest();
  return tse(ha, hb);
}

module.exports = { adminAuth };
