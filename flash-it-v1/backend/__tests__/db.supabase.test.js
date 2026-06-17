'use strict';

/**
 * Unit tests for the Supabase branch of src/services/db.js.
 *
 * We can't reach a live Supabase here, so we mock the service-role client with a
 * tiny chainable query-builder stub. These tests lock in the field mapping
 * (snake_case column <-> camelCase record) and the WIDENED createEvent/logPhoto
 * column sets — i.e. the parts of the Supabase path that can't be exercised on
 * the live jsonStore deploy. The jsonStore path is covered by events.routes /
 * accounts.routes / localAuth tests.
 */

// ── Mock the supabase service-role client BEFORE requiring db.js ─────────────
// The captured state + builder live INSIDE the factory (jest forbids a mock
// factory from closing over non-`mock`-prefixed outer variables). The factory
// hangs them off the mock module so the test can read/reset them.
jest.mock('../src/services/supabase', () => {
  const state = { lastInsert: null, lastUpsert: null, lastUpdate: null, selectResult: null };
  const makeBuilder = () => {
    const builder = {
      insert(row) { state.lastInsert = row; return builder; },
      upsert(row, _opts) { state.lastUpsert = row; return builder; },
      update(patch) { state.lastUpdate = patch; return builder; },
      delete() { return builder; },
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

// db.js gates on SUPABASE_URL — set it so the Supabase branch is taken.
process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role';

const _state = require('../src/services/supabase').__state;
const db = require('../src/services/db');

beforeEach(() => {
  _state.lastInsert = null;
  _state.lastUpsert = null;
  _state.lastUpdate = null;
  _state.selectResult = null;
});

// ── getEvent: row → camelCase shape routes consume ───────────────────────────

describe('db.getEvent (supabase) field mapping', () => {
  test('maps snake_case columns to the camelCase shape capture.js/events.js read', async () => {
    _state.selectResult = {
      id: 'fiesta-abc123',
      event_code: 'fiesta-abc123',
      account_id: 'acc-1',
      name: 'Sofia XV',
      pin: '123456',
      date: '2026-12-31',
      venue: 'Salon Royale',
      logo_url: 'https://r2/logo.png',
      frame_path: 'https://r2/frame.png',
      brand_color: '#ff0066',
      category: 'quinceanera',
      themes: [{ id: 'galaxy' }],
      background_ids: ['seed-natural-fiesta'],
      default_background_id: 'seed-natural-fiesta',
      delivery_channels: ['sms', 'whatsapp'],
      is_active: true,
      is_demo: false,
      plan_tier: 'party',
      max_guests: 100,
      sms_credits_limit: 50,
      sms_credits_used: 3,
      guest_count: 7,
      expires_at: '2027-01-01T00:00:00Z',
      status: 'active',
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-02T00:00:00Z',
    };

    const ev = await db.getEvent('fiesta-abc123');

    // camelCase aliases the routes read
    expect(ev.logoUrl).toBe('https://r2/logo.png');
    expect(ev.framePath).toBe('https://r2/frame.png');
    expect(ev.brandColor).toBe('#ff0066');
    expect(ev.backgroundIds).toEqual(['seed-natural-fiesta']);
    expect(ev.defaultBackgroundId).toBe('seed-natural-fiesta');
    expect(ev.deliveryChannels).toEqual(['sms', 'whatsapp']);
    expect(ev.isActive).toBe(true);
    // snake_case fields the routes ALSO read directly must survive
    expect(ev.event_code).toBe('fiesta-abc123');
    expect(ev.account_id).toBe('acc-1');
    expect(ev.is_demo).toBe(false);
    expect(ev.status).toBe('active');
    expect(ev.expires_at).toBe('2027-01-01T00:00:00Z');
    expect(ev.max_guests).toBe(100);
    expect(ev.guest_count).toBe(7);
    expect(ev.sms_credits_limit).toBe(50);
    expect(ev.sms_credits_used).toBe(3);
  });

  test('null row → null', async () => {
    _state.selectResult = null;
    const ev = await db.getEvent('missing');
    expect(ev).toBeNull();
  });
});

// ── createEvent: widened column set (snake_case) ─────────────────────────────

describe('db.createEvent (supabase) writes the full column set', () => {
  test('camelCase input is written to all snake_case columns', async () => {
    // Echo the inserted row back as the "created" row so the mapper has data.
    _state.selectResult = { id: 'x', event_code: 'x', name: 'Wedding' };

    await db.createEvent(
      {
        name: 'Wedding',
        venue: 'Beach',
        logoUrl: 'https://r2/l.png',
        framePath: 'https://r2/f.png',
        brandColor: '#abcdef',
        category: 'wedding',
        backgroundIds: ['bg1', 'bg2'],
        defaultBackgroundId: 'bg1',
        deliveryChannels: ['sms', 'whatsapp'],
        isActive: true,
        is_demo: false,
        plan_tier: 'celebration',
        max_guests: 200,
        sms_credits_limit: 80,
      },
      'acc-42'
    );

    const row = _state.lastInsert;
    expect(row).toBeTruthy();
    // The columns barry flagged as missing from the original insert:
    expect(row.pin).toBeTruthy();               // 6-digit pin generated
    expect(row.venue).toBe('Beach');
    expect(row.logo_url).toBe('https://r2/l.png');
    expect(row.frame_path).toBe('https://r2/f.png');
    expect(row.brand_color).toBe('#abcdef');
    expect(row.category).toBe('wedding');
    expect(row.background_ids).toEqual(['bg1', 'bg2']);
    expect(row.default_background_id).toBe('bg1');
    expect(row.delivery_channels).toEqual(['sms', 'whatsapp']);
    expect(row.is_active).toBe(true);
    expect(row.is_demo).toBe(false);
    // account_id comes from the positional arg
    expect(row.account_id).toBe('acc-42');
    expect(row.name).toBe('Wedding');
    expect(row.plan_tier).toBe('celebration');
    expect(row.max_guests).toBe(200);
    expect(row.sms_credits_limit).toBe(80);
  });
});

// ── logPhoto: widened column set ─────────────────────────────────────────────

describe('db.logPhoto (supabase) persists the full capture record', () => {
  test('writes id, mode, background_id, public_id, print_status', async () => {
    await db.logPhoto(
      'evt-1',
      {
        id: 'print-job-uuid',
        mode: 'character',
        backgroundId: 'seed-character-fiesta',
        photoUrl: 'https://r2/photo.png',
        thumbnailUrl: 'https://r2/thumb.png',
        publicId: 'pub-123',
        printStatus: 'pending',
        guestPhone: '+15551234567',
      },
      'acc-9'
    );

    const row = _state.lastInsert;
    expect(row.id).toBe('print-job-uuid');
    expect(row.event_id).toBe('evt-1');
    expect(row.account_id).toBe('acc-9');
    expect(row.mode).toBe('character');
    expect(row.background_id).toBe('seed-character-fiesta');
    expect(row.r2_url).toBe('https://r2/photo.png');
    expect(row.thumbnail_url).toBe('https://r2/thumb.png');
    expect(row.public_id).toBe('pub-123');
    expect(row.print_status).toBe('pending');
    expect(row.guest_phone).toBe('+15551234567');
  });

  test('omits id when not supplied so the column default (uuid) applies', async () => {
    await db.logPhoto('evt-2', { photoUrl: 'https://r2/p.png' });
    expect(_state.lastInsert).not.toHaveProperty('id');
    expect(_state.lastInsert.delivered_via).toBe('none');
  });
});

// ── updateEvent: camelCase patch → column patch ──────────────────────────────

describe('db.updateEvent (supabase) maps the patch to columns', () => {
  test('camelCase keys become snake_case columns; non-columns dropped', async () => {
    _state.selectResult = { id: 'evt-3', event_code: 'evt-3', name: 'n' };

    await db.updateEvent('evt-3', {
      defaultBackgroundId: 'bgX',
      deliveryChannels: ['whatsapp'],
      isActive: false,
      pin: 'should-be-dropped',
      id: 'should-be-dropped',
    });

    const patch = _state.lastUpdate;
    expect(patch.default_background_id).toBe('bgX');
    expect(patch.delivery_channels).toEqual(['whatsapp']);
    expect(patch.is_active).toBe(false);
    // immutable / non-column keys must not be written
    expect(patch).not.toHaveProperty('pin');
    expect(patch).not.toHaveProperty('id');
  });
});
