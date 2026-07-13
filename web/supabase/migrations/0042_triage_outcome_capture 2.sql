-- 0042_triage_outcome_capture.sql (Postgres twin of 0034)
-- Outcome capture for the triage ground-truth loop. Additive columns only;
-- triage_cases already has RLS enforced by 0041, and adding columns does not
-- require a new policy. Feeds src/lib/desk/triage-reconcile.mjs.

ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS signed_where TEXT;        -- 'us' | 'elsewhere' | NULL
ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS outcome_recorded_at TIMESTAMPTZ;
ALTER TABLE triage_cases ADD COLUMN IF NOT EXISTS decline_reason TEXT;
