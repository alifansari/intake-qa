-- 0043_triage_source.sql (Postgres twin of 0035)
-- Additive columns; triage_cases already has RLS enforced by 0041.

ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS source_call_id TEXT;
CREATE INDEX IF NOT EXISTS idx_triage_source_call ON triage_cases(firm_id, source_call_id);
