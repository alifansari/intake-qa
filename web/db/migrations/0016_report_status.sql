-- Intake QA — report review gate (migration 0016, SQLite dialect).
--
-- ADDITIVE ONLY. Reports do not release without analyst review. audit_sessions
-- gains a status state machine: draft -> analyst_review -> released. Nothing
-- existing changes; default is 'draft'. Postgres twin alongside.
PRAGMA foreign_keys = ON;

ALTER TABLE audit_sessions ADD COLUMN report_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (report_status IN ('draft', 'analyst_review', 'released'));
ALTER TABLE audit_sessions ADD COLUMN released_at TEXT;
ALTER TABLE audit_sessions ADD COLUMN released_by TEXT;
