'use strict';

/**
 * Integration tests for src/routes/templates.js mounted at /api/templates
 *
 * GET  /api/templates        → 200 + array of templates
 * GET  /api/templates/:id    → 200 + template | 404
 * POST /api/templates        adminAuth → 201 | 400 | 401
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (must precede all project requires) ─────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-templates';
process.env.ADMIN_SECRET = 'test-admin-secret-templates';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-tmpl-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/services/supabase', () => null);

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// ── App ───────────────────────────────────────────────────────────────────────

const request = require('supertest');
const app     = require('../src/index');

// ── Cleanup: remove any custom templates we create ────────────────────────────
const createdCustomIds = [];

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}

  const customDir = path.resolve(__dirname, '../../config/templates/custom');
  for (const id of createdCustomIds) {
    try { fs.unlinkSync(path.join(customDir, `${id}.json`)); } catch (_) {}
  }
});

// ── GET /api/templates ────────────────────────────────────────────────────────
// The route returns { templates: [...], count: N } — not a plain array.

describe('GET /api/templates', () => {
  test('returns 200 + { templates, count }', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.templates)).toBe(true);
  });

  test('returns at least 3 templates', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(3);
    expect(res.body.templates.length).toBeGreaterThanOrEqual(3);
  });

  test('each template has id and name fields', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(200);
    for (const t of res.body.templates) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
    }
  });
});

// ── GET /api/templates/:id ────────────────────────────────────────────────────

describe('GET /api/templates/:id', () => {
  test('"single" → 200 + template with id: "single"', async () => {
    const res = await request(app).get('/api/templates/single');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'single');
  });

  test('"strip-2x6" → 200 + strip template', async () => {
    const res = await request(app).get('/api/templates/strip-2x6');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'strip-2x6');
  });

  test('"collage-4x6" → 200 + collage template', async () => {
    const res = await request(app).get('/api/templates/collage-4x6');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'collage-4x6');
  });

  test('"nonexistent" → 404', async () => {
    const res = await request(app).get('/api/templates/nonexistent-id-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ── POST /api/templates ───────────────────────────────────────────────────────

describe('POST /api/templates', () => {
  test('without X-Admin-Secret → 401', async () => {
    const res = await request(app)
      .post('/api/templates')
      .send({
        id: 'test-post-unauth',
        name: 'Unauthorized Attempt',
        type: 'single',
        printWidth: 1200,
        printHeight: 1800,
        photoCount: 1,
        photoSlots: [],
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with wrong X-Admin-Secret → 403', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('X-Admin-Secret', 'wrong-secret')
      .send({
        id: 'test-post-bad-secret',
        name: 'Bad Secret Attempt',
        type: 'single',
        printWidth: 1200,
        printHeight: 1800,
        photoCount: 1,
        photoSlots: [],
      });

    expect(res.status).toBe(403);
  });

  test('with admin auth + valid template body → 201', async () => {
    const customId = `test-route-post-${Date.now()}`;
    createdCustomIds.push(customId);

    const res = await request(app)
      .post('/api/templates')
      .set('X-Admin-Secret', 'test-admin-secret-templates')
      .send({
        id: customId,
        name: 'Route-Created Template',
        type: 'single',
        printWidth: 1200,
        printHeight: 1800,
        photoCount: 1,
        photoSlots: [{ index: 0, x: 0, y: 0, width: 1200, height: 1800 }],
        background: '#0d0d1a',
      });

    expect(res.status).toBe(201);
  });

  test('with admin auth + missing id → 400', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('X-Admin-Secret', 'test-admin-secret-templates')
      .send({
        name: 'No ID Template',
        type: 'single',
        printWidth: 1200,
        printHeight: 1800,
        photoCount: 1,
        photoSlots: [{ index: 0, x: 0, y: 0, width: 1200, height: 1800 }],
      });

    // Route validates that id must be present → 400
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
