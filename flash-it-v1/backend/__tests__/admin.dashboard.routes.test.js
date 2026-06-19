'use strict';

/**
 * Integration tests for the upgraded admin dashboard endpoints (src/routes/admin.js)
 * and the Full Service lead persistence wiring (src/routes/contact.js).
 *
 * Runs in jsonStore mode (no Supabase), so the db aggregate helpers return their
 * graceful empty/zero shapes — which lets us lock in:
 *   - adminAuth enforcement (401 without secret, 403 with a bad one)
 *   - the response envelopes prince's UI consumes
 *   - the contact form accepting BOTH `fullName`/`city` and `name`/`location`
 *
 * The Supabase data-shape mapping (counts, customer enrichment, service_type) is
 * covered separately in db.admin.supabase.test.js.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup ─────────────────────────────────────────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-admin-dash';
process.env.ADMIN_SECRET = 'test-admin-secret';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-admin-'));
process.env.USERS_STORE_PATH         = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH        = path.join(storeDir, 'events.json');
process.env.SERVICE_REQUESTS_PATH    = path.join(storeDir, 'service-requests.json');

jest.mock('../src/services/supabase', () => null);

const request = require('supertest');
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

const app = require('../src/index');

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

const ADMIN = ['X-Admin-Secret', 'test-admin-secret'];

// ── auth: every /api/admin/* dashboard route is admin-only ────────────────────

describe('admin dashboard routes require X-Admin-Secret', () => {
  const routes = [
    ['get', '/api/admin/service-requests'],
    ['get', '/api/admin/metrics'],
    ['get', '/api/admin/customers'],
    ['patch', '/api/admin/service-requests/some-id'],
  ];

  test.each(routes)('%s %s without secret → 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test.each(routes)('%s %s with wrong secret → 403', async (method, url) => {
    const res = await request(app)[method](url).set('X-Admin-Secret', 'nope');
    expect(res.status).toBe(403);
  });
});

// ── GET /api/admin/service-requests ───────────────────────────────────────────

describe('GET /api/admin/service-requests', () => {
  test('with admin secret → 200 + { requests, count }', async () => {
    const res = await request(app).get('/api/admin/service-requests').set(...ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('requests');
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body).toHaveProperty('count');
  });
});

// ── PATCH /api/admin/service-requests/:id ─────────────────────────────────────

describe('PATCH /api/admin/service-requests/:id', () => {
  test('invalid status → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/service-requests/abc')
      .set(...ADMIN)
      .send({ status: 'banana' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('missing status → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/service-requests/abc')
      .set(...ADMIN)
      .send({});
    expect(res.status).toBe(400);
  });

  test('valid status but not found (jsonStore mode) → 404', async () => {
    // In jsonStore mode updateServiceRequestStatus returns null → 404.
    const res = await request(app)
      .patch('/api/admin/service-requests/does-not-exist')
      .set(...ADMIN)
      .send({ status: 'contacted' });
    expect(res.status).toBe(404);
  });
});

// ── GET /api/admin/metrics ────────────────────────────────────────────────────

describe('GET /api/admin/metrics', () => {
  test('with admin secret → 200 + zero-filled aggregate shape', async () => {
    const res = await request(app).get('/api/admin/metrics').set(...ADMIN);
    expect(res.status).toBe(200);

    const m = res.body;
    expect(m.totals).toEqual({
      events: 0, photos: 0, customers: 0, serviceRequests: 0, newServiceRequests: 0,
    });
    expect(m.eventsByServiceType).toEqual({ managed: 0, solo: 0 });
    expect(m.accountsByServiceType).toEqual({ managed: 0, solo: 0, none: 0 });
    expect(m.photosByMode).toEqual({ natural: 0, character: 0, unknown: 0 });
    expect(m.eventsByCategory).toEqual({});
    expect(m.photosByCategory).toEqual({});
    expect(Array.isArray(m.eventsTimeseries)).toBe(true);
    expect(Array.isArray(m.photosTimeseries)).toBe(true);
    expect(m.marketing).toEqual({ optInCount: 0, optInRate: 0 });
  });
});

// ── GET /api/admin/customers ──────────────────────────────────────────────────

describe('GET /api/admin/customers', () => {
  test('with admin secret → 200 + { customers, count }', async () => {
    const res = await request(app).get('/api/admin/customers').set(...ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customers');
    expect(Array.isArray(res.body.customers)).toBe(true);
    expect(res.body).toHaveProperty('count');
  });
});

// ── POST /api/contact persists the Full Service lead (jsonStore fallback) ──────

describe('POST /api/contact (Full Service lead)', () => {
  test('accepts the frontend form shape (fullName + city) → 201 + id', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        fullName: 'Maria Lopez',
        email: 'maria@example.com',
        phone: '+13055550100',
        eventType: 'quinceanera',
        estimatedGuests: '120',
        eventDate: '2026-09-12',
        city: 'Miami, FL',
        message: 'XV for my daughter',
        lang: 'es',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');

    // Persisted to the JSON store with normalised fields.
    const stored = JSON.parse(fs.readFileSync(process.env.SERVICE_REQUESTS_PATH, 'utf8'));
    const saved = stored.requests.find((r) => r.email === 'maria@example.com');
    expect(saved).toBeTruthy();
    expect(saved.name).toBe('Maria Lopez');        // fullName → name
    expect(saved.location).toBe('Miami, FL');       // city → location
    expect(saved.estimatedGuests).toBe(120);        // '120' → 120
    expect(saved.status).toBe('new');
    expect(saved.lang).toBe('es');
  });

  test('still accepts the legacy shape (name + location) → 201', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'John Doe', email: 'john@example.com', location: 'Austin, TX' });
    expect(res.status).toBe(201);
  });

  test('missing name and email → 400', async () => {
    const res = await request(app).post('/api/contact').send({ phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
