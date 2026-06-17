'use strict';

/**
 * Unit tests for src/services/analytics.js
 *
 * analytics.js hard-codes its store path relative to __dirname, so we intercept
 * `fs.writeFileSync` / `fs.readFileSync` / `fs.existsSync` / `fs.mkdirSync`
 * with a jest mock backed by an in-memory map — no disk I/O, fully isolated.
 */

process.env.NODE_ENV = 'test';
delete process.env.SUPABASE_URL;

// ── In-memory FS mock ─────────────────────────────────────────────────────────
// We mock the entire 'fs' module so analytics.js never touches a real file.
// NOTE: jest.mock factory variables must be prefixed with "mock" (case-insensitive)
// to be accessible inside the factory closure — Jest enforces this at compile time.
const mockMemStore = new Map();

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: (p) => {
      // Allow temp-dir operations from other modules to pass through
      if (p.includes('analytics.json')) return mockMemStore.has(p);
      return actualFs.existsSync(p);
    },
    readFileSync: (p, enc) => {
      if (p.includes('analytics.json')) {
        if (!mockMemStore.has(p)) throw new Error(`ENOENT: no such file: ${p}`);
        return mockMemStore.get(p);
      }
      return actualFs.readFileSync(p, enc);
    },
    writeFileSync: (p, data) => {
      if (p.includes('analytics.json')) {
        mockMemStore.set(p, data);
        return;
      }
      actualFs.writeFileSync(p, data);
    },
    mkdirSync: (p, opts) => {
      // No-op for the config dir that analytics.js tries to create
      if (p.includes('config')) return;
      actualFs.mkdirSync(p, opts);
    },
  };
});

// ── Module under test (require AFTER mock) ────────────────────────────────────
const { trackSession, getEventAnalytics, getAllAnalytics } = require('../src/services/analytics');

// ── Reset the in-memory store before every test ───────────────────────────────
beforeEach(() => {
  mockMemStore.clear();
});

// ── trackSession ──────────────────────────────────────────────────────────────

describe('trackSession', () => {
  test('creates an entry for a new eventId', () => {
    trackSession('evt-001', 'qr', null);
    const data = getEventAnalytics('evt-001');
    expect(data).toBeDefined();
    expect(data.sessions).toBe(1);
  });

  test('increments sessions count on successive calls', () => {
    trackSession('evt-002', 'qr', null);
    trackSession('evt-002', 'qr', null);
    trackSession('evt-002', 'qr', null);
    expect(getEventAnalytics('evt-002').sessions).toBe(3);
  });

  test('records delivery method breakdown correctly', () => {
    trackSession('evt-003', 'email', 'a@example.com');
    trackSession('evt-003', 'email', 'b@example.com');
    trackSession('evt-003', 'sms', '+15551234567');
    trackSession('evt-003', 'qr', null);

    const data = getEventAnalytics('evt-003');
    expect(data.byMethod.email).toBe(2);
    expect(data.byMethod.sms).toBe(1);
    expect(data.byMethod.qr).toBe(1);
  });

  test('adds guestEmail for email method', () => {
    trackSession('evt-004', 'email', 'guest@example.com');
    const data = getEventAnalytics('evt-004');
    expect(data.guestEmails).toContain('guest@example.com');
  });

  test('does not duplicate the same guestEmail', () => {
    trackSession('evt-005', 'email', 'repeat@example.com');
    trackSession('evt-005', 'email', 'repeat@example.com');
    const data = getEventAnalytics('evt-005');
    expect(data.guestEmails.filter((e) => e === 'repeat@example.com').length).toBe(1);
  });

  test('adds guestPhone for sms method', () => {
    trackSession('evt-006', 'sms', '+15559876543');
    const data = getEventAnalytics('evt-006');
    expect(data.guestPhones).toContain('+15559876543');
  });

  test('does not duplicate the same guestPhone', () => {
    trackSession('evt-007', 'sms', '+15550000001');
    trackSession('evt-007', 'sms', '+15550000001');
    const data = getEventAnalytics('evt-007');
    expect(data.guestPhones.filter((p) => p === '+15550000001').length).toBe(1);
  });

  test('does not add phone to guestEmails or email to guestPhones', () => {
    trackSession('evt-008', 'email', 'only@email.com');
    trackSession('evt-008', 'sms', '+15550001111');
    const data = getEventAnalytics('evt-008');
    expect(data.guestPhones).not.toContain('only@email.com');
    expect(data.guestEmails).not.toContain('+15550001111');
  });
});

// ── getEventAnalytics ─────────────────────────────────────────────────────────

describe('getEventAnalytics', () => {
  test('returns zero-value structure for an unknown eventId', () => {
    const data = getEventAnalytics('evt-does-not-exist');
    expect(data).toEqual({
      sessions: 0,
      byMethod: {},
      guestEmails: [],
      guestPhones: [],
    });
  });

  test('returns the accumulated data for a known eventId', () => {
    trackSession('evt-known', 'qr', null);
    const data = getEventAnalytics('evt-known');
    expect(data.sessions).toBe(1);
  });
});

// ── getAllAnalytics ────────────────────────────────────────────────────────────

describe('getAllAnalytics', () => {
  test('returns an empty object when no sessions have been tracked', () => {
    const all = getAllAnalytics();
    expect(typeof all).toBe('object');
    expect(Object.keys(all).length).toBe(0);
  });

  test('returns an object containing all tracked eventIds', () => {
    trackSession('multi-a', 'qr', null);
    trackSession('multi-b', 'email', 'x@example.com');

    const all = getAllAnalytics();
    expect(all).toHaveProperty('multi-a');
    expect(all).toHaveProperty('multi-b');
  });

  test('each entry in getAllAnalytics matches getEventAnalytics for that id', () => {
    trackSession('cross-check', 'sms', '+10000000000');
    const all = getAllAnalytics();
    const individual = getEventAnalytics('cross-check');
    expect(all['cross-check']).toEqual(individual);
  });
});
