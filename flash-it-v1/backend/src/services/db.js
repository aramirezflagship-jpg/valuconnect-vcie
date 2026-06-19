'use strict';

/**
 * Database abstraction layer.
 *
 * When SUPABASE_URL is configured: delegates to Supabase (SERVICE_ROLE_KEY,
 * so RLS is bypassed — backend-only use).
 *
 * When SUPABASE_URL is not set: falls back to the JSON file store in
 * src/services/events.js so the demo/local flow keeps working unchanged.
 */

const supabase = require('./supabase');
const jsonStore = require('./events'); // existing file store

const useSupabase = !!process.env.SUPABASE_URL;

// ── Field mapping (Postgres snake_case ↔ jsonStore camelCase) ──────────────────
// The routes (capture.js, events.js) read events/photos in the SAME camelCase
// shape the JSON file store returns (e.g. eventConfig.defaultBackgroundId,
// eventConfig.deliveryChannels, event.event_code). Supabase columns are
// snake_case, so every row we return from a Supabase branch is normalised back
// to that shape. We KEEP the snake_case keys the routes also read directly
// (event_code, account_id, is_demo, status, expires_at, max_guests,
// guest_count, sms_credits_limit, sms_credits_used) so both modes are
// byte-for-byte interchangeable from a caller's point of view.

/**
 * Map a Supabase `events` row → the camelCase shape routes expect.
 * Returns null when given null/undefined.
 * @param {object|null} row
 * @returns {object|null}
 */
function _eventRowToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    event_code: row.event_code,
    account_id: row.account_id || null,
    name: row.name,
    eventName: row.name, // jsonStore exposes both name + eventName
    pin: row.pin || null,
    date: row.date || null,
    venue: row.venue || null,
    logoUrl: row.logo_url || null,
    framePath: row.frame_path || null,
    overlayUrl: row.overlay_url || null,
    brandColor: row.brand_color || '#8b5cf6',
    category: row.category || null,
    themes: row.themes || [],
    backgroundIds: row.background_ids || [],
    defaultBackgroundId: row.default_background_id || null,
    deliveryChannels: row.delivery_channels || ['sms'],
    isActive: row.is_active !== undefined ? row.is_active : true,
    is_demo: row.is_demo === true,
    serviceType: row.service_type || 'solo', // 'managed' | 'solo'
    service_type: row.service_type || 'solo', // snake_case alias for callers reading the column directly
    plan_tier: row.plan_tier || null,
    max_guests: row.max_guests !== undefined ? row.max_guests : null,
    sms_credits_limit: row.sms_credits_limit || 0,
    sms_credits_used: row.sms_credits_used || 0,
    guest_count: row.guest_count || 0,
    expires_at: row.expires_at || null,
    status: row.status || 'active',
    stripe_session_id: row.stripe_session_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

/**
 * Map a camelCase patch (as routes send to updateEvent) → an events column
 * patch. Only keys present in `data` are emitted, so partial updates stay
 * partial. Unknown keys are passed through unchanged (lets callers send raw
 * column names too).
 * @param {object} data
 * @returns {object}
 */
function _eventApiToColumns(data) {
  const map = {
    logoUrl: 'logo_url',
    framePath: 'frame_path',
    overlayUrl: 'overlay_url',
    brandColor: 'brand_color',
    backgroundIds: 'background_ids',
    defaultBackgroundId: 'default_background_id',
    deliveryChannels: 'delivery_channels',
    isActive: 'is_active',
    serviceType: 'service_type',
    eventCode: 'event_code',
    code: 'event_code',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    eventName: 'name',
  };
  // Keys that are NOT real columns and must be dropped on write.
  const drop = new Set(['id', 'pin', 'createdAt', 'updatedAt', 'eventName']);

  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (drop.has(key)) continue;
    const col = map[key] || key;
    out[col] = value;
  }
  return out;
}

/**
 * Map a Supabase `photos` row → camelCase shape (parity with jsonStore photo
 * records the gallery route returns).
 * @param {object} row
 * @returns {object}
 */
function _photoRowToApi(row) {
  if (!row) return row;
  return {
    id: row.id,
    eventId: row.event_id,
    accountId: row.account_id || null,
    mode: row.mode || null,
    backgroundId: row.background_id || null,
    templateId: row.background_id || null,
    photoUrl: row.r2_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    publicId: row.public_id || null,
    themeId: row.theme_id || null,
    guestPhone: row.guest_phone || null,
    deliveredVia: row.delivered_via || null,
    printStatus: row.print_status || 'pending',
    printedAt: row.printed_at || null,
    createdAt: row.created_at || null,
  };
}

// ── Events ────────────────────────────────────────────────────────────────────

/**
 * Retrieve a single event by its id OR event_code.
 * @param {string} eventIdOrCode
 * @returns {object|null}
 */
async function getEvent(eventIdOrCode) {
  if (!useSupabase) return jsonStore.getEvent(eventIdOrCode);

  // Try by primary key first
  const { data: byId } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventIdOrCode)
    .maybeSingle();

  if (byId) return _eventRowToApi(byId);

  // Fall back to event_code lookup (guests use the short code)
  const { data: byCode, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', eventIdOrCode)
    .maybeSingle();

  if (error) console.error('[db] getEvent error:', error.message);
  return _eventRowToApi(byCode);
}

/**
 * Create a new event record.
 * @param {object} data  - Event fields
 * @param {string} [accountId] - Required when using Supabase
 * @returns {object} Created event
 */
async function createEvent(data, accountId) {
  if (!useSupabase) return jsonStore.createEvent(data, accountId);

  // Generate a short alphanumeric event_code if not provided
  const event_code = data.event_code || data.eventCode || data.code || _generateEventCode(data.name);

  // Full column set so a Supabase-mode event matches a jsonStore-mode event.
  // Accept BOTH camelCase (logoUrl, ...) and snake_case (logo_url, ...) inputs.
  const row = {
    id: data.id || event_code,
    event_code,
    account_id: accountId || data.account_id || null,
    name: typeof data.name === 'string' ? data.name.trim() : data.name,
    pin: data.pin || _generatePin(),
    date: data.date || null,
    venue: data.venue || null,
    logo_url: data.logoUrl || data.logo_url || null,
    frame_path: data.framePath || data.frame_path || null,
    brand_color: data.brandColor || data.brand_color || '#8b5cf6',
    category: data.category || null,
    themes: data.themes || [],
    background_ids: data.backgroundIds || data.background_ids || data.themeIds || [],
    default_background_id: data.defaultBackgroundId || data.default_background_id || null,
    delivery_channels: data.deliveryChannels || data.delivery_channels || ['sms'],
    is_active: data.isActive !== undefined ? data.isActive
      : (data.is_active !== undefined ? data.is_active : true),
    is_demo: data.is_demo === true,
    // Product line: 'managed' (Full Service) | 'solo' (self-service). Accept
    // either camelCase or snake_case; default to 'solo' (matches the column default).
    service_type: data.serviceType || data.service_type || 'solo',
    plan_tier: data.plan_tier || null,
    max_guests: data.max_guests !== undefined ? data.max_guests : null,
    sms_credits_limit: data.sms_credits_limit !== undefined ? data.sms_credits_limit : 0,
    sms_credits_used: data.sms_credits_used || 0,
    guest_count: data.guest_count || 0,
    status: data.status || 'active',
    expires_at: data.expires_at || null,
    stripe_session_id: data.stripe_session_id || null,
  };

  const { data: created, error } = await supabase
    .from('events')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[db] createEvent error:', error.message);
    throw new Error(`Failed to create event: ${error.message}`);
  }
  return _eventRowToApi(created);
}

/**
 * Partial-update an event.
 * @param {string} eventId
 * @param {object} data
 * @returns {object} Updated event
 */
async function updateEvent(eventId, data) {
  if (!useSupabase) return jsonStore.updateEvent(eventId, data);

  const patch = _eventApiToColumns(data);

  // Nothing mappable to a real column (e.g. an overlayUrl-only update — there is
  // no overlay_url column in the schema). Avoid an empty SET (invalid SQL) and
  // just return the current row unchanged.
  if (Object.keys(patch).length === 0) {
    return getEvent(eventId);
  }

  const { data: updated, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('[db] updateEvent error:', error.message);
    throw Object.assign(new Error(`Failed to update event: ${error.message}`), { status: 500 });
  }
  return _eventRowToApi(updated);
}

/**
 * Append a photo record to the photos table.
 * @param {string} eventId
 * @param {object} photoData
 * @param {string} [accountId]
 */
async function logPhoto(eventId, photoData, accountId) {
  if (!useSupabase) return jsonStore.logPhoto(eventId, photoData);

  // Persist the full capture.js photoRecord (minus the data-URI qrCode, which
  // is large and regenerated on demand). id == printJobId so print-status
  // updates can find the row by its uuid PK.
  const row = {
    id: photoData.id || undefined, // undefined → let the DB default a uuid
    event_id: eventId,
    account_id: accountId || photoData.accountId || null,
    mode: photoData.mode || null,
    background_id: photoData.backgroundId || photoData.templateId || photoData.background_id || null,
    r2_url: photoData.photoUrl || photoData.r2_url || null,
    thumbnail_url: photoData.thumbnailUrl || photoData.thumbnail_url || null,
    public_id: photoData.publicId || photoData.public_id || null,
    theme_id: photoData.themeId || photoData.theme_id || null,
    guest_phone: photoData.guestPhone || photoData.guest_phone || null,
    delivered_via: photoData.deliveredVia || photoData.delivered_via || 'none',
    print_status: photoData.printStatus || photoData.print_status || 'pending',
  };
  // Drop the id key entirely when not supplied so the column default applies.
  if (row.id === undefined) delete row.id;

  const { error } = await supabase.from('photos').insert(row);
  if (error) console.error('[db] logPhoto error:', error.message);
}

/**
 * Retrieve all photos for an event.
 * @param {string} eventId
 * @returns {object[]}
 */
async function getEventPhotos(eventId) {
  if (!useSupabase) return jsonStore.getEventPhotos(eventId);

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] getEventPhotos error:', error.message);
    return [];
  }
  return (data || []).map(_photoRowToApi);
}

/**
 * Increment the guest_count by 1 for an event.
 * @param {string} eventId
 */
async function incrementGuestCount(eventId) {
  if (!useSupabase) return jsonStore.incrementGuestCount(eventId);

  // Use rpc or raw increment via update + select current value
  const { data: event } = await supabase
    .from('events')
    .select('guest_count')
    .eq('id', eventId)
    .single();

  const newCount = ((event && event.guest_count) || 0) + 1;

  const { error } = await supabase
    .from('events')
    .update({ guest_count: newCount })
    .eq('id', eventId);

  if (error) console.error('[db] incrementGuestCount error:', error.message);
}

/**
 * Increment sms_credits_used by 1 for an event.
 * @param {string} eventId
 */
async function decrementSmsCredits(eventId) {
  if (!useSupabase) return jsonStore.decrementSmsCredits(eventId);

  const { data: event } = await supabase
    .from('events')
    .select('sms_credits_used')
    .eq('id', eventId)
    .single();

  const newUsed = ((event && event.sms_credits_used) || 0) + 1;

  const { error } = await supabase
    .from('events')
    .update({ sms_credits_used: newUsed })
    .eq('id', eventId);

  if (error) console.error('[db] decrementSmsCredits error:', error.message);
}

/**
 * List every event (admin view). camelCase-mapped in Supabase mode.
 * @returns {object[]}
 */
async function listEvents() {
  if (!useSupabase) return jsonStore.listEvents();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] listEvents error:', error.message);
    return [];
  }
  return (data || []).map(_eventRowToApi);
}

/** Alias used by routes/accounts.js (`db.getAllEvents`). */
async function getAllEvents() {
  return listEvents();
}

/**
 * List events owned by a given account.
 * @param {string} accountId
 * @returns {object[]}
 */
async function listEventsByAccount(accountId) {
  if (!useSupabase) return jsonStore.listEventsByAccount(accountId);

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] listEventsByAccount error:', error.message);
    return [];
  }
  return (data || []).map(_eventRowToApi);
}

/**
 * Update a photo's print status by its id (= printJobId / uuid PK).
 * Returns the updated photo (camelCase), or null if not found.
 * @param {string} jobId
 * @param {string} printStatus  - 'pending'|'printed'|'failed'
 * @returns {object|null}
 */
async function updatePhotoPrintStatus(jobId, printStatus) {
  if (!useSupabase) return jsonStore.updatePhotoPrintStatus(jobId, printStatus);

  const { data, error } = await supabase
    .from('photos')
    .update({ print_status: printStatus, printed_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[db] updatePhotoPrintStatus error:', error.message);
    return null;
  }
  return _photoRowToApi(data);
}

// ── Service requests (Full Service leads) ─────────────────────────────────────
// Persists "Request Full Service" form submissions (routes/contact.js). Before
// the service_requests table existed these went to an ephemeral JSON file; in
// Supabase mode they now live in Postgres. In jsonStore (no-Supabase) mode the
// caller keeps using its own file store — these helpers no-op/return [] there so
// the contact route can fall back without throwing.

/**
 * Map a service_requests row → camelCase API shape.
 * @param {object|null} row
 * @returns {object|null}
 */
function _serviceRequestRowToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    eventType: row.event_type || null,
    eventDate: row.event_date || null,
    estimatedGuests: row.estimated_guests != null ? row.estimated_guests : null,
    location: row.location || null,
    message: row.message || null,
    lang: row.lang || null,
    status: row.status || 'new',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

/**
 * Insert a Full Service request. Accepts the camelCase shape the contact route
 * builds (name, email, phone, eventType, eventDate, estimatedGuests, location,
 * message, lang).
 * @param {object} data
 * @returns {object|null} created request (camelCase), or null when not on Supabase
 */
async function createServiceRequest(data) {
  if (!useSupabase) return null;

  const row = {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    event_type: data.eventType || data.event_type || null,
    event_date: data.eventDate || data.event_date || null,
    estimated_guests:
      data.estimatedGuests != null ? data.estimatedGuests
        : (data.estimated_guests != null ? data.estimated_guests : null),
    location: data.location || null,
    message: data.message || null,
    lang: data.lang || null,
    status: data.status || 'new',
  };

  const { data: created, error } = await supabase
    .from('service_requests')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[db] createServiceRequest error:', error.message);
    throw new Error(`Failed to create service request: ${error.message}`);
  }
  return _serviceRequestRowToApi(created);
}

/**
 * List all service requests, newest first.
 * @returns {object[]}
 */
async function listServiceRequests() {
  if (!useSupabase) return [];

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] listServiceRequests error:', error.message);
    return [];
  }
  return (data || []).map(_serviceRequestRowToApi);
}

/**
 * Update a service request's status.
 * @param {string} id
 * @param {string} status  'new'|'contacted'|'won'|'lost'
 * @returns {object|null} updated request (camelCase), or null if not found
 */
async function updateServiceRequestStatus(id, status) {
  if (!useSupabase) return null;

  const { data, error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[db] updateServiceRequestStatus error:', error.message);
    throw new Error(`Failed to update service request: ${error.message}`);
  }
  return _serviceRequestRowToApi(data);
}

// ── Admin aggregates (metrics + customers) ────────────────────────────────────
// Computed efficiently with Supabase HEAD counts where possible (count: 'exact',
// head: true returns only the count, no rows). Larger group-bys pull a slim
// column projection and reduce in JS — fine at this data volume.

/** Exact row count for a table with an optional eq filter; 0 on error/empty. */
async function _count(table, filter) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count, error } = await q;
  if (error) {
    console.error(`[db] _count(${table}) error:`, error.message);
    return 0;
  }
  return count || 0;
}

/**
 * Aggregate metrics for the admin dashboard charts. Returns zeros gracefully
 * when tables are empty. Supabase-only (returns an all-zero shape otherwise).
 * @returns {object}
 */
async function getAdminMetrics() {
  const empty = {
    totals: { events: 0, photos: 0, customers: 0, serviceRequests: 0, newServiceRequests: 0 },
    eventsByServiceType: { managed: 0, solo: 0 },
    accountsByServiceType: { managed: 0, solo: 0, none: 0 },
    photosByMode: { natural: 0, character: 0, unknown: 0 },
    eventsByCategory: {},
    photosByCategory: {},
    eventsTimeseries: [],
    photosTimeseries: [],
    marketing: { optInCount: 0, optInRate: 0 },
  };
  if (!useSupabase) return empty;

  // ── Totals (HEAD counts — no rows transferred) ──────────────────────────────
  const [events, photos, customers, serviceRequests, newServiceRequests] = await Promise.all([
    _count('events'),
    _count('photos'),
    _count('accounts'),
    _count('service_requests'),
    _count('service_requests', { col: 'status', val: 'new' }),
  ]);

  // ── Splits + breakdowns (slim projections, reduced in JS) ───────────────────
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const [evRes, phRes, acRes] = await Promise.all([
    supabase.from('events').select('id, service_type, category, account_id, created_at'),
    supabase.from('photos').select('mode, created_at, event_id'),
    supabase.from('accounts').select('id'),
  ]);

  const evRows = evRes.data || [];
  const phRows = phRes.data || [];

  // events by service_type + category
  const eventsByServiceType = { managed: 0, solo: 0 };
  const eventsByCategory = {};
  // map event_id → {service_type, category} so photos can inherit a category
  const eventMeta = {};
  for (const e of evRows) {
    const st = e.service_type === 'managed' ? 'managed' : 'solo';
    eventsByServiceType[st] += 1;
    const cat = e.category || 'uncategorized';
    eventsByCategory[cat] = (eventsByCategory[cat] || 0) + 1;
    eventMeta[e.id] = { category: cat };
  }

  // photos by mode + (inherited) category
  const photosByMode = { natural: 0, character: 0, unknown: 0 };
  const photosByCategory = {};
  for (const p of phRows) {
    const mode = p.mode === 'natural' ? 'natural' : (p.mode === 'character' ? 'character' : 'unknown');
    photosByMode[mode] += 1;
    const cat = (eventMeta[p.event_id] && eventMeta[p.event_id].category) || 'uncategorized';
    photosByCategory[cat] = (photosByCategory[cat] || 0) + 1;
  }

  // accounts by service_type: derive from the service_type of the account's events.
  // An account is 'managed' if it owns any managed event, else 'solo' if it owns
  // any solo event, else 'none' (no events yet).
  const accountServiceType = {}; // accountId → 'managed' | 'solo'
  for (const e of evRows) {
    if (!e.account_id) continue;
    const st = e.service_type === 'managed' ? 'managed' : 'solo';
    const prev = accountServiceType[e.account_id];
    // 'managed' wins over 'solo'
    if (prev === 'managed') continue;
    accountServiceType[e.account_id] = st;
  }
  const accountsByServiceType = { managed: 0, solo: 0, none: 0 };
  for (const a of (acRes.data || [])) {
    const st = accountServiceType[a.id];
    if (st === 'managed') accountsByServiceType.managed += 1;
    else if (st === 'solo') accountsByServiceType.solo += 1;
    else accountsByServiceType.none += 1;
  }

  // ── Timeseries: last 30 days, dense (zero-filled) ───────────────────────────
  const eventsTimeseries = _denseDailySeries(evRows.map((e) => e.created_at), sinceIso);
  const photosTimeseries = _denseDailySeries(phRows.map((p) => p.created_at), sinceIso);

  // ── Marketing opt-in (best-effort; column may not exist) ────────────────────
  let marketing = { optInCount: 0, optInRate: 0 };
  try {
    const optInCount = await _count('accounts', { col: 'marketing_opt_in', val: true });
    marketing = {
      optInCount,
      optInRate: customers > 0 ? +(optInCount / customers).toFixed(4) : 0,
    };
  } catch (_) {
    // marketing_opt_in column not present — leave zeros.
  }

  return {
    totals: { events, photos, customers, serviceRequests, newServiceRequests },
    eventsByServiceType,
    accountsByServiceType,
    photosByMode,
    eventsByCategory,
    photosByCategory,
    eventsTimeseries,
    photosTimeseries,
    marketing,
  };
}

/**
 * Build a dense day-by-day {date: 'YYYY-MM-DD', count} series for the window
 * [sinceIso, now], zero-filling days with no rows. Inputs are ISO timestamps.
 * @param {string[]} timestamps
 * @param {string} sinceIso
 * @returns {{date: string, count: number}[]}
 */
function _denseDailySeries(timestamps, sinceIso) {
  const counts = {};
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = ts.slice(0, 10); // 'YYYY-MM-DD'
    if (day < sinceIso.slice(0, 10)) continue;
    counts[day] = (counts[day] || 0) + 1;
  }
  const series = [];
  const start = new Date(sinceIso.slice(0, 10) + 'T00:00:00Z');
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    series.push({ date: day, count: counts[day] || 0 });
  }
  return series;
}

/**
 * Enriched customer rows for the admin contact table. One row per account with
 * derived serviceType, event/photo counts, and last-active timestamp. Sorted by
 * createdAt desc. Supabase-only (returns [] otherwise).
 * @returns {object[]}
 */
async function getAdminCustomers() {
  if (!useSupabase) return [];

  const [acRes, evRes, phRes] = await Promise.all([
    supabase.from('accounts').select('id, name, email, role, created_at').order('created_at', { ascending: false }),
    supabase.from('events').select('id, account_id, service_type, created_at'),
    supabase.from('photos').select('account_id, event_id, created_at'),
  ]);

  const accounts = acRes.data || [];
  const events = evRes.data || [];
  const photos = phRes.data || [];

  // event_id → account_id (so photos with a null account_id still attribute to
  // the owning event's account — guest captures have no account session).
  const eventOwner = {};
  for (const e of events) eventOwner[e.id] = e.account_id || null;

  // Per-account aggregation.
  const agg = {}; // accountId → { eventsCount, photosCount, serviceType, lastActiveAt }
  const ensure = (id) => (agg[id] || (agg[id] = { eventsCount: 0, photosCount: 0, serviceType: null, lastActiveAt: null }));
  const bumpLast = (a, ts) => { if (ts && (!a.lastActiveAt || ts > a.lastActiveAt)) a.lastActiveAt = ts; };

  for (const e of events) {
    if (!e.account_id) continue;
    const a = ensure(e.account_id);
    a.eventsCount += 1;
    // 'managed' wins over 'solo' when an account has a mix.
    const st = e.service_type === 'managed' ? 'managed' : 'solo';
    if (a.serviceType !== 'managed') a.serviceType = st;
    bumpLast(a, e.created_at);
  }

  for (const p of photos) {
    const ownerId = p.account_id || eventOwner[p.event_id] || null;
    if (!ownerId) continue;
    const a = ensure(ownerId);
    a.photosCount += 1;
    bumpLast(a, p.created_at);
  }

  return accounts.map((acc) => {
    const a = agg[acc.id] || {};
    return {
      id: acc.id,
      name: acc.name || null,
      email: acc.email,
      role: acc.role || 'customer',
      serviceType: a.serviceType || 'none', // 'managed' | 'solo' | 'none' (no events yet)
      createdAt: acc.created_at || null,
      eventsCount: a.eventsCount || 0,
      photosCount: a.photosCount || 0,
      lastActiveAt: a.lastActiveAt || acc.created_at || null,
    };
  });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

/**
 * Get account record by user id (auth.uid).
 * @param {string} userId
 * @returns {object|null}
 */
async function getAccount(userId) {
  if (!useSupabase) return null;

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) console.error('[db] getAccount error:', error.message);
  return data || null;
}

/**
 * Create an account record linked to a Supabase auth user.
 * @param {string} userId  - auth.uid
 * @param {string} email
 * @param {string} [name]
 * @returns {object} Created account
 */
async function createAccount(userId, email, name) {
  if (!useSupabase) return null;

  const row = {
    id: userId,
    email,
    name: name || email.split('@')[0],
  };

  const { data, error } = await supabase
    .from('accounts')
    .insert(row)
    .select()
    .single();

  if (error) {
    // Unique violation = account already exists; return existing
    if (error.code === '23505') return getAccount(userId);
    console.error('[db] createAccount error:', error.message);
    throw new Error(`Failed to create account: ${error.message}`);
  }
  return data;
}

/**
 * Update account fields.
 * @param {string} userId
 * @param {object} data  - e.g. { name, stripe_customer_id }
 * @returns {object} Updated account
 */
async function updateAccount(userId, data) {
  if (!useSupabase) return null;

  const { data: updated, error } = await supabase
    .from('accounts')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[db] updateAccount error:', error.message);
    throw new Error(`Failed to update account: ${error.message}`);
  }
  return updated;
}

// ── Payments ──────────────────────────────────────────────────────────────────

/**
 * Insert a payment record.
 * @param {object} data
 * @returns {object} Created payment
 */
async function createPaymentRecord(data) {
  if (!useSupabase) return null;

  const row = {
    account_id: data.account_id,
    stripe_session_id: data.stripe_session_id,
    amount_cents: data.amount_cents,
    plan_tier: data.plan_tier,
    event_id: data.event_id || null,
    status: data.status || 'completed',
    customer_email: data.customer_email,
    event_name: data.event_name || null,
  };

  const { data: created, error } = await supabase
    .from('payments')
    .insert(row)
    .select()
    .single();

  if (error) console.error('[db] createPaymentRecord error:', error.message);
  return created || null;
}

/**
 * Get all payment records for an account.
 * @param {string} accountId
 * @returns {object[]}
 */
async function getPaymentHistory(accountId) {
  if (!useSupabase) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] getPaymentHistory error:', error.message);
    return [];
  }
  return data || [];
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * Persist a notification for an account.
 * @param {string} accountId
 * @param {string} type
 * @param {string} title
 * @param {string} body
 * @returns {object|null}
 */
async function saveNotification(accountId, type, title, body) {
  if (!useSupabase) return null;

  const { data, error } = await supabase
    .from('notifications')
    .insert({ account_id: accountId, type, title, body, read: false })
    .select()
    .single();

  if (error) console.error('[db] saveNotification error:', error.message);
  return data || null;
}

/**
 * Retrieve all notifications for an account (newest first).
 * @param {string} accountId
 * @returns {object[]}
 */
async function getNotifications(accountId) {
  if (!useSupabase) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] getNotifications error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Mark a notification as read.
 * Scopes by accountId to prevent cross-account mutation.
 * @param {string} notificationId
 * @param {string} accountId
 * @returns {object|null}
 */
async function markNotificationRead(notificationId, accountId) {
  if (!useSupabase) return null;

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) console.error('[db] markNotificationRead error:', error.message);
  return data || null;
}

// ── Push subscriptions ────────────────────────────────────────────────────────

/**
 * Upsert a push subscription for an account.
 * @param {string} accountId
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @returns {object|null}
 */
async function savePushSubscription(accountId, subscription) {
  if (!useSupabase) return null;

  const row = {
    account_id: accountId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys && subscription.keys.p256dh,
    auth_key: subscription.keys && subscription.keys.auth,
  };

  // Upsert on endpoint uniqueness
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'endpoint' })
    .select()
    .single();

  if (error) console.error('[db] savePushSubscription error:', error.message);
  return data || null;
}

/**
 * Delete a push subscription by endpoint.
 * @param {string} accountId
 * @param {string} endpoint
 */
async function deletePushSubscription(accountId, endpoint) {
  if (!useSupabase) return;

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('account_id', accountId)
    .eq('endpoint', endpoint);

  if (error) console.error('[db] deletePushSubscription error:', error.message);
}

/**
 * Get all push subscriptions for an account.
 * @param {string} accountId
 * @returns {object[]}
 */
async function getPushSubscriptions(accountId) {
  if (!useSupabase) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('account_id', accountId);

  if (error) {
    console.error('[db] getPushSubscriptions error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Get every push subscription (for broadcasting system notifications).
 * @returns {object[]}
 */
async function getAllPushSubscriptions() {
  if (!useSupabase) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error('[db] getAllPushSubscriptions error:', error.message);
    return [];
  }
  return data || [];
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _generateEventCode(name) {
  const { v4: uuidv4 } = require('uuid');
  const slug = (name || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const suffix = uuidv4().slice(0, 6);
  return `${slug}-${suffix}`;
}

/** 6-digit host PIN (parity with events.js _generatePin). */
function _generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  getEvent,
  createEvent,
  updateEvent,
  logPhoto,
  getEventPhotos,
  incrementGuestCount,
  decrementSmsCredits,
  listEvents,
  getAllEvents,
  listEventsByAccount,
  updatePhotoPrintStatus,
  createServiceRequest,
  listServiceRequests,
  updateServiceRequestStatus,
  getAdminMetrics,
  getAdminCustomers,
  getAccount,
  createAccount,
  updateAccount,
  createPaymentRecord,
  getPaymentHistory,
  saveNotification,
  getNotifications,
  markNotificationRead,
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptions,
  getAllPushSubscriptions,
};
