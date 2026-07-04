-- Intake QA — Supabase migration 0003: per-firm re-engagement window.
--
-- Mirrors the pilot's SQLite migration 0002 (web/db/migrations/0002_reengage_window.sql).
-- How soon after a lost signable call the firm may re-engage by SMS. Default 72h
-- is a safe cap; California inquiry-based EBR consent is tighter (~30 days) so
-- re-engage same-day where possible. The pipeline reads this via getFirm().

alter table firms add column if not exists reengage_window_hours integer not null default 72;
