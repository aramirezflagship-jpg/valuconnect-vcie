'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const supabase = require('./supabase'); // service-role client (null when unconfigured)

const STORE_PATH = process.env.USERS_STORE_PATH || path.join(__dirname, '../../../config/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'flash-it-dev-secret-2026';
const JWT_EXPIRES = '30d';

// Persist accounts + reset tokens in Postgres when Supabase is configured
// (service-role key required for writes). Otherwise fall back to the JSON store.
// Identity model stays LOCAL-JWT: we sign our own JWT and supply our own
// account ids — barry's `accounts` table is standalone (no auth.users FK), so
// localAuth ports straight onto Postgres with no behaviour change.
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Map a Supabase `accounts` row → the user record shape the rest of localAuth
 * and the routes expect ({ id, email, name, passwordHash, role, createdAt }).
 */
function _accountRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || (row.email ? row.email.split('@')[0] : null),
    passwordHash: row.password_hash || null,
    role: row.role || 'customer',
    createdAt: row.created_at || null,
  };
}

// ── Store helpers ─────────────────────────────────────────────────────────────

function readStore() {
  if (!fs.existsSync(STORE_PATH)) return { users: [] };
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return { users: [] };
  }
}

function writeStore(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ── Password helpers ──────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, storedHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

async function getUserByEmail(email) {
  const normalized = String(email || '').toLowerCase();

  if (useSupabase && supabase) {
    // email is UNIQUE in barry's schema — this is how we reconcile the admin,
    // whose seed id (0002_seed.sql) differs from the local random uuid (item 4).
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();
    if (error) console.error('[localAuth] getUserByEmail (supabase) error:', error.message);
    return _accountRowToUser(data);
  }

  const { users } = readStore();
  return users.find((u) => u.email === normalized) || null;
}

async function getUserById(id) {
  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) console.error('[localAuth] getUserById (supabase) error:', error.message);
    return _accountRowToUser(data);
  }

  const { users } = readStore();
  return users.find((u) => u.id === id) || null;
}

async function createUser(email, password, name, role = 'customer') {
  const id = crypto.randomUUID();
  const normalized = email.toLowerCase();
  const displayName = name || email.split('@')[0];
  const passwordHash = hashPassword(password);

  if (useSupabase && supabase) {
    const row = {
      id,
      email: normalized,
      name: displayName,
      password_hash: passwordHash,
      role,
    };
    const { data, error } = await supabase
      .from('accounts')
      .insert(row)
      .select()
      .single();
    if (error) {
      // Unique email violation → return the existing account (idempotent-ish).
      if (error.code === '23505') return getUserByEmail(normalized);
      console.error('[localAuth] createUser (supabase) error:', error.message);
      throw new Error(`Failed to create account: ${error.message}`);
    }
    return _accountRowToUser(data);
  }

  const store = readStore();
  const user = {
    id,
    email: normalized,
    name: displayName,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);
  return user;
}

async function updateUser(id, fields) {
  if (useSupabase && supabase) {
    // Map the only mutable field the routes send (name); ignore unknown keys.
    const patch = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.role !== undefined) patch.role = fields.role;
    if (Object.keys(patch).length === 0) return getUserById(id);

    const { data, error } = await supabase
      .from('accounts')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[localAuth] updateUser (supabase) error:', error.message);
      return null;
    }
    const user = _accountRowToUser(data);
    if (!user) return null;
    const { passwordHash: _ph, ...safe } = user;
    return safe;
  }

  const store = readStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  store.users[idx] = { ...store.users[idx], ...fields };
  writeStore(store);
  return store.users[idx];
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Auth operations ───────────────────────────────────────────────────────────

async function login(email, password) {
  const user = await getUserByEmail(email);
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash))
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  const token = signToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

async function register(email, password, name) {
  if (await getUserByEmail(email))
    throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
  const user = await createUser(email, password, name);
  const token = signToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

// ── Password reset ────────────────────────────────────────────────────────────
// Tokens are single-use and short-lived. We persist ONLY the SHA-256 hash of
// the token (never the token itself) alongside the account id + expiry, in the
// same JSON store under a `resetTokens` array.
//
// NOTE: on Render the filesystem is ephemeral, so pending reset tokens are
// cleared on every redeploy. That is acceptable (tokens expire in 15 min); a
// durable store would require Supabase.

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

function _hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Update an account's password by user id. Returns the safe user or null.
 * @param {string} id
 * @param {string} newPassword
 */
async function updateUserPassword(id, newPassword) {
  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[localAuth] updateUserPassword (supabase) error:', error.message);
      return null;
    }
    const user = _accountRowToUser(data);
    if (!user) return null;
    const { passwordHash: _ph, ...safe } = user;
    return safe;
  }

  const store = readStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  store.users[idx].passwordHash = hashPassword(newPassword);
  writeStore(store);
  const { passwordHash: _, ...safeUser } = store.users[idx];
  return safeUser;
}

/**
 * Create a single-use reset token for an email if the account exists.
 * Stores only the token hash. Returns the raw token (caller emails it), or
 * null when no such account exists. Never throws on a missing user.
 * @param {string} email
 * @returns {{ token: string, user: object }|null}
 */
async function createPasswordResetToken(email) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = _hashToken(token);

  if (useSupabase && supabase) {
    // Invalidate any prior tokens for this user, then insert the new hash.
    await supabase.from('password_reset_tokens').delete().eq('account_id', user.id);
    const { error } = await supabase.from('password_reset_tokens').insert({
      account_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      used: false,
    });
    if (error) {
      console.error('[localAuth] createPasswordResetToken (supabase) error:', error.message);
      return null;
    }
    return { token, user };
  }

  const store = readStore();
  if (!Array.isArray(store.resetTokens)) store.resetTokens = [];

  // Invalidate any prior tokens for this user.
  store.resetTokens = store.resetTokens.filter((t) => t.userId !== user.id);
  store.resetTokens.push({
    userId: user.id,
    tokenHash,
    expiresAt: Date.now() + RESET_TTL_MS,
    used: false,
  });
  writeStore(store);

  return { token, user };
}

/**
 * Consume a reset token and set a new password. Verifies the token exists, is
 * unexpired, unused, and matches. Single-use: the token is invalidated.
 * @param {string} token
 * @param {string} newPassword
 * @returns {boolean} true on success, false if token invalid/expired
 */
async function consumePasswordResetToken(token, newPassword) {
  if (!token) return false;
  const tokenHash = _hashToken(token);

  if (useSupabase && supabase) {
    const { data: rec, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) {
      console.error('[localAuth] consumePasswordResetToken (supabase) lookup error:', error.message);
      return false;
    }
    if (!rec || rec.used || new Date(rec.expires_at).getTime() < Date.now()) return false;

    // Set the new password on the owning account.
    const { error: pwErr } = await supabase
      .from('accounts')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', rec.account_id);
    if (pwErr) {
      console.error('[localAuth] consumePasswordResetToken (supabase) pw error:', pwErr.message);
      return false;
    }

    // Single-use: delete this token (prune is cheap; CASCADE handles account del).
    await supabase.from('password_reset_tokens').delete().eq('id', rec.id);
    return true;
  }

  const store = readStore();
  if (!Array.isArray(store.resetTokens)) return false;

  const rec = store.resetTokens.find((t) => t.tokenHash === tokenHash);
  if (!rec || rec.used || rec.expiresAt < Date.now()) return false;

  const idx = store.users.findIndex((u) => u.id === rec.userId);
  if (idx === -1) return false;

  store.users[idx].passwordHash = hashPassword(newPassword);
  // Invalidate this token (and prune expired ones while we're here).
  store.resetTokens = store.resetTokens.filter(
    (t) => t.tokenHash !== tokenHash && t.expiresAt >= Date.now()
  );
  writeStore(store);
  return true;
}

// ── Seed demo accounts (idempotent) ──────────────────────────────────────────

function seedDemoAccounts() {
  const store = readStore();
  const emails = store.users.map((u) => u.email);

  if (!emails.includes('demo@flash-it.app')) {
    const id = 'a0000000-demo-4000-8000-000000000001';
    store.users.push({
      id,
      email: 'demo@flash-it.app',
      name: 'Demo Customer',
      passwordHash: hashPassword('demo123'),
      role: 'customer',
      createdAt: new Date().toISOString(),
    });
    console.log('[localAuth] Seeded demo customer: demo@flash-it.app / demo123');
  }

  if (!emails.includes('admin@flash-it.app')) {
    store.users.push({
      id: crypto.randomUUID(),
      email: 'admin@flash-it.app',
      name: 'Andres (Admin)',
      passwordHash: hashPassword(process.env.ADMIN_SECRET || 'flash-it-admin-2026'),
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    console.log('[localAuth] Seeded admin: admin@flash-it.app');
  }

  writeStore(store);
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  signToken,
  verifyToken,
  login,
  register,
  updateUserPassword,
  createPasswordResetToken,
  consumePasswordResetToken,
  seedDemoAccounts,
};

