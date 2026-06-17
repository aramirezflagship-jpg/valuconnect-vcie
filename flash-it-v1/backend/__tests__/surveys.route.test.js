'use strict';

/**
 * Integration tests for src/routes/surveys.js
 *
 * surveys.js reads/writes to hardcoded paths under config/ (resolved from
 * __dirname at module load time). Since there is no env-var override, we
 * redirect the actual file operations by creating a writable temp directory
 * and then pointing Node's module resolution at a minimal real file.
 *
 * Approach: we patch the paths by monkey-patching the require cache for the
 * surveys router so it uses temp-dir paths. We achieve this by:
 *  1. Computing the real SURVEYS_PATH / RESPONSES_PATH values the module would
 *     use (mirrors the path.join in surveys.js).
 *  2. Ensuring those paths resolve into a temp dir by intercepting fs calls
 *     via jest.spyOn — all reads/writes are redirected to our temp files.
 *
 * This keeps the test hermetic without modifying production code.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup ─────────────────────────────────────────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret';
process.env.ADMIN_SECRET = 'test-admin-secret-123';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-surveys-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

// Temp files for survey data — these are what the mocked fs will redirect to
const TEMP_SURVEYS_PATH   = path.join(storeDir, 'surveys.json');
const TEMP_RESPONSES_PATH = path.join(storeDir, 'survey-responses.json');

// The actual paths the surveys.js module computes at require-time
const REAL_SURVEYS_PATH = path.join(
  __dirname, '../src/routes', '../../../config/surveys.json'
);
const REAL_RESPONSES_PATH = path.join(
  __dirname, '../src/routes', '../../../config/survey-responses.json'
);

// ── fs redirect ───────────────────────────────────────────────────────────────
// We intercept the four fs calls that surveys.js uses and redirect real paths
// to our temp paths. This leaves all other fs usage (events store, etc.) intact.

function redirectPath(p) {
  if (p === REAL_SURVEYS_PATH)   return TEMP_SURVEYS_PATH;
  if (p === REAL_RESPONSES_PATH) return TEMP_RESPONSES_PATH;
  return p;
}

const realExistsSync   = fs.existsSync.bind(fs);
const realReadFileSync = fs.readFileSync.bind(fs);
const realWriteFileSync= fs.writeFileSync.bind(fs);
const realMkdirSync    = fs.mkdirSync.bind(fs);

beforeAll(() => {
  jest.spyOn(fs, 'existsSync').mockImplementation((p, ...args) =>
    realExistsSync(redirectPath(p), ...args)
  );
  jest.spyOn(fs, 'readFileSync').mockImplementation((p, ...args) =>
    realReadFileSync(redirectPath(p), ...args)
  );
  jest.spyOn(fs, 'writeFileSync').mockImplementation((p, ...args) =>
    realWriteFileSync(redirectPath(p), ...args)
  );
  jest.spyOn(fs, 'mkdirSync').mockImplementation((p, ...args) => {
    // Only redirect if it's the config dir; otherwise pass through
    const redirected = redirectPath(p + '/placeholder');
    if (redirected !== p + '/placeholder') {
      return realMkdirSync(path.dirname(redirected), ...args);
    }
    return realMkdirSync(p, ...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── Service mocks ─────────────────────────────────────────────────────────────
jest.mock('../src/services/supabase', () => null);
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const app     = require('../src/index');

const ADMIN_HDR  = { 'X-Admin-Secret': 'test-admin-secret-123' };
const TEST_CODE  = 'test-event-surveys-001';

// Clear survey data before each test so tests are order-independent
beforeEach(() => {
  try { fs.unlinkSync(TEMP_SURVEYS_PATH);   } catch (_) {}
  try { fs.unlinkSync(TEMP_RESPONSES_PATH); } catch (_) {}
});

// ── GET /:eventCode — no survey configured ────────────────────────────────────

describe('GET /api/surveys/:eventCode', () => {
  test('no survey configured → 200 { survey: null }', async () => {
    const res = await request(app).get(`/api/surveys/${TEST_CODE}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ survey: null });
  });
});

// ── PUT /:eventCode ───────────────────────────────────────────────────────────

describe('PUT /api/surveys/:eventCode', () => {
  test('without adminAuth → 401', async () => {
    const res = await request(app)
      .put(`/api/surveys/${TEST_CODE}`)
      .send({ questions: [{ id: 'q1', type: 'text', label: 'Name?' }] });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with adminAuth + valid questions → 200 { success: true }', async () => {
    const res = await request(app)
      .put(`/api/surveys/${TEST_CODE}`)
      .set(ADMIN_HDR)
      .send({ questions: [{ id: 'q1', type: 'text', label: 'How was the event?' }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('survey');
  });

  test('with adminAuth but missing questions array → 400', async () => {
    const res = await request(app)
      .put(`/api/surveys/${TEST_CODE}`)
      .set(ADMIN_HDR)
      .send({ questions: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ── GET /:eventCode after PUT reflects the saved questions ────────────────────

describe('GET /api/surveys/:eventCode after PUT', () => {
  test('returns the questions that were saved', async () => {
    const questions = [
      { id: 'q1', type: 'text',   label: 'Your name?' },
      { id: 'q2', type: 'choice', label: 'Rating?', options: ['1', '2', '3'] },
    ];

    const put = await request(app)
      .put(`/api/surveys/${TEST_CODE}`)
      .set(ADMIN_HDR)
      .send({ questions });
    expect(put.status).toBe(200);

    const get = await request(app).get(`/api/surveys/${TEST_CODE}`);
    expect(get.status).toBe(200);
    expect(get.body.survey).toHaveProperty('questions');
    expect(get.body.survey.questions).toHaveLength(2);
    expect(get.body.survey.questions[0].id).toBe('q1');
    expect(get.body.survey.questions[1].id).toBe('q2');
  });
});

// ── POST /:eventCode/respond ──────────────────────────────────────────────────

describe('POST /api/surveys/:eventCode/respond', () => {
  test('with valid responses → 200 { success: true }', async () => {
    const res = await request(app)
      .post(`/api/surveys/${TEST_CODE}/respond`)
      .send({ responses: { q1: 'Alice', q2: '5' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('missing responses body → 400', async () => {
    const res = await request(app)
      .post(`/api/surveys/${TEST_CODE}/respond`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ── GET /:eventCode/responses ─────────────────────────────────────────────────

describe('GET /api/surveys/:eventCode/responses', () => {
  test('without adminAuth → 401', async () => {
    const res = await request(app).get(`/api/surveys/${TEST_CODE}/responses`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with adminAuth → 200 { responses, count } matching submitted responses', async () => {
    // Submit two responses
    await request(app)
      .post(`/api/surveys/${TEST_CODE}/respond`)
      .send({ responses: { q1: 'Bob' } });
    await request(app)
      .post(`/api/surveys/${TEST_CODE}/respond`)
      .send({ responses: { q1: 'Carol' }, guestEmail: 'carol@example.com' });

    const res = await request(app)
      .get(`/api/surveys/${TEST_CODE}/responses`)
      .set(ADMIN_HDR);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('responses');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.responses)).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.responses).toHaveLength(2);
  });
});

// ── GET /:eventCode/export ────────────────────────────────────────────────────

describe('GET /api/surveys/:eventCode/export', () => {
  test('without adminAuth → 401', async () => {
    const res = await request(app).get(`/api/surveys/${TEST_CODE}/export`);
    expect(res.status).toBe(401);
  });

  test('with adminAuth → 200 content-type text/csv', async () => {
    // Set up a survey and one response so CSV has content
    await request(app)
      .put(`/api/surveys/${TEST_CODE}`)
      .set(ADMIN_HDR)
      .send({ questions: [{ id: 'q1', type: 'text', label: 'Name?' }] });

    await request(app)
      .post(`/api/surveys/${TEST_CODE}/respond`)
      .send({ responses: { q1: 'Dave' }, guestEmail: 'dave@example.com' });

    const res = await request(app)
      .get(`/api/surveys/${TEST_CODE}/export`)
      .set(ADMIN_HDR);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    // CSV must contain the question label header and the submitted answer
    expect(res.text).toContain('Name?');
    expect(res.text).toContain('Dave');
  });
});
