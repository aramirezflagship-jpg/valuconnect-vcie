-- ============================================================================
-- Flash-it v1 — Editable Solo plan overrides (0005_plans.sql)
-- ============================================================================
-- Lets the admin Products tab edit plan price/limits/label without a code
-- change. The product ships with code DEFAULTS (services/plans.js) and works
-- WITHOUT this table; rows here OVERRIDE the defaults by `key` and are what
-- Stripe checkout charges. Only the columns set on a row override; NULL/absent
-- columns fall back to the code default (so leave a column NULL to keep the
-- default — note you cannot override TO unlimited via NULL).
--
-- Conventions (match 0001_init.sql): timestamptz, idempotent, RLS on + no
-- anon/authenticated policy (admin-only data via the service_role backend).
-- Run AFTER 0001_init.sql (needs flash_set_updated_at()).
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  key                TEXT PRIMARY KEY            -- 'starter'|'party'|'celebration'|'brand'
    CHECK (key IN ('starter', 'party', 'celebration', 'brand')),
  price              INTEGER,                    -- USD whole dollars
  max_guests         INTEGER,
  sms_credits_limit  INTEGER,
  expires_days       INTEGER,
  label              TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_plans_updated_at') THEN
    CREATE TRIGGER trg_plans_updated_at
      BEFORE UPDATE ON plans
      FOR EACH ROW EXECUTE FUNCTION flash_set_updated_at();
  END IF;
END $$;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_no_public" ON plans;

-- ============================================================================
-- END 0005_plans.sql
-- ============================================================================
