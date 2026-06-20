-- ============================================================================
-- Flash-it v1 — Customer message templates (0004_message_templates.sql)
-- ============================================================================
-- Self-contained CRM messaging (no Monday.com). The admin manages bilingual
-- email/SMS templates that the system merges with contact data and sends
-- (lead auto-reply, post-event thank-you, promos, review requests).
--
-- The product ships with built-in DEFAULT templates in code, so it works
-- WITHOUT this table. This table stores the admin's EDITS/CUSTOM templates:
--   * editing a default promotes it to a row here (matched by `key`)
--   * brand-new custom templates have a null/empty `key`
-- services/messageTemplates.js reads code-defaults + these rows (rows win by key).
--
-- Conventions (match 0001_init.sql):
--   * timestamptz (UTC); snake_case columns; camelCase mapped in messageTemplates.js.
--   * Idempotent: CREATE IF NOT EXISTS, policies DROP+CREATE.
--   * RLS on, no anon/authenticated policies — admin-only data the backend
--     (service_role, which bypasses RLS) mediates entirely.
-- Run AFTER 0001_init.sql (needs flash_set_updated_at()).
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT,                                   -- stable trigger slug (e.g. 'lead-welcome'); null for custom
  name        TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms')),
  category    TEXT NOT NULL DEFAULT 'marketing'
    CHECK (category IN ('transactional', 'lifecycle', 'marketing')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  subject_en  TEXT DEFAULT '',                        -- email subject (EN); ignored for sms
  subject_es  TEXT DEFAULT '',
  body_en     TEXT DEFAULT '',                        -- inner HTML (email) / text (sms), EN
  body_es     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one active override per built-in key (custom templates have null key,
-- which a partial unique index ignores).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_message_templates_key
  ON message_templates (key) WHERE key IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_message_templates_updated_at') THEN
    CREATE TRIGGER trg_message_templates_updated_at
      BEFORE UPDATE ON message_templates
      FOR EACH ROW EXECUTE FUNCTION flash_set_updated_at();
  END IF;
END $$;

-- ============================================================================
-- ROW-LEVEL SECURITY (admin-only; backend service_role bypasses RLS)
-- ============================================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_templates_no_public" ON message_templates;

-- ============================================================================
-- END 0004_message_templates.sql
-- ============================================================================
