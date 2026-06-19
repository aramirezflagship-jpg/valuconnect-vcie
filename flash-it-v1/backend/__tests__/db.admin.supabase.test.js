'use strict';

/**
 * Unit tests for the Supabase branch of the admin dashboard data layer in
 * src/services/db.js: service_requests CRUD, getAdminMetrics, getAdminCustomers,
 * and the events service_type field mapping.
 *
 * We can't reach a live Supabase, so we mock the service-role client with a
 * chainable builder that:
 *   - records the last insert/update per table,
 *   - returns per-table seeded rows for select() (resolved via thenable),
 *   - returns a seeded count for head/count queries.
 * The mock state hangs off the mock module (jest forbids closing over non-`mock`
 * prefixed outer vars in a factory).
 */

jest.mock('../src/services/supabase', () => {
  const state = {
    rowsByTable: {},   // table → array of rows returned by select()
    countByKey: {},    // `${table}` or `${table}:${col}=${val}` → number
    lastInsert: {},    // table → row
    lastUpdate: {},    // table → patch
  };

  const makeBuilder = (table) => {
    let isHeadCount = false;
    let eqCol = null;
    let eqVal = null;
    const ctx = {};

    const builder = {
      insert(row) { state.lastInsert[table] = row; ctx.lastInsert = row; return builder; },
      update(patch) { state.lastUpdate[table] = patch; ctx.lastUpdate = patch; return builder; },
      delete() { return builder; },
      select(_cols, opts) { if (opts && opts.head) isHeadCount = true; return builder; },
      eq(col, val) { eqCol = col; eqVal = val; return builder; },
      order() { return builder; },
      single() { return Promise.resolve({ data: ctx.lastInsert || ctx.lastUpdate || (state.rowsByTable[table] || [])[0] || null, error: null }); },
      maybeSingle() { return Promise.resolve({ data: ctx.lastUpdate || ctx.lastInsert || (state.rowsByTable[table] || [])[0] || null, error: null }); },
      then(resolve) {
        if (isHeadCount) {
          const key = eqCol ? `${table}:${eqCol}=${eqVal}` : `${table}`;
          const count = state.countByKey[key] != null ? state.countByKey[key] : 0;
          return Promise.resolve({ data: null, count, error: null }).then(resolve);
        }
        let rows = state.rowsByTable[table] || [];
        if (eqCol) rows = rows.filter((r) => r[eqCol] === eqVal);
        return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve);
      },
    };
    return builder;
  };

  return { from: (table) => makeBuilder(table), __state: state };
});

process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role';

const _state = require('../src/services/supabase').__state;
const db = require('../src/services/db');

beforeEach(() => {
  _state.rowsByTable = {};
  _state.countByKey = {};
  _state.lastInsert = {};
  _state.lastUpdate = {};
});

// ── service_requests CRUD + mapping ───────────────────────────────────────────

describe('db.createServiceRequest (supabase)', () => {
  test('camelCase input → snake_case columns; coerces guests', async () => {
    _state.rowsByTable.service_requests = []; // single() reads lastInsert
    await db.createServiceRequest({
      name: 'Maria Lopez',
      email: 'maria@example.com',
      phone: '+13055550100',
      eventType: 'quinceanera',
      eventDate: '2026-09-12',
      estimatedGuests: 120,
      location: 'Miami, FL',
      message: 'XV',
      lang: 'es',
    });

    const row = _state.lastInsert.service_requests;
    expect(row.name).toBe('Maria Lopez');
    expect(row.email).toBe('maria@example.com');
    expect(row.event_type).toBe('quinceanera');
    expect(row.event_date).toBe('2026-09-12');
    expect(row.estimated_guests).toBe(120);
    expect(row.location).toBe('Miami, FL');
    expect(row.lang).toBe('es');
    expect(row.status).toBe('new');
  });
});

describe('db.listServiceRequests (supabase) maps rows → camelCase', () => {
  test('row → API shape', async () => {
    _state.rowsByTable.service_requests = [{
      id: 'sr-1',
      name: 'Maria',
      email: 'maria@example.com',
      phone: null,
      event_type: 'wedding',
      event_date: '2026-10-01',
      estimated_guests: 80,
      location: 'Tampa',
      message: 'hi',
      lang: 'en',
      status: 'new',
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    }];

    const list = await db.listServiceRequests();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'sr-1',
      eventType: 'wedding',
      eventDate: '2026-10-01',
      estimatedGuests: 80,
      location: 'Tampa',
      status: 'new',
      createdAt: '2026-06-01T00:00:00Z',
    });
  });
});

describe('db.updateServiceRequestStatus (supabase)', () => {
  test('writes the status patch', async () => {
    _state.rowsByTable.service_requests = [{ id: 'sr-1', status: 'contacted' }];
    await db.updateServiceRequestStatus('sr-1', 'contacted');
    expect(_state.lastUpdate.service_requests).toEqual({ status: 'contacted' });
  });
});

// ── events service_type mapping ───────────────────────────────────────────────

describe('events service_type mapping', () => {
  test('createEvent defaults service_type to solo; accepts override', async () => {
    _state.rowsByTable.events = [{ id: 'e', event_code: 'e', name: 'n' }];
    await db.createEvent({ name: 'Solo Event' }, 'acc-1');
    expect(_state.lastInsert.events.service_type).toBe('solo');

    await db.createEvent({ name: 'Managed Event', serviceType: 'managed' }, null);
    expect(_state.lastInsert.events.service_type).toBe('managed');
  });

  test('row → api exposes both serviceType and service_type', async () => {
    _state.rowsByTable.events = [{ id: 'e1', event_code: 'e1', name: 'X', service_type: 'managed' }];
    const ev = await db.getEvent('e1');
    expect(ev.serviceType).toBe('managed');
    expect(ev.service_type).toBe('managed');
  });

  test('updateEvent maps serviceType → service_type column', async () => {
    _state.rowsByTable.events = [{ id: 'e1', event_code: 'e1', name: 'X' }];
    await db.updateEvent('e1', { serviceType: 'managed' });
    expect(_state.lastUpdate.events.service_type).toBe('managed');
  });
});

// ── getAdminMetrics ───────────────────────────────────────────────────────────

describe('db.getAdminMetrics (supabase)', () => {
  test('aggregates totals, splits, breakdowns, and timeseries', async () => {
    // HEAD counts
    _state.countByKey['events'] = 3;
    _state.countByKey['photos'] = 5;
    _state.countByKey['accounts'] = 2;
    _state.countByKey['service_requests'] = 4;
    _state.countByKey['service_requests:status=new'] = 1;
    _state.countByKey['accounts:marketing_opt_in=true'] = 0;

    const today = new Date().toISOString();
    _state.rowsByTable.events = [
      { id: 'e1', service_type: 'managed', category: 'wedding', account_id: 'acc-1', created_at: today },
      { id: 'e2', service_type: 'solo', category: 'birthday', account_id: 'acc-2', created_at: today },
      { id: 'e3', service_type: 'solo', category: 'wedding', account_id: null, created_at: today },
    ];
    _state.rowsByTable.photos = [
      { mode: 'natural', event_id: 'e1', created_at: today },
      { mode: 'character', event_id: 'e1', created_at: today },
      { mode: 'natural', event_id: 'e2', created_at: today },
      { mode: 'natural', event_id: 'e3', created_at: today },
      { mode: null, event_id: 'e3', created_at: today },
    ];
    _state.rowsByTable.accounts = [{ id: 'acc-1' }, { id: 'acc-2' }];

    const m = await db.getAdminMetrics();

    expect(m.totals).toEqual({ events: 3, photos: 5, customers: 2, serviceRequests: 4, newServiceRequests: 1 });
    expect(m.eventsByServiceType).toEqual({ managed: 1, solo: 2 });
    // acc-1 owns a managed event → managed; acc-2 owns a solo → solo
    expect(m.accountsByServiceType).toEqual({ managed: 1, solo: 1, none: 0 });
    expect(m.photosByMode).toEqual({ natural: 3, character: 1, unknown: 1 });
    expect(m.eventsByCategory).toEqual({ wedding: 2, birthday: 1 });
    // photos inherit their event's category: e1(wedding) 2 + e3(wedding) 2 = 4; e2(birthday) 1
    expect(m.photosByCategory).toEqual({ wedding: 4, birthday: 1 });
    // timeseries: dense arrays ending today, today's bucket carries the counts
    expect(m.eventsTimeseries[m.eventsTimeseries.length - 1].count).toBe(3);
    expect(m.photosTimeseries[m.photosTimeseries.length - 1].count).toBe(5);
    expect(m.marketing).toEqual({ optInCount: 0, optInRate: 0 });
  });
});

// ── getAdminCustomers ─────────────────────────────────────────────────────────

describe('db.getAdminCustomers (supabase)', () => {
  test('enriches accounts with derived serviceType + counts + lastActiveAt', async () => {
    _state.rowsByTable.accounts = [
      { id: 'acc-1', name: 'Ana', email: 'ana@x.com', role: 'customer', created_at: '2026-06-10T00:00:00Z' },
      { id: 'acc-2', name: 'Bob', email: 'bob@x.com', role: 'customer', created_at: '2026-06-01T00:00:00Z' },
    ];
    _state.rowsByTable.events = [
      { id: 'e1', account_id: 'acc-1', service_type: 'managed', created_at: '2026-06-12T00:00:00Z' },
      { id: 'e2', account_id: 'acc-2', service_type: 'solo', created_at: '2026-06-02T00:00:00Z' },
    ];
    _state.rowsByTable.photos = [
      { account_id: 'acc-1', event_id: 'e1', created_at: '2026-06-13T00:00:00Z' },
      { account_id: null, event_id: 'e2', created_at: '2026-06-03T00:00:00Z' }, // guest capture → attributed via event owner
    ];

    const customers = await db.getAdminCustomers();
    const ana = customers.find((c) => c.id === 'acc-1');
    const bob = customers.find((c) => c.id === 'acc-2');

    expect(ana).toMatchObject({
      serviceType: 'managed',
      eventsCount: 1,
      photosCount: 1,
      lastActiveAt: '2026-06-13T00:00:00Z', // latest of event/photo
    });
    expect(bob).toMatchObject({
      serviceType: 'solo',
      eventsCount: 1,
      photosCount: 1, // guest photo attributed via eventOwner map
      lastActiveAt: '2026-06-03T00:00:00Z',
    });
  });

  test('account with no events → serviceType none', async () => {
    _state.rowsByTable.accounts = [
      { id: 'acc-3', name: 'Cy', email: 'cy@x.com', role: 'customer', created_at: '2026-06-05T00:00:00Z' },
    ];
    _state.rowsByTable.events = [];
    _state.rowsByTable.photos = [];

    const customers = await db.getAdminCustomers();
    expect(customers[0]).toMatchObject({ serviceType: 'none', eventsCount: 0, photosCount: 0 });
  });
});
