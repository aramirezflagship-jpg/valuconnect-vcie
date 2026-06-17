'use strict';

/**
 * Integration tests for src/routes/strips.js mounted at /api/strips
 *
 * POST /api/strips/create
 *   Body: { eventId, photoUrls: string[], templateId? }
 *   Auth: requireAuth (Bearer token)
 *   Returns: { stripUrl, thumbnailUrl, templateId, photoCount }
 *
 * Strategy:
 *  - SUPABASE_URL unset → db.js delegates to the JSON file store
 *  - Compositor, storage, and node-fetch are mocked to avoid real I/O
 *  - Auth token obtained via POST /api/accounts/register
 *  - Test event created via POST /api/events (admin secret)
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (must precede all project requires) ─────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-strips';
process.env.ADMIN_SECRET = 'test-admin-secret-strips';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-strips-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

// ── Mocks (must be before any require of src/ modules) ────────────────────────

jest.mock('../src/services/supabase', () => null);

// sharp: used directly by strips route to generate the thumbnail buffer
jest.mock('sharp', () => {
  const mockInstance = {
    resize:    jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    png:       jest.fn().mockReturnThis(),
    jpeg:      jest.fn().mockReturnThis(),
    toBuffer:  jest.fn().mockResolvedValue(Buffer.from('fake-thumb-data')),
  };
  const sharp = jest.fn(() => mockInstance);
  sharp.mockInstance = mockInstance;
  return sharp;
});

jest.mock('../src/services/storage', () => ({
  uploadPhoto: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/test.png',
    publicId: 'test/test.png',
    thumbnailUrl: 'https://r2.example.com/thumb_test.jpg',
  }),
  uploadBuffer: jest.fn().mockResolvedValue('https://r2.example.com/strip.png'),
  getEventPhotos: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/services/compositor', () => ({
  compose:      jest.fn().mockResolvedValue(Buffer.from('fake-strip')),
  composeStrip: jest.fn().mockResolvedValue(Buffer.from('fake-double-strip')),
}));

// node-fetch: simulate downloading photo URLs
jest.mock('node-fetch', () => ({
  default: jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-photo').buffer),
  }),
}));

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const app     = require('../src/index');

// ── Teardown ──────────────────────────────────────────────────────────────────

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Register a new test user and return the Bearer token.
 */
async function getAuthToken(suffix = '') {
  const email = `strips-user-${Date.now()}${suffix}@test.com`;
  const res = await request(app)
    .post('/api/accounts/register')
    .send({ email, password: 'pass1234', name: 'Strips Tester' });

  if (res.status !== 201) {
    throw new Error(`getAuthToken failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.session.access_token;
}

/**
 * Create a test event via the admin API.
 */
async function createTestEvent(overrides = {}) {
  const res = await request(app)
    .post('/api/events')
    .set('X-Admin-Secret', 'test-admin-secret-strips')
    .send({ name: 'Strips Test Event', date: '2026-12-31', ...overrides });

  if (res.status !== 201) {
    throw new Error(`createTestEvent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ── POST /api/strips/create ───────────────────────────────────────────────────

describe('POST /api/strips/create', () => {
  let token;
  let eventId;

  beforeAll(async () => {
    token   = await getAuthToken();
    const event = await createTestEvent();
    eventId = event.id;
  });

  // strips route uses optionalAuth — unauthenticated guests are allowed to create strips
  test('without auth + valid payload → 201 (optionalAuth allows guest access)', async () => {
    const res = await request(app)
      .post('/api/strips/create')
      .send({ eventId, photoUrls: ['https://example.com/photo.jpg'] });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('stripUrl');
  });

  test('with auth + missing eventId → 400', async () => {
    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ photoUrls: ['https://example.com/photo.jpg'] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + missing photoUrls → 400', async () => {
    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + unknown eventId → 404', async () => {
    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: 'does-not-exist-xyz', photoUrls: ['https://example.com/photo.jpg'] });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + valid event + 1 photoUrl → 200 + { stripUrl, thumbnailUrl, templateId, photoCount }', async () => {
    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventId,
        photoUrls: ['https://example.com/photo1.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('stripUrl');
    expect(res.body).toHaveProperty('thumbnailUrl');
    expect(res.body).toHaveProperty('templateId');
    expect(res.body).toHaveProperty('photoCount');
    expect(res.body.photoCount).toBe(1);
  });

  test('with auth + templateId strip-2x6 + 4 photoUrls → 201', async () => {
    const photoUrls = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
      'https://example.com/photo4.jpg',
    ];

    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId, photoUrls, templateId: 'strip-2x6' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('stripUrl');
    expect(res.body.photoCount).toBe(4);
    expect(res.body.templateId).toBe('strip-2x6');
  });

  test('with auth + unknown templateId → uses default template or returns 400', async () => {
    // The route either falls back to a default or returns 400 for unknown template.
    // Either is acceptable — we just verify the response is not a 5xx.
    const res = await request(app)
      .post('/api/strips/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventId,
        photoUrls: ['https://example.com/photo1.jpg'],
        templateId: 'nonexistent-template-id',
      });

    expect(res.status).toBeLessThan(500);
  });
});
