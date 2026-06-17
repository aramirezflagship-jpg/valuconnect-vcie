'use strict';

/**
 * Unit tests for src/services/gif.js — createGif
 *
 * gif-encoder-2 and sharp are real (installed) dependencies, so we exercise
 * the actual encoding pipeline using tiny 10×10 JPEG frames created with sharp.
 *
 * If gif-encoder-2 is unexpectedly absent the entire suite is skipped.
 */

process.env.NODE_ENV = 'test';
delete process.env.SUPABASE_URL;

// GIF encoding with sharp resizing to 800×600 is CPU-intensive — each test can
// take 60-120s. Set a generous global timeout for this file so Jest doesn't kill
// them when the suite runs alongside other test files.
jest.setTimeout(300000); // 5 minutes per test in this file

// ── Availability check ────────────────────────────────────────────────────────
let gifEncoderAvailable = true;
try {
  require('gif-encoder-2');
} catch {
  gifEncoderAvailable = false;
}

let sharpAvailable = true;
try {
  require('sharp');
} catch {
  sharpAvailable = false;
}

const canRun = gifEncoderAvailable && sharpAvailable;

// ── Helper: build a tiny 10×10 solid-colour JPEG buffer ──────────────────────
// Require sharp once at module load (not inside the async helper) to avoid
// "require after Jest environment torn down" errors on slow encoding tests.
const sharpLib = sharpAvailable ? require('sharp') : null;

async function makeJpegBuffer(r = 100, g = 100, b = 100) {
  // Create a 10×10 raw RGB buffer filled with the given colour
  const pixels = Buffer.alloc(10 * 10 * 3);
  for (let i = 0; i < pixels.length; i += 3) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  }
  return sharpLib(pixels, { raw: { width: 10, height: 10, channels: 3 } })
    .jpeg()
    .toBuffer();
}

// ── Suite ─────────────────────────────────────────────────────────────────────
const describeFn = canRun ? describe : describe.skip;

describeFn('createGif', () => {
  let createGif;

  beforeAll(() => {
    createGif = require('../src/services/gif').createGif;
  });

  test('returns a Buffer when given 2 valid JPEG frame buffers', async () => {
    const frame1 = await makeJpegBuffer(200, 100, 50);
    const frame2 = await makeJpegBuffer(50, 150, 200);

    const result = await createGif([frame1, frame2], { delay: 200 });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  }, 120000);

  test('result starts with GIF header bytes (GIF89a)', async () => {
    const frame1 = await makeJpegBuffer(255, 0, 0);
    const frame2 = await makeJpegBuffer(0, 255, 0);

    const result = await createGif([frame1, frame2]);

    // GIF89a magic bytes: 47 49 46 38 39 61
    expect(result[0]).toBe(0x47); // G
    expect(result[1]).toBe(0x49); // I
    expect(result[2]).toBe(0x46); // F
  }, 120000);

  test('boomerang: true produces more bytes than boomerang: false (extra frames)', async () => {
    const frame1 = await makeJpegBuffer(255, 0, 0);
    const frame2 = await makeJpegBuffer(0, 255, 0);
    const frame3 = await makeJpegBuffer(0, 0, 255);

    const [noBoomerang, withBoomerang] = await Promise.all([
      createGif([frame1, frame2, frame3], { boomerang: false, delay: 100 }),
      createGif([frame1, frame2, frame3], { boomerang: true, delay: 100 }),
    ]);

    // Boomerang appends reversed inner frames → the GIF data must be larger
    expect(withBoomerang.length).toBeGreaterThan(noBoomerang.length);
  }, 120000);

  test('works with exactly 2 frames (minimum)', async () => {
    const frame1 = await makeJpegBuffer(10, 20, 30);
    const frame2 = await makeJpegBuffer(30, 20, 10);

    await expect(createGif([frame1, frame2])).resolves.toBeInstanceOf(Buffer);
  }, 120000);
});

// ── Skip notice ───────────────────────────────────────────────────────────────
if (!canRun) {
  test('gif.service suite skipped — gif-encoder-2 or sharp not installed', () => {
    console.warn('[gif.service.test] Skipped: missing gif-encoder-2 or sharp');
  });
}
