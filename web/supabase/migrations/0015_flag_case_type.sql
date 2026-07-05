-- Intake QA — additive flags.case_type (Postgres/Supabase twin of SQLite 0015).
-- Nullable; does not change any flag decision. Idempotent.
alter table flags add column if not exists case_type text;
