'use strict';

/**
 * Integration tests for src/routes/virtualBooth.js
 *
 * Strategy:
 *  - SUPABASE_URL unset → db.js delegates to the JSON file store (events.js)
 *  - EVENTS_STORE_PATH redirected to a temp dir for isolation
 *  - ai-transform and storage are mocked so no real API calls are made
 *  - The overlay branch is skipped by not setting overlayUrl on test events
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (must precede any require of project modules) ───────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret';
process.env.ADMIN_SECRET = 'test-admin-secret-123';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

// Redirect JSON stores to a temp directory for full test isolation
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-vb-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

// ── Service mocks ─────────────────────────────────────────────────────────────

// Supabase: return null so db.js uses the JSON file store
jest.mock('../src/services/supabase', () => null);

// ai-transform: return the input buffer unchanged — avoids fal.ai calls and
// sharp composite work; the route wraps this in try/catch so even a throw
// would just fall through, but returning the buffer exercises the happy path.
jest.mock('../src/services/ai-transform', () => ({
  transformPhoto: jest.fn(async (buffer) => buffer),
  transformWithTheme: jest.fn(async (buffer) => buffer),
}));

// storage: return a predictable fake URL without any R2/AWS calls
jest.mock('../src/services/storage', () => ({
  uploadBuffer: jest.fn(async (_buf, key) => `https://fake-r2.example.com/${key}`),
  uploadPhoto:  jest.fn(async () => ({
    url: 'https://fake-r2.example.com/photo.png',
    publicId: 'flash-it/test/photo.png',
    thumbnailUrl: 'https://fake-r2.example.com/thumb.jpg',
  })),
  getEventPhotos: jest.fn(async () => []),
}));

// Silence startup noise
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const app     = require('../src/index');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a real test event via the admin API so it exists in the JSON store.
 * Returns the created event object (including its generated id).
 */
async function createTestEvent(overrides = {}) {
  const res = await request(app)
    .post('/api/events')
    .set('X-Admin-Secret', 'test-admin-secret-123')
    .send({ name: 'VB Test Event', themes: ['galaxy', 'tropical'], ...overrides });

  if (res.status !== 201) {
    throw new Error(`createTestEvent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ── Teardown ──────────────────────────────────────────────────────────────────

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── GET /api/virtual-booth/:eventCode ─────────────────────────────────────────

describe('GET /api/virtual-booth/:eventCode', () => {
  test('nonexistent eventCode → 404', async () => {
    const res = await request(app).get('/api/virtual-booth/no-such-event-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('existing event → 200 with required fields', async () => {
    const event = await createTestEvent();
    const res   = await request(app).get(`/api/virtual-booth/${event.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('eventCode', event.id);
    expect(res.body).toHaveProperty('themes');
    expect(res.body).toHaveProperty('planTier');
    expect(Array.isArray(res.body.themes)).toBe(true);
  });
});

// ── POST /api/virtual-booth/:eventCode/capture ────────────────────────────────

describe('POST /api/virtual-booth/:eventCode/capture', () => {
  let testEvent;

  beforeAll(async () => {
    testEvent = await createTestEvent();
  });

  test('nonexistent eventCode → 404', async () => {
    const res = await request(app)
      .post('/api/virtual-booth/no-such-event-abc/capture')
      .send({ photoBase64: 'data:image/jpeg;base64,/9j/4AAQ' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('missing photoBase64 → 400', async () => {
    const res = await request(app)
      .post(`/api/virtual-booth/${testEvent.id}/capture`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/photoBase64/i);
  });

  test('valid base64 JPEG → 200 with photoUrl', async () => {
    // Minimal 1x1 JPEG in base64 (valid JPEG magic bytes + minimal structure)
    const minimalJpeg =
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS' +
      'Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ' +
      'CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
      'MjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/' +
      'EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAA' +
      'AAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJAA/9k=';

    const res = await request(app)
      .post(`/api/virtual-booth/${testEvent.id}/capture`)
      .send({ photoBase64: `data:image/jpeg;base64,${minimalJpeg}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('photoUrl');
    expect(typeof res.body.photoUrl).toBe('string');
    expect(res.body.photoUrl).toMatch(/^https?:\/\//);
  });

  test('valid base64 without data-URL prefix also accepted → 200', async () => {
    const rawBase64 = Buffer.from('fake-image-bytes-for-testing').toString('base64');
    const res = await request(app)
      .post(`/api/virtual-booth/${testEvent.id}/capture`)
      .send({ photoBase64: rawBase64 });

    // The route processes the buffer; ai-transform mock returns the same buffer.
    // storage mock returns a fake URL → response should be 200.
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('photoUrl');
  });
});
