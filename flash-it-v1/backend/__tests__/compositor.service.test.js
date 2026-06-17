'use strict';

/**
 * Unit tests for src/services/compositor.js
 *
 * sharp is mocked to avoid actual image-processing work.
 * All tests run synchronously fast (no CPU-intensive compositing).
 */

// ── sharp mock ────────────────────────────────────────────────────────────────
// Must be hoisted above any require() — jest.mock is hoisted by Babel/Jest.
jest.mock('sharp', () => {
  const mockInstance = {
    resize:    jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    png:       jest.fn().mockReturnThis(),
    jpeg:      jest.fn().mockReturnThis(),
    toBuffer:  jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  };
  const sharp = jest.fn(() => mockInstance);
  sharp.mockInstance = mockInstance;
  return sharp;
});

// ── Env setup ─────────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
delete process.env.SUPABASE_URL;

// Silence compositor log noise
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// ── Module under test ─────────────────────────────────────────────────────────
const { compose, composeStrip } = require('../src/services/compositor');

// ── Template fixtures ─────────────────────────────────────────────────────────
const singleTemplate = {
  id: 'single',
  type: 'single',
  printWidth: 1200,
  printHeight: 1800,
  photoCount: 1,
  photoSlots: [{ index: 0, x: 60, y: 60, width: 1080, height: 1530 }],
  textSlot: { x: 60, y: 1660, maxWidth: 820, fontSize: 28, color: '#ffffff' },
  background: '#0d0d1a',
};

const stripTemplate = {
  id: 'strip-2x6',
  type: 'strip',
  printWidth: 600,
  printHeight: 1800,
  photoCount: 4,
  photoSlots: [
    { index: 0, x: 30, y: 30,   width: 540, height: 370 },
    { index: 1, x: 30, y: 430,  width: 540, height: 370 },
    { index: 2, x: 30, y: 830,  width: 540, height: 370 },
    { index: 3, x: 30, y: 1230, width: 540, height: 370 },
  ],
  textSlot: { x: 30, y: 1660, maxWidth: 340, fontSize: 20, color: '#ffffff' },
  background: '#0d0d1a',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fakePhoto = () => Buffer.from('fake-photo-bytes');

beforeEach(() => {
  // Reset call counts so tests are independent
  jest.clearAllMocks();
});

// ── compose() ─────────────────────────────────────────────────────────────────

describe('compose()', () => {
  test('1 photo + "single" template → returns a Buffer', async () => {
    const result = await compose([fakePhoto()], singleTemplate);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('4 photos + "strip-2x6" template → returns a Buffer', async () => {
    const photos = [fakePhoto(), fakePhoto(), fakePhoto(), fakePhoto()];
    const result = await compose(photos, stripTemplate);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('wrong photo count (0 photos for single-slot template) → returns a Buffer gracefully', async () => {
    // The compositor skips missing slots with a console.warn; it does NOT throw.
    // This documents that behavior — the call must resolve to a Buffer.
    const result = await compose([], singleTemplate);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('options.eventName included → function runs without error', async () => {
    const result = await compose([fakePhoto()], singleTemplate, {
      eventName: 'Summer Party 2026',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('options.eventName with special chars (SVG-safe) → function runs without error', async () => {
    const result = await compose([fakePhoto()], singleTemplate, {
      eventName: 'Alice & Bob <Big> "Event"',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('options.textColor overrides template textSlot color → function runs without error', async () => {
    const result = await compose([fakePhoto()], singleTemplate, {
      eventName: 'Color Test',
      textColor: '#ff0000',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('options.backgroundColor overrides template background → function runs without error', async () => {
    const result = await compose([fakePhoto()], singleTemplate, {
      backgroundColor: '#ffffff',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('options.eventLogoBuffer provided → function runs without error', async () => {
    const logoBuffer = Buffer.from('fake-logo-bytes');
    const templateWithLogo = {
      ...singleTemplate,
      logoSlot: { x: 900, y: 1640, width: 240, height: 100 },
    };
    const result = await compose([fakePhoto()], templateWithLogo, {
      eventLogoBuffer: logoBuffer,
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

// ── composeStrip() ────────────────────────────────────────────────────────────

describe('composeStrip()', () => {
  test('strip template → returns a Buffer', async () => {
    const photos = [fakePhoto(), fakePhoto(), fakePhoto(), fakePhoto()];
    const result = await composeStrip(photos, stripTemplate);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('non-strip template → delegates to compose() and returns a Buffer', async () => {
    // When template.type !== 'strip', composeStrip falls through to compose()
    const result = await composeStrip([fakePhoto()], singleTemplate);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('strip template with eventName option → function runs without error', async () => {
    const photos = [fakePhoto(), fakePhoto(), fakePhoto(), fakePhoto()];
    const result = await composeStrip(photos, stripTemplate, {
      eventName: 'Strip Event',
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
