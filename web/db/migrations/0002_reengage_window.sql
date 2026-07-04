-- Intake QA v1 — migration 0002: per-firm re-engagement window.
--
-- How soon after a lost signable call the firm is willing to re-engage by SMS.
-- Default 72h is a safe cap. NOTE (compliance): California inquiry-based EBR
-- (established business relationship) consent is tighter — treat it as ~30 days
-- and re-engage SAME-DAY where possible for the strongest footing.
--
-- Postgres mapping: INTEGER NOT NULL DEFAULT 72 is identical.

ALTER TABLE firms ADD COLUMN reengage_window_hours INTEGER NOT NULL DEFAULT 72;
