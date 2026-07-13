-- 0034_triage_outcome_capture.sql (SQLite / local pilot)
-- Outcome capture for the triage GROUND-TRUTH LOOP. Distinguishes "signed with
-- us" from "signed elsewhere", stamps when the terminal outcome was recorded,
-- and lets a decline/refer carry a short reason. Additive, firm-scoped.
-- Feeds src/lib/desk/triage-reconcile.mjs (the calibration report): the loop
-- that proves "when we said SIGN, you signed X%".
--
-- The Postgres twin is 0042_triage_outcome_capture.sql.

ALTER TABLE triage_cases ADD COLUMN signed_where TEXT;        -- 'us' | 'elsewhere' | NULL
ALTER TABLE triage_cases ADD COLUMN outcome_recorded_at TEXT; -- set when status becomes terminal
ALTER TABLE triage_cases ADD COLUMN decline_reason TEXT;      -- optional note on a decline/refer
