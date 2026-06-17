'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const STORE_PATH = process.env.USERS_STORE_PATH || path.join(__dirname, '../../../config/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'flash-it-dev-secret-2026';
const JWT_EXPIRES = '30d';

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

function getUserByEmail(email) {
  const { users } = readStore();
  return users.find((u) => u.email === email.toLowerCase()) || null;
}

function getUserById(id) {
  const { users } = readStore();
  return users.find((u) => u.id === id) || null;
}

function createUser(email, password, name, role = 'customer') {
  const store = readStore();
  const id = crypto.randomUUID();
  const user = {
    id,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);
  return user;
}

function updateUser(id, fields) {
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

function login(email, password) {
  const user = getUserByEmail(email);
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  if (!verifyPassword(password, user.passwordHash))
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  const token = signToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

function register(email, password, name) {
  if (getUserByEmail(email))
    throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
  const user = createUser(email, password, name);
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
function updateUserPassword(id, newPassword) {
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
function createPasswordResetToken(email) {
  const user = getUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const store = readStore();
  if (!Array.isArray(store.resetTokens)) store.resetTokens = [];

  // Invalidate any prior tokens for this user.
  store.resetTokens = store.resetTokens.filter((t) => t.userId !== user.id);
  store.resetTokens.push({
    userId: user.id,
    tokenHash: _hashToken(token),
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
function consumePasswordResetToken(token, newPassword) {
  if (!token) return false;
  const store = readStore();
  if (!Array.isArray(store.resetTokens)) return false;

  const tokenHash = _hashToken(token);
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

