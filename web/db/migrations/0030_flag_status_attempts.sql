-- Attempt tracking on the missed-case workflow (sqlite twin of supabase 0037).
--
-- WHY (B-011, callback science 2026-07-10): 93% of converted leads are reached
-- by the 6th call attempt, but most firms stop after ~2. The desk can only
-- encourage persistence if it knows how many touches were actually logged.
-- Sibling-record doctrine: the frozen flags row is never mutated; the counter
-- lives on flag_status. `attempts` increments when the coordinator logs a
-- touch (left a message / spoke to them) — never decremented, never a quota.

ALTER TABLE flag_status ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flag_status ADD COLUMN last_attempt_at TEXT;
