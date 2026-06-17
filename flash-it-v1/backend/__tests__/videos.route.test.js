'use strict';

/**
 * Integration tests for src/routes/videos.js mounted at /api/videos
 *
 * POST /api/videos/upload
 *   multipart/form-data: video (File), eventId (string), duration (number)
 *   Auth: requireAuth (Bearer token)
 *   Returns: { videoUrl, key, duration, eventId }
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup (must precede all project requires) ─────────────────────────────
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.JWT_SECRET   = 'test-jwt-secret-videos';
process.env.ADMIN_SECRET = 'test-admin-secret-videos';
process.env.NODE_ENV     = 'test';
process.env.PORT         = '0';

const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-it-vids-'));
process.env.USERS_STORE_PATH  = path.join(storeDir, 'users.json');
process.env.EVENTS_STORE_PATH = path.join(storeDir, 'events.json');

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/services/supabase', () => null);

jest.mock('../src/services/storage', () => ({
  uploadPhoto: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/test.png',
    publicId: 'test/test.png',
    thumbnailUrl: 'https://r2.example.com/thumb_test.jpg',
  }),
  uploadBuffer: jest.fn().mockResolvedValue('https://r2.example.com/video.webm'),
  getEventPhotos: jest.fn().mockResolvedValue([]),
}));

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// ── App ───────────────────────────────────────────────────────────────────────

const request = require('supertest');
const app     = require('../src/index');

// ── Teardown ──────────────────────────────────────────────────────────────────

afterAll(() => {
  try { fs.rmSync(storeDir, { recursive: true, force: true }); } catch (_) {}
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAuthToken() {
  const email = `video-user-${Date.now()}@test.com`;
  const res = await request(app)
    .post('/api/accounts/register')
    .send({ email, password: 'pass1234', name: 'Video Tester' });

  if (res.status !== 201) {
    throw new Error(`getAuthToken failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.session.access_token;
}

async function createTestEvent(overrides = {}) {
  const res = await request(app)
    .post('/api/events')
    .set('X-Admin-Secret', 'test-admin-secret-videos')
    .send({ name: 'Video Test Event', date: '2026-12-31', ...overrides });

  if (res.status !== 201) {
    throw new Error(`createTestEvent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

const fakeVideo = Buffer.from('fake-video-content-webm');

// ── POST /api/videos/upload ───────────────────────────────────────────────────

describe('POST /api/videos/upload', () => {
  let token;
  let eventId;

  beforeAll(async () => {
    token = await getAuthToken();
    const event = await createTestEvent();
    eventId = event.id;
  });

  test('without auth → 401', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .attach('video', fakeVideo, { filename: 'test.webm', contentType: 'video/webm' })
      .field('eventId', 'some-event-id')
      .field('duration', '10');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + no file → 400 { error: "No video file provided." }', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('eventId', eventId)
      .field('duration', '10');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No video file provided.');
  });

  test('with auth + non-video file (image/jpeg) → 400 { error: "Only video files are accepted." }', async () => {
    const fakeImage = Buffer.from('fake-jpeg-bytes');
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeImage, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('eventId', eventId)
      .field('duration', '5');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Only video files are accepted.');
  });

  test('with auth + video file + missing eventId → 400', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeVideo, { filename: 'test.webm', contentType: 'video/webm' })
      .field('duration', '10');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + video file + unknown eventId → 404', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeVideo, { filename: 'test.webm', contentType: 'video/webm' })
      .field('eventId', 'does-not-exist-abc')
      .field('duration', '10');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('with auth + video file + valid eventId → 201 + { videoUrl, key, duration, eventId }', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeVideo, { filename: 'test.webm', contentType: 'video/webm' })
      .field('eventId', eventId)
      .field('duration', '10');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('videoUrl');
    expect(res.body).toHaveProperty('key');
    expect(res.body).toHaveProperty('duration');
    expect(res.body).toHaveProperty('eventId', eventId);
    expect(typeof res.body.videoUrl).toBe('string');
    expect(res.body.videoUrl).toMatch(/^https?:\/\//);
  });

  test('duration is coerced to a number in the response', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeVideo, { filename: 'clip.webm', contentType: 'video/webm' })
      .field('eventId', eventId)
      .field('duration', '42.5');

    expect(res.status).toBe(201);
    expect(typeof res.body.duration).toBe('number');
    expect(res.body.duration).toBe(42.5);
  });

  test('mp4 file (video/mp4) is also accepted → 201', async () => {
    const fakeMp4 = Buffer.from('fake-mp4-bytes');
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeMp4, { filename: 'clip.mp4', contentType: 'video/mp4' })
      .field('eventId', eventId)
      .field('duration', '5');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('videoUrl');
  });

  test('key includes eventId as a path segment', async () => {
    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('video', fakeVideo, { filename: 'keyed.webm', contentType: 'video/webm' })
      .field('eventId', eventId)
      .field('duration', '3');

    expect(res.status).toBe(201);
    expect(res.body.key).toContain(eventId);
  });
});
