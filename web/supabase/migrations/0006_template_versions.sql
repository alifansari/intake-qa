-- Intake QA — template pack versioning (Postgres/Supabase twin of SQLite 0006).
--
-- Immutable, monotonically-versioned SMS template packs per firm, each recording
-- who approved the wording. Firm data -> RLS is ENABLED. A policy scoping rows to
-- the firm's own users lands with the rest of the firm-scoped RLS policies; until
-- then only the service role (trusted server) may read/write, matching 0004/0005.

create table if not exists template_versions (
  id          bigint generated always as identity primary key,
  firm_id     uuid not null references firms(id),
  version     integer not null,
  pack_json   text not null,
  approved_by text,
  created_at  timestamptz not null default now(),
  unique (firm_id, version)
);
create index if not exists template_versions_firm_idx on template_versions(firm_id, version);

alter table template_versions enable row level security;
