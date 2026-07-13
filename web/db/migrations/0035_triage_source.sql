-- 0035_triage_source.sql (SQLite / local pilot)
-- Marks how a triage case was created: a human-typed form ('manual', the
-- default) vs. auto-graded from a scored call ('auto_call'), and links an
-- auto-triage to its source call so re-scoring the same call never duplicates
-- it. Additive. Feeds auto-triage-from-recording (src/lib/desk/triage-from-call.mjs).
--
-- The Postgres twin is 0043_triage_source.sql.

ALTER TABLE triage_cases ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE triage_cases ADD COLUMN source_call_id TEXT;
CREATE INDEX IF NOT EXISTS idx_triage_source_call ON triage_cases(firm_id, source_call_id);
