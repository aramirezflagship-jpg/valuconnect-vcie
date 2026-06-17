'use strict';

/**
 * Unit tests for the Supabase branch of src/services/backgrounds.js.
 *
 * Mocks the service-role client (no live Supabase available). Locks in:
 *   - the snake_case column <-> camelCase record mapping (thumbnailUrl, faceSlot)
 *   - createBackground using UPSERT(onConflict id) so the seed endpoint backfills
 *     the rows 0002_seed.sql created with url = NULL (work item 5).
 */

jest.mock('../src/services/supabase', () => {
  const state = { lastUpsert: null, upsertOpts: null, selectResult: null };
  const makeBuilder = () => {
    const builder = {
      upsert(row, opts) { state.lastUpsert = row; state.upsertOpts = opts; return builder; },
      select() { return builder; },
      eq() { return builder; },
      order() { return builder; },
      single() { return Promise.resolve({ data: state.selectResult, error: null }); },
      maybeSingle() { return Promise.resolve({ data: state.selectResult, error: null }); },
      then(resolve) { return Promise.resolve({ data: state.selectResult, error: null }).then(resolve); },
    };
    return builder;
  };
  return { from: () => makeBuilder(), __state: state };
});

// backgrounds.js gates on SUPABASE_URL + SERVICE_ROLE_KEY.
process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role';

const _state = require('../src/services/supabase').__state;
const backgrounds = require('../src/services/backgrounds');

beforeEach(() => {
  _state.lastUpsert = null;
  _state.upsertOpts = null;
  _state.selectResult = null;
});

describe('backgrounds.createBackground (supabase)', () => {
  test('uses UPSERT on id (so seed rows with url=NULL get backfilled)', async () => {
    _state.selectResult = {
      id: 'seed-character-fiesta',
      category: 'fiesta',
      mode: 'character',
      name: 'Fiesta Character (seed)',
      url: 'https://r2/art.png',
      thumbnail_url: 'https://r2/thumb.png',
      face_slot: { x: 360, y: 216, width: 480, height: 600, shape: 'oval' },
      r2_key: 'flash-it/backgrounds/fiesta/seed-character-fiesta.png',
      account_id: null,
      created_at: '2026-06-01T00:00:00Z',
    };

    const rec = await backgrounds.createBackground({
      id: 'seed-character-fiesta',
      category: 'fiesta',
      mode: 'character',
      name: 'Fiesta Character (seed)',
      url: 'https://r2/art.png',
      thumbnailUrl: 'https://r2/thumb.png',
      faceSlot: { x: 360, y: 216, width: 480, height: 600, shape: 'oval' },
      r2Key: 'flash-it/backgrounds/fiesta/seed-character-fiesta.png',
    });

    // It must UPSERT (not plain insert) and conflict-target the id PK.
    expect(_state.lastUpsert).toBeTruthy();
    expect(_state.upsertOpts).toEqual({ onConflict: 'id' });

    // camelCase input mapped to snake_case columns
    const row = _state.lastUpsert;
    expect(row.id).toBe('seed-character-fiesta');
    expect(row.thumbnail_url).toBe('https://r2/thumb.png');
    expect(row.face_slot).toEqual({ x: 360, y: 216, width: 480, height: 600, shape: 'oval' });
    expect(row.r2_key).toBe('flash-it/backgrounds/fiesta/seed-character-fiesta.png');

    // returned record mapped back to camelCase the routes read
    expect(rec.thumbnailUrl).toBe('https://r2/thumb.png');
    expect(rec.faceSlot).toEqual({ x: 360, y: 216, width: 480, height: 600, shape: 'oval' });
    expect(rec.mode).toBe('character');
  });
});

describe('backgrounds.getBackground (supabase) mapping', () => {
  test('null row → null', async () => {
    _state.selectResult = null;
    expect(await backgrounds.getBackground('nope')).toBeNull();
  });

  test('maps a natural row (no face slot) to camelCase', async () => {
    _state.selectResult = {
      id: 'seed-natural-fiesta',
      category: 'fiesta',
      mode: 'natural',
      name: 'Fiesta Frame (seed)',
      url: 'https://r2/frame.png',
      thumbnail_url: null,
      face_slot: null,
      r2_key: 'k',
      account_id: null,
      created_at: '2026-06-01T00:00:00Z',
    };

    const rec = await backgrounds.getBackground('seed-natural-fiesta');
    expect(rec.id).toBe('seed-natural-fiesta');
    expect(rec.mode).toBe('natural');
    expect(rec.faceSlot).toBeNull();
    // thumbnailUrl falls back to url when the column is null (parity w/ jsonStore)
    expect(rec.thumbnailUrl).toBe('https://r2/frame.png');
  });
});
