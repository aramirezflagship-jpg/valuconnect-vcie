-- ============================================================================
-- Flash-it v1 — Seed data (0002_seed.sql)
-- ============================================================================
-- Idempotent (ON CONFLICT DO NOTHING). Safe to run multiple times.
-- Run AFTER 0001_init.sql.
--
-- Seeds:
--   1. The two default templates the app currently re-creates on boot
--      (POST /api/backgrounds/seed): 'seed-natural-fiesta' + 'seed-character-fiesta'.
--      These persist now instead of vanishing on redeploy.
--   2. The demo + admin accounts that localAuth.seedDemoAccounts() creates, using
--      the SAME ids so the local JSON store and Postgres agree.
--
-- IMPORTANT about template image URLs:
--   The live seed (routes/backgrounds.js) generates placeholder PNG artwork with
--   Sharp and uploads it to R2 at request time, then stores the resulting public
--   URL. SQL can't generate/upload images, so we seed the template ROWS with
--   url/thumbnail_url = NULL and the correct face_slot. The records are durable
--   immediately; to backfill the artwork URLs, the owner runs the existing admin
--   endpoint ONCE after deploy:
--       POST /api/backgrounds/seed   (header: X-Admin-Secret: <ADMIN_SECRET>)
--   That endpoint upserts these same fixed ids and fills in url/thumbnail_url.
--   (Natural mode tolerates a NULL frame url; character mode needs the url, hence
--    the one-time seed call to populate the character artwork.)
-- ============================================================================

-- ── Default templates ───────────────────────────────────────────────────────
-- face_slot matches the brief & generateCharacterArtwork():
--   { x: 360, y: 216, width: 480, height: 600, shape: "oval" }

INSERT INTO backgrounds (id, category, mode, name, url, thumbnail_url, face_slot, r2_key, account_id)
VALUES
  (
    'seed-natural-fiesta',
    'fiesta',
    'natural',
    'Fiesta Frame (seed)',
    NULL,                                  -- backfilled by POST /api/backgrounds/seed
    NULL,
    NULL,                                  -- natural templates have no face slot
    'flash-it/backgrounds/fiesta/seed-natural-fiesta.png',
    NULL                                   -- global/admin template (no owner)
  ),
  (
    'seed-character-fiesta',
    'fiesta',
    'character',
    'Fiesta Character (seed)',
    NULL,                                  -- backfilled by POST /api/backgrounds/seed
    NULL,
    '{"x":360,"y":216,"width":480,"height":600,"shape":"oval"}'::jsonb,
    'flash-it/backgrounds/fiesta/seed-character-fiesta.png',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ── Demo + admin accounts ───────────────────────────────────────────────────
-- Ids match localAuth.seedDemoAccounts(). password_hash is intentionally NULL
-- here: the local store still holds the real pbkdf2 hashes, and bruce's port
-- can upsert the hash from localAuth on first boot. (We do NOT bake a real
-- password hash into a committed SQL file.)
--
-- Note: the admin account in localAuth uses crypto.randomUUID() (non-fixed), so
-- we assign it a stable seed UUID here for a deterministic seed. bruce should
-- reconcile to this id when wiring localAuth -> accounts, OR look the admin up
-- by email (admin@flash-it.app) which is UNIQUE.

INSERT INTO accounts (id, email, name, password_hash, role)
VALUES
  (
    'a0000000-demo-4000-8000-000000000001',
    'demo@flash-it.app',
    'Demo Customer',
    NULL,
    'customer'
  ),
  (
    'a0000000-admin-4000-8000-000000000002',
    'admin@flash-it.app',
    'Andres (Admin)',
    NULL,
    'admin'
  )
ON CONFLICT (id) DO NOTHING;

-- Guard against an email collision if these accounts were already created with
-- different ids by the running backend (email is UNIQUE). This is a no-op when
-- the rows above inserted cleanly.
INSERT INTO accounts (id, email, name, password_hash, role)
SELECT 'a0000000-demo-4000-8000-000000000001', 'demo@flash-it.app', 'Demo Customer', NULL, 'customer'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE email = 'demo@flash-it.app')
ON CONFLICT DO NOTHING;

INSERT INTO accounts (id, email, name, password_hash, role)
SELECT 'a0000000-admin-4000-8000-000000000002', 'admin@flash-it.app', 'Andres (Admin)', NULL, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE email = 'admin@flash-it.app')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END 0002_seed.sql
-- ============================================================================
