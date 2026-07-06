-- Intake QA — report review gate (Postgres/Supabase twin of SQLite 0016). Additive,
-- idempotent. Reports don't release without analyst review.
alter table audit_sessions add column if not exists report_status text not null default 'draft'
  check (report_status in ('draft', 'analyst_review', 'released'));
alter table audit_sessions add column if not exists released_at timestamptz;
alter table audit_sessions add column if not exists released_by text;
