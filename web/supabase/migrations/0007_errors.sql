-- Intake QA v1 — operator error log (migration 0007, Postgres/Supabase dialect).
--
-- Postgres twin of web/db/migrations/0007_errors.sql. A lightweight, always-on
-- record of pipeline/webhook/API failures so an operator can see what broke
-- without digging through server logs. Writing here is best-effort and must
-- NEVER throw into the caller. firm_id is optional (some failures happen before
-- a firm is resolved). `context` is a small JSON blob for debugging.
--
-- RLS is ENABLED with NO policy -> only the trusted service role (which bypasses
-- RLS) can read/write, matching the demo + template_versions tables. No end user
-- ever sees the raw error log.

create table if not exists errors (
  id         bigint generated always as identity primary key,
  source     text        not null,
  message    text        not null,
  context    text,
  firm_id    uuid        references firms(id),
  alerted    boolean     not null default false,
  created_at timestamptz not null default now()
);
create index if not exists errors_created_idx on errors(created_at);
create index if not exists errors_source_idx  on errors(source);

alter table errors enable row level security;
