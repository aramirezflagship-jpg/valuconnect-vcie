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

  if (byId) return byId;

  // Fall back to event_code lookup (guests use the short code)
  const { data: byCode, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', eventIdOrCode)
    .maybeSingle();

  if (error) console.error('[db] getEvent error:', error.message);
  return byCode || null;
}

/**
 * Create a new event record.
 * @param {object} data  - Event fields
 * @param {string} [accountId] - Required when using Supabase
 * @returns {object} Created event
 */
async function createEvent(data, accountId) {
  if (!useSupabase) return jsonStore.createEvent(data);

  const { v4: uuidv4 } = require('uuid');

  // Generate a short alphanumeric event_code if not provided
  const event_code = data.event_code || _generateEventCode(data.name);

  const row = {
    id: data.id || event_code,
    event_code,
    account_id: accountId || data.account_id || null,
    name: data.name,
    date: data.date || null,
    plan_tier: data.plan_tier || null,
    max_guests: data.max_guests !== undefined ? data.max_guests : null,
    sms_credits_limit: data.sms_credits_limit !== undefined ? data.sms_credits_limit : 0,
    sms_credits_used: data.sms_credits_used || 0,
    guest_count: data.guest_count || 0,
    themes: data.themes || null,
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
  return created;
}

/**
 * Partial-update an event.
 * @param {string} eventId
 * @param {object} data
 * @returns {object} Updated event
 */
async function updateEvent(eventId, data) {
  if (!useSupabase) return jsonStore.updateEvent(eventId, data);

  const { data: updated, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('[db] updateEvent error:', error.message);
    throw Object.assign(new Error(`Failed to update event: ${error.message}`), { status: 500 });
  }
  return updated;
}

/**
 * Append a photo record to the photos table.
 * @param {string} eventId
 * @param {object} photoData
 * @param {string} [accountId]
 */
async function logPhoto(eventId, photoData, accountId) {
  if (!useSupabase) return jsonStore.logPhoto(eventId, photoData);

  const row = {
    event_id: eventId,
    account_id: accountId || photoData.accountId || null,
    r2_url: photoData.photoUrl || photoData.r2_url || null,
    thumbnail_url: photoData.thumbnailUrl || photoData.thumbnail_url || null,
    theme_id: photoData.themeId || photoData.theme_id || null,
    guest_phone: photoData.guestPhone || photoData.guest_phone || null,
    delivered_via: photoData.deliveredVia || photoData.delivered_via || null,
  };

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
  return data || [];
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

module.exports = {
  getEvent,
  createEvent,
  updateEvent,
  logPhoto,
  getEventPhotos,
  incrementGuestCount,
  decrementSmsCredits,
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
