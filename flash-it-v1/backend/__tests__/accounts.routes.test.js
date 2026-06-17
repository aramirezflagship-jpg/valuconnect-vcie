'use strict';

/**
 * Integration tests for src/routes/accounts.js
 *
 * Uses supertest — no real port is bound.
 * Env vars redirect both stores to temp dirs.
 * PORT=0 prevents app.listen() from conflicting with other tests.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup ─────────────────────────────────────────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-accounts';
process.env.ADMIN_SECRET = 'test-admin-secret';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0'; // prevent port conflicts

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-acc-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

jest.mock('../src/services/supabase', () => null);

const request = require('supertest');
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

const app = require('../src/index');

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── POST /api/accounts/register ───────────────────────────────────────────────

describe('POST /api/accounts/register', () => {
  test('new user → 201 + { user, session: { access_token } }', async () => {
    const res = await request(app)
      .post('/api/accounts/register')
      .send({ email: 'newuser@test.com', password: 'pass1234', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('session');
    expect(res.body.session).toHaveProperty('access_token');
    expect(res.body.user.email).toBe('newuser@test.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('duplicate email → 409', async () => {
    await request(app)
      .post('/api/accounts/register')
      .send({ email: 'duplicate@test.com', password: 'pass1234' });

    const res = await request(app)
      .post('/api/accounts/register')
      .send({ email: 'duplicate@test.com', password: 'otherpass' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('missing password → 400', async () => {
    const res = await request(app)
      .post('/api/accounts/register')
      .send({ email: 'nopw@test.com' });

    expect(res.status).toBe(400);
  });

  test('password too short → 400', async () => {
    const res = await request(app)
      .post('/api/accounts/register')
      .send({ email: 'short@test.com', password: 'abc' });

    expect(res.status).toBe(400);
  });
});

// ── POST /api/accounts/login ──────────────────────────────────────────────────

describe('POST /api/accounts/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/accounts/register')
      .send({ email: 'logintest@test.com', password: 'mypassword', name: 'Login Test' });
  });

  test('valid credentials → 200 + token', async () => {
    const res = await request(app)
      .post('/api/accounts/login')
      .send({ email: 'logintest@test.com', password: 'mypassword' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('session');
    expect(res.body.session).toHaveProperty('access_token');
  });

  test('wrong password → 401', async () => {
    const res = await request(app)
      .post('/api/accounts/login')
      .send({ email: 'logintest@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('unknown email → 401', async () => {
    const res = await request(app)
      .post('/api/accounts/login')
      .send({ email: 'ghost@test.com', password: 'pass' });

    expect(res.status).toBe(401);
  });

  test('missing fields → 400', async () => {
    const res = await request(app)
      .post('/api/accounts/login')
      .send({ email: 'logintest@test.com' });

    expect(res.status).toBe(400);
  });
});

// ── POST /api/accounts/admin-login ───────────────────────────────────────────

describe('POST /api/accounts/admin-login', () => {
  test('correct secret → 200 + token with role: admin', async () => {
    const res = await request(app)
      .post('/api/accounts/admin-login')
      .send({ email: 'admin@flash-it.app', secret: 'test-admin-secret' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.session).toHaveProperty('access_token');

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(res.body.session.access_token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });

  test('wrong secret → 401', async () => {
    const res = await request(app)
      .post('/api/accounts/admin-login')
      .send({ email: 'admin@flash-it.app', secret: 'wrong-secret' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('missing secret → 401', async () => {
    const res = await request(app)
      .post('/api/accounts/admin-login')
      .send({ email: 'admin@flash-it.app' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/accounts/me ──────────────────────────────────────────────────────

describe('GET /api/accounts/me', () => {
  let validToken;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/accounts/register')
      .send({ email: 'metest@test.com', password: 'pass1234', name: 'Me Test' });
    validToken = reg.body.session.access_token;
  });

  test('valid token → 200 + account object', async () => {
    const res = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('account');
    expect(res.body.account.email).toBe('metest@test.com');
  });

  test('no token → 401', async () => {
    const res = await request(app).get('/api/accounts/me');
    expect(res.status).toBe(401);
  });

  test('garbage token → 401', async () => {
    const res = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
});
