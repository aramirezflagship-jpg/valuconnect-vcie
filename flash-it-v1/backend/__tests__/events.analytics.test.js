'use strict';

/**
 * Integration tests for analytics, export, and duplicate endpoints in
 * src/routes/events.js:
 *
 *   GET  /api/events/:id/analytics   (admin)
 *   GET  /api/events/:id/export      (admin)
 *   POST /api/events/:id/duplicate   (admin)
 *
 * Uses supertest — no real port is bound.
 * JSON stores are redirected to temp files for full isolation.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (before any require of project modules) ────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SENDGRID_API_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret';
process.env.ADMIN_SECRET = 'test-admin-secret-123';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-evana-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

jest.mock('../src/services/supabase', () => null);
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]),
}));

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

const request = require('supertest');
const app     = require('../src/index');

const ADMIN_HEADERS = { 'X-Admin-Secret': 'test-admin-secret-123' };

// ── Shared fixture: create one event used across all suites ───────────────────
let eventId;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/events')
    .set(ADMIN_HEADERS)
    .send({ name: 'Analytics Test Event', date: '2026-12-31' });

  expect(res.status).toBe(201);
  eventId = res.body.id;
});

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── GET /api/events/:id/analytics ─────────────────────────────────────────────

describe('GET /api/events/:id/analytics', () => {
  test('with adminAuth → 200 with analytics shape', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/analytics`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    // Shape: { sessions, byMethod, guestEmails, guestPhones }
    expect(res.body).toHaveProperty('sessions');
    expect(res.body).toHaveProperty('byMethod');
    expect(res.body).toHaveProperty('guestEmails');
    expect(res.body).toHaveProperty('guestPhones');
  });

  test('without adminAuth → 401', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/analytics`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with wrong admin secret → 403', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/analytics`)
      .set('X-Admin-Secret', 'wrong-secret');

    expect(res.status).toBe(403);
  });

  test('analytics for a fresh event has sessions = 0', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/analytics`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toBe(0);
  });

  test('analytics for an unknown eventId returns zero-value structure (not 404)', async () => {
    const res = await request(app)
      .get('/api/events/does-not-exist-xyz/analytics')
      .set(ADMIN_HEADERS);

    // The service returns a zero structure for unknown IDs — not a 404
    expect(res.status).toBe(200);
    expect(res.body.sessions).toBe(0);
  });
});

// ── GET /api/events/:id/export ────────────────────────────────────────────────

describe('GET /api/events/:id/export', () => {
  test('with adminAuth → 200 with Content-Type text/csv', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/export`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  test('CSV response includes header row "email,phone"', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/export`)
      .set(ADMIN_HEADERS);

    expect(res.text).toMatch(/^email,phone/);
  });

  test('without adminAuth → 401', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/export`);

    expect(res.status).toBe(401);
  });

  test('with wrong admin secret → 403', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/export`)
      .set('X-Admin-Secret', 'bad-secret');

    expect(res.status).toBe(403);
  });
});

// ── POST /api/events/:id/duplicate ────────────────────────────────────────────

describe('POST /api/events/:id/duplicate', () => {
  test('with adminAuth → 201 with a new event object', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    // The duplicate must be a different event
    expect(res.body.id).not.toBe(eventId);
  });

  test('duplicated event has the same name as the original', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Analytics Test Event');
  });

  test('duplicated event has status "active"', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
  });

  test('without adminAuth → 401', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`);

    expect(res.status).toBe(401);
  });

  test('with wrong admin secret → 403', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set('X-Admin-Secret', 'wrong-secret');

    expect(res.status).toBe(403);
  });

  test('duplicate of a non-existent event → 404', async () => {
    const res = await request(app)
      .post('/api/events/no-such-event-abc/duplicate')
      .set(ADMIN_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
