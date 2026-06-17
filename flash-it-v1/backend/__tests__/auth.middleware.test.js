'use strict';

/**
 * Unit tests for src/middleware/auth.js
 *
 * SUPABASE_URL is absent so requireAuth uses the local-JWT path.
 * supabase service is mocked to return null.
 */

delete process.env.SUPABASE_URL;
process.env.JWT_SECRET   = 'test-jwt-secret-middleware';
process.env.ADMIN_SECRET = 'test-admin-secret';

const jwt = require('jsonwebtoken');

jest.mock('../src/services/supabase', () => null);

// Also mock localAuth (used by requireAuth) — we supply a real verifyToken
// backed by our test JWT_SECRET so we do not need to stub it.
// supabase=null ensures the local-JWT branch runs.

const { requireAuth, adminAuth } = require('../src/middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockCtx(headers = {}) {
  const req = { headers };
  const res = {
    _status: null,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data)   { this._json  = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  test('valid local JWT sets req.userId and calls next()', async () => {
    const payload = { userId: 'user-123', email: 'a@b.com', name: 'A', role: 'customer' };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    const { req, res, next } = mockCtx({ authorization: `Bearer ${token}` });
    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('user-123');
  });

  test('missing token returns 401', async () => {
    const { req, res, next } = mockCtx({});
    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('tampered token returns 401', async () => {
    const token = jwt.sign({ userId: 'u' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const parts = token.split('.');
    parts[2] = parts[2].split('').reverse().join('');
    const tampered = parts.join('.');

    const { req, res, next } = mockCtx({ authorization: `Bearer ${tampered}` });
    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('expired token returns 401', async () => {
    const token = jwt.sign({ userId: 'u' }, process.env.JWT_SECRET, { expiresIn: -1 });

    const { req, res, next } = mockCtx({ authorization: `Bearer ${token}` });
    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token signed with wrong secret returns 401', async () => {
    const token = jwt.sign({ userId: 'u' }, 'wrong-secret', { expiresIn: '1h' });

    const { req, res, next } = mockCtx({ authorization: `Bearer ${token}` });
    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── adminAuth ─────────────────────────────────────────────────────────────────

describe('adminAuth', () => {
  test('correct X-Admin-Secret header calls next()', () => {
    const { req, res, next } = mockCtx({ 'x-admin-secret': 'test-admin-secret' });
    adminAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBeNull();
  });

  test('wrong secret returns 403', () => {
    const { req, res, next } = mockCtx({ 'x-admin-secret': 'wrong-secret' });
    adminAuth(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('missing header returns 401', () => {
    const { req, res, next } = mockCtx({});
    adminAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
