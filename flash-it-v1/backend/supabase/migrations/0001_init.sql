-- ============================================================================
-- Flash-it v1 — Initial schema (0001_init.sql)
-- ============================================================================
-- Gives the Flash-it backend durable persistence to replace the EPHEMERAL
-- JSON file store (src/services/{events,backgrounds}.js, src/services/localAuth.js)
-- that resets on every Render redeploy.
--
-- Conventions:
--   * All timestamps are timestamptz (UTC).
--   * Idempotent: CREATE TABLE/INDEX IF NOT EXISTS, policies DROP+CREATE.
--   * Tables/columns are named to match what src/services/db.js already queries
--     (snake_case: event_code, r2_url, theme_id, ...). Where the in-memory
--     jsonStore used camelCase (logoUrl, framePath, backgroundIds, faceSlot,
--     defaultBackgroundId, deliveryChannels), the SQL uses snake_case columns;
--     bruce must map jsonStore field <-> column when porting (see report).
--
-- ---------------------------------------------------------------------------
-- AUTH MODEL  (READ ME)
-- ---------------------------------------------------------------------------
-- Flash-it currently runs in LOCAL-JWT mode: the Express backend does its own
-- auth (src/services/localAuth.js) — it generates account ids with
-- crypto.randomUUID(), stores a pbkdf2 password hash, and signs its own JWT.
-- There is therefore NO backing row in Supabase `auth.users` for these
-- accounts. For that reason:
--
--   * `accounts` is a STANDALONE table. Its id is a plain UUID that the backend
--     supplies (it does NOT default to auth.uid() and does NOT FK to auth.users).
--     This is the deliberate difference from the legacy pixel-ai schema, which
--     assumed Supabase Auth owned identities. Keeping accounts standalone lets
--     bruce port localAuth.js straight onto Postgres with zero behavior change.
--   * `accounts` holds `password_hash` and `role` so the local auth flow
--     (login/register/seed admin) keeps working server-side.
--   * The backend uses the SERVICE_ROLE key (see src/services/supabase.js), which
--     BYPASSES RLS. So all real traffic goes through the service role; RLS below
--     is a safe-by-default backstop (deny anon, owner-scoped policies) in case
--     the project ever migrates to true Supabase Auth + direct client access.
--   * If/when Flash-it adopts Supabase Auth, set accounts.id := auth.uid() on
--     insert from the app and the owner-scoped `auth.uid()` policies light up
--     automatically. No schema change required.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
-- gen_random_uuid() lives in pgcrypto (already present on Supabase, but be safe).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Utility: auto-stamp updated_at on UPDATE ────────────────────────────────
CREATE OR REPLACE FUNCTION flash_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: accounts
-- ----------------------------------------------------------------------------
-- One row per host/admin. Maps to src/services/localAuth.js user records:
--   { id, email, name, passwordHash, role, createdAt }
-- id is supplied by the backend (crypto.randomUUID()); seeded demo/admin use
-- fixed ids. NOT linked to auth.users (see AUTH MODEL above).
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  name                TEXT,
  password_hash       TEXT,                              -- pbkdf2 "salt:hash"; NULL for Supabase-Auth-backed accounts
  role                TEXT NOT NULL DEFAULT 'customer',  -- 'customer' | 'admin'
  stripe_customer_id  TEXT,                              -- forward-compat (db.js updateAccount writes this)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_accounts_updated_at') THEN
    CREATE TRIGGER trg_accounts_updated_at
      BEFORE UPDATE ON accounts
      FOR EACH ROW EXECUTE FUNCTION flash_set_updated_at();
  END IF;
END $$;

-- ============================================================================
-- TABLE: password_reset_tokens
-- ----------------------------------------------------------------------------
-- Mirrors localAuth.js resetTokens[]: { userId, tokenHash, expiresAt, used }.
-- Only the SHA-256 token HASH is stored (never the raw token). Single-use,
-- short-lived (15 min). created_at lets a cron/job prune expired rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,                       -- sha256 hex of the raw token
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: events
-- ----------------------------------------------------------------------------
-- One photo-booth activation. Maps to src/services/events.js event records.
-- id is the slug-ish code the code generates (e.g. "my-event-ab12cd").
--
-- NOTE on id vs event_code:
--   * jsonStore (events.js) uses a SINGLE field `id` (the slug) and has no
--     separate code; guests look events up by that id.
--   * db.js (Supabase branch) generates BOTH: id == event_code by default, and
--     looks up by id first then falls back to event_code.
--   We keep BOTH columns to satisfy db.js. event_code is UNIQUE; default it to
--   the same value as id when the app doesn't supply a distinct one.
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id                    TEXT PRIMARY KEY,                 -- slug code, e.g. "sofia-xv-a1b2c3"
  event_code            TEXT UNIQUE NOT NULL,             -- guest-facing lookup code (db.js); = id by default
  account_id            UUID REFERENCES accounts(id) ON DELETE CASCADE,  -- nullable: demo/legacy events may have none
  name                  TEXT NOT NULL,
  pin                   TEXT,                             -- 6-digit host PIN (events.js _generatePin)
  date                  DATE,
  venue                 TEXT,
  logo_url              TEXT,                             -- jsonStore: logoUrl
  frame_path            TEXT,                             -- jsonStore: framePath (URL or local path to overlay PNG)
  brand_color           TEXT DEFAULT '#8b5cf6',           -- jsonStore: brandColor
  category              TEXT,                             -- occasion category (drives message font); jsonStore: category
  themes                JSONB DEFAULT '[]'::jsonb,        -- array of theme config objects
  background_ids        JSONB DEFAULT '[]'::jsonb,        -- jsonStore: backgroundIds (enabled template ids)
  default_background_id TEXT,                             -- jsonStore: defaultBackgroundId (capture fallback)
  delivery_channels     JSONB DEFAULT '["sms"]'::jsonb,   -- jsonStore: deliveryChannels (["sms","whatsapp",...])
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,    -- jsonStore: isActive
  is_demo               BOOLEAN NOT NULL DEFAULT FALSE,   -- jsonStore: is_demo
  plan_tier             TEXT,                             -- 'starter'|'party'|'celebration'|'brand' (nullable per jsonStore)
  max_guests            INTEGER,                          -- NULL = unlimited
  sms_credits_limit     INTEGER NOT NULL DEFAULT 0,
  sms_credits_used      INTEGER NOT NULL DEFAULT 0,
  guest_count           INTEGER NOT NULL DEFAULT 0,
  expires_at            TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'active',   -- 'active'|'ended'|'expired'
  stripe_session_id     TEXT,                             -- forward-compat (db.js createEvent writes this)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_events_updated_at') THEN
    CREATE TRIGGER trg_events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION flash_set_updated_at();
  END IF;
END $$;

-- ============================================================================
-- TABLE: backgrounds   (themed backgrounds / templates)
-- ----------------------------------------------------------------------------
-- Maps to src/services/backgrounds.js records:
--   { id, category, mode, name, url, thumbnailUrl, faceSlot, r2Key, accountId, createdAt }
-- id may be a fixed slug (seed templates use 'seed-natural-fiesta' etc.) or a
-- uuid, so the PK is TEXT. mode is 'natural'|'character'. face_slot is JSONB
-- {x,y,width,height,shape} and is only set for character templates.
-- ============================================================================
CREATE TABLE IF NOT EXISTS backgrounds (
  id            TEXT PRIMARY KEY,                   -- uuid OR fixed seed slug
  category      TEXT NOT NULL DEFAULT 'fiesta',     -- wedding|quinceanera|corporate|birthday|holiday|fiesta|...
  mode          TEXT NOT NULL DEFAULT 'natural',    -- 'natural' | 'character'
  name          TEXT NOT NULL DEFAULT 'Background',
  url           TEXT,                               -- public R2 URL of the frame/artwork PNG (nullable)
  thumbnail_url TEXT,                               -- jsonStore: thumbnailUrl
  face_slot     JSONB,                              -- jsonStore: faceSlot {x,y,width,height,shape}; character only
  r2_key        TEXT,                               -- jsonStore: r2Key (R2 object key for durability/re-listing)
  account_id    UUID REFERENCES accounts(id) ON DELETE CASCADE,  -- jsonStore: accountId; NULL for admin/global seeds
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: photos
-- ----------------------------------------------------------------------------
-- Each captured/composited photo. The capture route (routes/capture.js) builds
-- a rich photoRecord and calls logPhoto(); db.js's Supabase logPhoto() persists
-- a SUBSET to these columns. We add the extra fields capture.js produces so the
-- record can be stored faithfully (see report — bruce should widen db.logPhoto).
--   capture.js photoRecord: id, eventId, mode, backgroundId/templateId, photoUrl,
--     thumbnailUrl, publicId, qrCode(skip), printStatus, guestPhone, createdAt
--   db.js insert today:      event_id, account_id, r2_url, thumbnail_url,
--     theme_id, guest_phone, delivered_via
-- ============================================================================
CREATE TABLE IF NOT EXISTS photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- capture.js supplies printJobId (uuid); keep as PK
  event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- nullable: guest captures have no account session
  mode          TEXT,                              -- 'natural' | 'character'
  background_id TEXT REFERENCES backgrounds(id) ON DELETE SET NULL,  -- = templateId; the chosen template
  r2_url        TEXT NOT NULL,                     -- final composited photo URL (capture.js: photoUrl)
  thumbnail_url TEXT,                              -- capture.js: thumbnailUrl
  public_id     TEXT,                              -- Cloudinary/R2 public id (capture.js: publicId)
  theme_id      TEXT,                              -- legacy field db.js writes; kept for compatibility
  guest_phone   TEXT,                              -- E.164; nullable
  delivered_via TEXT DEFAULT 'none',               -- 'sms'|'whatsapp'|'download'|'none'
  print_status  TEXT NOT NULL DEFAULT 'pending',   -- 'pending'|'printed'|'failed'
  printed_at    TIMESTAMPTZ,                       -- set by updatePhotoPrintStatus
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_events_account_id          ON events (account_id);
-- event_code already UNIQUE (implicit index); add explicit for lookups parity.
CREATE INDEX IF NOT EXISTS idx_events_status              ON events (status);
CREATE INDEX IF NOT EXISTS idx_backgrounds_category_mode  ON backgrounds (category, mode);
CREATE INDEX IF NOT EXISTS idx_backgrounds_account_id     ON backgrounds (account_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_id            ON photos (event_id);
CREATE INDEX IF NOT EXISTS idx_photos_account_id          ON photos (account_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token_hash    ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_account_id    ON password_reset_tokens (account_id);
-- accounts.email is already UNIQUE (implicit index used for getUserByEmail).

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Project rule: EVERY table has RLS enabled.
-- Strategy (safe-by-default):
--   * Enable RLS on all tables. With RLS on and no permissive policy for a role,
--     that role is DENIED — so `anon` is denied everywhere by default.
--   * The backend uses the SERVICE_ROLE key, which BYPASSES RLS entirely, so it
--     keeps full access regardless of the policies below. No service_role
--     policies are needed (and Supabase recommends not writing any).
--   * Owner-scoped policies (account_id = auth.uid()) are provided for the
--     forward-compat case where a future Supabase-Auth client talks to the DB
--     directly. They are inert today because local-JWT accounts have no
--     auth.uid(), but they harden the schema at no cost.
--   * events gets an extra `anon SELECT` policy: a guest entering a booth looks
--     up an event by code WITHOUT an auth session. The app layer is responsible
--     for returning only guest-safe columns. (RLS can't filter columns.)
-- ============================================================================

ALTER TABLE accounts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos                ENABLE ROW LEVEL SECURITY;

-- ---- accounts ----
DROP POLICY IF EXISTS "accounts_select_own" ON accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON accounts;

CREATE POLICY "accounts_select_own"
  ON accounts FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "accounts_insert_own"
  ON accounts FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "accounts_update_own"
  ON accounts FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- password_reset_tokens ----
-- No authenticated/anon policies: reset tokens are handled exclusively by the
-- backend (service_role, which bypasses RLS). RLS-on + no policy = deny all
-- other roles, which is exactly what we want for a secrets-adjacent table.

-- ---- events ----
DROP POLICY IF EXISTS "events_select_owner" ON events;
DROP POLICY IF EXISTS "events_select_guest" ON events;
DROP POLICY IF EXISTS "events_insert_owner" ON events;
DROP POLICY IF EXISTS "events_update_owner" ON events;
DROP POLICY IF EXISTS "events_delete_owner" ON events;

CREATE POLICY "events_select_owner"
  ON events FOR SELECT TO authenticated
  USING (account_id = auth.uid());

-- Guest booth lookup by code, no auth session. App returns only safe columns.
CREATE POLICY "events_select_guest"
  ON events FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "events_insert_owner"
  ON events FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "events_update_owner"
  ON events FOR UPDATE TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "events_delete_owner"
  ON events FOR DELETE TO authenticated
  USING (account_id = auth.uid());

-- ---- backgrounds ----
-- Owners manage their own uploaded templates. Global/admin seed templates
-- (account_id IS NULL) are readable by everyone (authenticated + anon) so the
-- guest booth can list them; only the backend (service_role) writes seeds.
DROP POLICY IF EXISTS "backgrounds_select_public_or_own" ON backgrounds;
DROP POLICY IF EXISTS "backgrounds_select_guest"         ON backgrounds;
DROP POLICY IF EXISTS "backgrounds_insert_own"           ON backgrounds;
DROP POLICY IF EXISTS "backgrounds_update_own"           ON backgrounds;
DROP POLICY IF EXISTS "backgrounds_delete_own"           ON backgrounds;

CREATE POLICY "backgrounds_select_public_or_own"
  ON backgrounds FOR SELECT TO authenticated
  USING (account_id IS NULL OR account_id = auth.uid());

CREATE POLICY "backgrounds_select_guest"
  ON backgrounds FOR SELECT TO anon
  USING (account_id IS NULL);

CREATE POLICY "backgrounds_insert_own"
  ON backgrounds FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "backgrounds_update_own"
  ON backgrounds FOR UPDATE TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "backgrounds_delete_own"
  ON backgrounds FOR DELETE TO authenticated
  USING (account_id = auth.uid());

-- ---- photos ----
-- Owners read/manage photos of their own events. Guest captures are inserted by
-- the backend (service_role), so no anon INSERT policy is needed.
DROP POLICY IF EXISTS "photos_select_owner" ON photos;
DROP POLICY IF EXISTS "photos_insert_owner" ON photos;
DROP POLICY IF EXISTS "photos_update_owner" ON photos;
DROP POLICY IF EXISTS "photos_delete_owner" ON photos;

CREATE POLICY "photos_select_owner"
  ON photos FOR SELECT TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "photos_insert_owner"
  ON photos FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "photos_update_owner"
  ON photos FOR UPDATE TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "photos_delete_owner"
  ON photos FOR DELETE TO authenticated
  USING (account_id = auth.uid());

-- ============================================================================
-- END 0001_init.sql
-- ============================================================================
