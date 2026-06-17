'use strict';

/**
 * Unit tests for src/services/localAuth.js
 *
 * USERS_STORE_PATH env var redirects the JSON store to a temp file so
 * production config/users.json is never touched during tests.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (before any require of project modules) ────────────────────────
delete process.env.SUPABASE_URL;
process.env.JWT_SECRET   = 'test-jwt-secret-localauth';
process.env.ADMIN_SECRET = 'test-admin-secret';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-la-'));
process.env.USERS_STORE_PATH = path.join(storeDir, 'users.json');

// ── Module under test ─────────────────────────────────────────────────────────
const localAuth = require('../src/services/localAuth');

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

beforeEach(() => {
  // Wipe the store before each test for isolation
  const p = process.env.USERS_STORE_PATH;
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// ── hashPassword / verifyPassword (tested via register + login) ───────────────

describe('hashPassword + verifyPassword', () => {
  test('correct password: login succeeds', async () => {
    await localAuth.register('hash-ok@example.com', 'correctpass', 'Hash OK');
    const result = await localAuth.login('hash-ok@example.com', 'correctpass');
    expect(result).toHaveProperty('token');
  });

  test('wrong password: login throws', async () => {
    await localAuth.register('hash-bad@example.com', 'realpassword', 'Hash Bad');
    await expect(localAuth.login('hash-bad@example.com', 'wrongpassword')).rejects.toThrow();
  });
});

// ── signToken / verifyToken ───────────────────────────────────────────────────

describe('signToken + verifyToken', () => {
  test('round-trip: token encodes user fields and decodes back', async () => {
    await localAuth.register('token-rt@example.com', 'pass1234', 'Token User');
    const { user, token } = await localAuth.login('token-rt@example.com', 'pass1234');

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe('token-rt@example.com');
    expect(decoded.role).toBe('customer');
  });

  test('tampered token fails jwt.verify', async () => {
    await localAuth.register('token-tamper@example.com', 'pass1234', 'Tamper');
    const { token } = await localAuth.login('token-tamper@example.com', 'pass1234');

    const parts = token.split('.');
    const last = parts[2];
    parts[2] = last.slice(0, -1) + (last.slice(-1) === 'a' ? 'b' : 'a');
    const tampered = parts.join('.');

    const jwt = require('jsonwebtoken');
    expect(() => jwt.verify(tampered, process.env.JWT_SECRET)).toThrow();
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  test('valid credentials return { user, token } without passwordHash', async () => {
    await localAuth.register('login-ok@example.com', 'securepass', 'Login OK');
    const result = await localAuth.login('login-ok@example.com', 'securepass');

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe('login-ok@example.com');
  });

  test('unknown email throws with status 401', async () => {
    let err;
    try { await localAuth.login('nobody@example.com', 'pass'); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
  });

  test('wrong password throws with status 401', async () => {
    await localAuth.register('login-bad@example.com', 'rightpass', 'Login Bad');
    let err;
    try { await localAuth.login('login-bad@example.com', 'wrongpass'); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
  });
});

// ── register ──────────────────────────────────────────────────────────────────

describe('register', () => {
  test('new email creates user and returns { user, token }', async () => {
    const result = await localAuth.register('new@example.com', 'pass1234', 'New User');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('new@example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  test('duplicate email throws with status 409', async () => {
    await localAuth.register('dup@example.com', 'pass1234', 'Dup User');
    let err;
    try { await localAuth.register('dup@example.com', 'otherpass', 'Dup Again'); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(409);
  });

  test('email is stored lowercased', async () => {
    const result = await localAuth.register('UPPER@EXAMPLE.COM', 'pass1234', 'Upper');
    expect(result.user.email).toBe('upper@example.com');
  });
});

// ── seedDemoAccounts ──────────────────────────────────────────────────────────

describe('seedDemoAccounts', () => {
  test('seeds demo and admin accounts', async () => {
    localAuth.seedDemoAccounts();
    expect(await localAuth.getUserByEmail('demo@flash-it.app')).not.toBeNull();
    expect(await localAuth.getUserByEmail('admin@flash-it.app')).not.toBeNull();
  });

  test('is idempotent — calling twice does not duplicate accounts', () => {
    localAuth.seedDemoAccounts();
    localAuth.seedDemoAccounts();

    const store = JSON.parse(fs.readFileSync(process.env.USERS_STORE_PATH, 'utf8'));
    const demoCount  = store.users.filter((u) => u.email === 'demo@flash-it.app').length;
    const adminCount = store.users.filter((u) => u.email === 'admin@flash-it.app').length;

    expect(demoCount).toBe(1);
    expect(adminCount).toBe(1);
  });
});
