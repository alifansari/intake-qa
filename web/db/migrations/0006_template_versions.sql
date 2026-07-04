-- Intake QA v1 — firm onboarding: template pack versioning (migration 0006, SQLite).
--
-- The onboarding wizard saves a firm's editable SMS template pack as an
-- immutable, monotonically-versioned snapshot per firm. Every version records
-- WHO approved it (the compliance promise: an attorney/operator signs off on the
-- wording before any of it can be used to draft). Nothing here sends; these are
-- the approved BASES that draft.mjs personalizes, still behind human approval.
--
-- Postgres twin: web/supabase/migrations/0006_template_versions.sql (RLS on).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS template_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id     INTEGER NOT NULL REFERENCES firms(id),
  version     INTEGER NOT NULL,          -- monotonic per firm, first pack = 1
  pack_json   TEXT    NOT NULL,          -- JSON array of { id, name, body }
  approved_by TEXT,                      -- operator/attorney who approved the pack
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id, version)
);
CREATE INDEX IF NOT EXISTS template_versions_firm_idx ON template_versions(firm_id, version);
