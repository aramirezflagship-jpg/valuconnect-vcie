-- ============================================================================
-- Flash-it v1 — Admin dashboard data layer (0003_admin_dashboard.sql)
-- ============================================================================
-- Adds the persistence the upgraded ADMIN dashboard needs:
--   1. service_requests  — Full Service leads from the "Request Full Service"
--      form (frontend src/pages/ServiceRequest.jsx → POST /api/contact). Until
--      now these were written to an EPHEMERAL JSON file (config/service-requests.json)
--      that resets on every Render redeploy. This table makes them durable and
--      queryable by the admin dashboard.
--   2. events.service_type — distinguishes the two product lines:
--        'managed' = Full Service (Andres runs the booth; admin-created events)
--        'solo'    = Self-service (the customer signs up + runs it themselves;
--                    events created via POST /api/events/mine)
--      Default 'solo' so existing host self-serve events keep their meaning;
--      backfill rules below set the demo/admin distinction.
--
-- Conventions (match 0001_init.sql):
--   * All timestamps are timestamptz (UTC).
--   * Idempotent: CREATE TABLE/COLUMN IF NOT EXISTS, policies DROP+CREATE.
--   * snake_case columns; db.js maps to/from camelCase (service_type ↔ serviceType).
--   * RLS enabled like every other table — service_role (backend) bypasses it;
--     no anon/authenticated policies (deny-by-default) since this is admin-only
--     data the backend mediates entirely.
-- Run AFTER 0001_init.sql (needs the events table + flash_set_updated_at()).
-- ============================================================================

-- ============================================================================
-- TABLE: service_requests   (Full Service leads)
-- ----------------------------------------------------------------------------
-- One row per "Request Full Service" form submission. status walks the sales
-- funnel: new → contacted → won | lost. The form sends fullName/city/eventType/
-- estimatedGuests/eventDate; routes/contact.js normalises those to these columns.
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,                       -- form: fullName
  email            TEXT NOT NULL,
  phone            TEXT,
  event_type       TEXT,                                -- wedding|quinceanera|corporate|birthday|other
  event_date       DATE,
  estimated_guests INTEGER,                             -- form: estimatedGuests (nullable)
  location         TEXT,                                -- form: city
  message          TEXT,
  lang             TEXT,                                -- 'en' | 'es' (form locale; optional)
  status           TEXT NOT NULL DEFAULT 'new'          -- 'new'|'contacted'|'won'|'lost'
    CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_service_requests_updated_at') THEN
    CREATE TRIGGER trg_service_requests_updated_at
      BEFORE UPDATE ON service_requests
      FOR EACH ROW EXECUTE FUNCTION flash_set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_requests_status     ON service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at DESC);

-- ============================================================================
-- COLUMN: events.service_type   (product line tag)
-- ----------------------------------------------------------------------------
-- 'managed' (Full Service) | 'solo' (self-service). Default 'solo'.
-- ============================================================================
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'solo'
    CHECK (service_type IN ('managed', 'solo'));

CREATE INDEX IF NOT EXISTS idx_events_service_type ON events (service_type);

-- Backfill heuristic for rows created before this column existed:
--   * Events with NO owner account (account_id IS NULL) are admin/demo-created
--     booths Andres runs → 'managed'.
--   * Events owned by a host account (created via POST /api/events/mine) stay
--     'solo'. The DEFAULT already covers new rows; this only reclassifies the
--     pre-existing ownerless ones. Safe to re-run (idempotent in effect).
UPDATE events SET service_type = 'managed'
  WHERE account_id IS NULL AND service_type = 'solo';

-- ============================================================================
-- ROW-LEVEL SECURITY  (admin-only data: deny anon/authenticated, allow only the
-- backend's service_role which bypasses RLS)
-- ============================================================================
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- No authenticated/anon policies on purpose: RLS-on + no permissive policy =
-- deny all non-service_role access. The backend (service_role) bypasses RLS and
-- is the only path that reads/writes these leads (admin endpoints).
DROP POLICY IF EXISTS "service_requests_no_public" ON service_requests;

-- ============================================================================
-- END 0003_admin_dashboard.sql
-- ============================================================================
