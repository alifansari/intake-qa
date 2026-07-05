-- Intake QA — additive flags.case_type (migration 0015, SQLite dialect).
--
-- ADDITIVE ONLY. A nullable column so the Leaked-Case Queue and fee-value lookup
-- can show a PI case type. It does NOT change any flag DECISION — the frozen
-- flag-logic INSERTs name their columns explicitly and are unaffected. Populated
-- by the demo seed now; by the analysis pass later. Postgres twin alongside.
ALTER TABLE flags ADD COLUMN case_type TEXT;
