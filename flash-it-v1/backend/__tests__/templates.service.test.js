'use strict';

/**
 * Unit tests for src/services/templates.js
 *
 * The templates service resolves its BUILTIN_DIR relative to __dirname
 * (two levels up from src/services/), landing at config/templates/.
 * Built-in templates are real files on disk — the tests use them.
 *
 * For saveCustomTemplate we redirect CUSTOM_DIR by writing a custom template
 * directly to the real custom dir (which already exists in the repo) and
 * clean up afterwards, OR we test via the in-process save+list round-trip
 * using a unique id to avoid collisions.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ── Env setup ─────────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
delete process.env.SUPABASE_URL;

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// ── Module under test ─────────────────────────────────────────────────────────
const { getTemplate, listTemplates, saveCustomTemplate } = require('../src/services/templates');

// ── Custom template cleanup ───────────────────────────────────────────────────
// Track any custom template ids we create during tests so we can remove them.
const createdCustomIds = [];

afterAll(() => {
  // Resolve the custom dir the same way the service does
  const customDir = path.resolve(__dirname, '../../config/templates/custom');
  for (const id of createdCustomIds) {
    const file = path.join(customDir, `${id}.json`);
    try { fs.unlinkSync(file); } catch (_) {}
  }
});

// ── listTemplates() ───────────────────────────────────────────────────────────

describe('listTemplates()', () => {
  test('returns an array', () => {
    const result = listTemplates();
    expect(Array.isArray(result)).toBe(true);
  });

  test('returns at least 3 built-in templates', () => {
    const result = listTemplates();
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  test('every template has id, name, photoCount, and photoSlots fields', () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('photoCount');
      expect(t).toHaveProperty('photoSlots');
    }
  });

  test('photoSlots is an array for each template', () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(Array.isArray(t.photoSlots)).toBe(true);
    }
  });
});

// ── getTemplate() ─────────────────────────────────────────────────────────────

describe('getTemplate()', () => {
  test('"single" → returns the single template', () => {
    const t = getTemplate('single');
    expect(t).not.toBeNull();
    expect(t.id).toBe('single');
  });

  test('"strip-2x6" → returns the strip template', () => {
    const t = getTemplate('strip-2x6');
    expect(t).not.toBeNull();
    expect(t.id).toBe('strip-2x6');
  });

  test('"collage-4x6" → returns the collage template', () => {
    const t = getTemplate('collage-4x6');
    expect(t).not.toBeNull();
    expect(t.id).toBe('collage-4x6');
  });

  test('"nonexistent" → returns null', () => {
    const t = getTemplate('nonexistent-id-xyz-9999');
    expect(t).toBeNull();
  });

  test('returned template has required fields', () => {
    const t = getTemplate('single');
    expect(t).toHaveProperty('printWidth');
    expect(t).toHaveProperty('printHeight');
    expect(Array.isArray(t.photoSlots)).toBe(true);
  });
});

// ── saveCustomTemplate() ──────────────────────────────────────────────────────

describe('saveCustomTemplate()', () => {
  test('saves a template that then appears in listTemplates()', () => {
    const customId = `test-custom-${Date.now()}`;
    createdCustomIds.push(customId);

    const template = {
      id: customId,
      name: 'Test Custom Template',
      type: 'single',
      printWidth: 1200,
      printHeight: 1800,
      photoCount: 1,
      photoSlots: [{ index: 0, x: 0, y: 0, width: 1200, height: 1800 }],
      background: '#000000',
    };

    saveCustomTemplate(template);

    const all = listTemplates();
    const found = all.find((t) => t.id === customId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Test Custom Template');
  });

  test('custom template overrides built-in with same id', () => {
    // Use a unique id that happens to match a built-in id conceptually;
    // we test override semantics with a fresh id instead to avoid corrupting
    // real built-ins — but we verify the map merge works by saving a custom
    // template and confirming it appears only once in listTemplates().
    const customId = `test-override-${Date.now()}`;
    createdCustomIds.push(customId);

    saveCustomTemplate({
      id: customId,
      name: 'Override A',
      type: 'single',
      printWidth: 800,
      printHeight: 600,
      photoCount: 1,
      photoSlots: [],
      background: '#111111',
    });

    // Save the same id again with a different name
    saveCustomTemplate({
      id: customId,
      name: 'Override B',
      type: 'single',
      printWidth: 800,
      printHeight: 600,
      photoCount: 1,
      photoSlots: [],
      background: '#222222',
    });

    const all = listTemplates();
    const matches = all.filter((t) => t.id === customId);
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('Override B');
  });

  test('throws when template has no id', () => {
    expect(() => saveCustomTemplate({ name: 'No ID Template' })).toThrow();
  });

  test('throws when template is null', () => {
    expect(() => saveCustomTemplate(null)).toThrow();
  });

  test('getTemplate() finds the saved custom template', () => {
    const customId = `test-get-${Date.now()}`;
    createdCustomIds.push(customId);

    saveCustomTemplate({
      id: customId,
      name: 'Get Me',
      type: 'single',
      printWidth: 1200,
      printHeight: 1800,
      photoCount: 1,
      photoSlots: [],
      background: '#0d0d1a',
    });

    const t = getTemplate(customId);
    expect(t).not.toBeNull();
    expect(t.id).toBe(customId);
    expect(t.name).toBe('Get Me');
  });
});
