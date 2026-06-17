'use strict';

/**
 * Integration tests for src/routes/events.js
 *
 * Uses supertest — no real port is bound.
 * EVENTS_STORE_PATH redirects events.json to a temp file.
 * USERS_STORE_PATH redirects users.json (needed for seed on startup).
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup ─────────────────────────────────────────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-events';
process.env.ADMIN_SECRET = 'test-admin-secret';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-ev-'));
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

// ── GET /api/events (admin required) ─────────────────────────────────────────

describe('GET /api/events', () => {
  test('without X-Admin-Secret → 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with correct X-Admin-Secret → 200 + { events, count }', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-Admin-Secret', 'test-admin-secret');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  test('with wrong X-Admin-Secret → 403', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-Admin-Secret', 'bad-secret');

    expect(res.status).toBe(403);
  });
});

// ── GET /api/events/:id ───────────────────────────────────────────────────────

describe('GET /api/events/:id', () => {
  let createdEventId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/events')
      .set('X-Admin-Secret', 'test-admin-secret')
      .send({ name: 'Test Event Alpha', date: '2026-12-31' });

    expect(res.status).toBe(201);
    createdEventId = res.body.id;
  });

  test('existing event id → 200 + public event object', async () => {
    const res = await request(app).get(`/api/events/${createdEventId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdEventId);
    expect(res.body.name).toBe('Test Event Alpha');
    // pin is a sensitive field — must not appear in the public response
    expect(res.body).not.toHaveProperty('pin');
  });

  test('unknown event id → 404', async () => {
    const res = await request(app).get('/api/events/does-not-exist-xyz');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/events validation ───────────────────────────────────────────────

describe('POST /api/events', () => {
  test('missing name → 400', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('X-Admin-Secret', 'test-admin-secret')
      .send({ date: '2026-12-31' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('no admin header → 401', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ name: 'Unauthorized Event' });

    expect(res.status).toBe(401);
  });
});
