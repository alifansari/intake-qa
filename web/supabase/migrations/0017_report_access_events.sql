-- Intake QA — report access events (Postgres/Supabase twin of SQLite 0017).
-- Additive, idempotent. Token-based view/download logging for the shareable report.
create table if not exists report_access_events (
  id                 uuid primary key default gen_random_uuid(),
  token              text not null,
  event_type         text not null check (event_type in ('view', 'download')),
  viewer_fingerprint text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_report_access_token on report_access_events(token);
