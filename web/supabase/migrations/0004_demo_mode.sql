-- Intake QA — Demo Mode tables (Postgres/Supabase twin of the SQLite 0004).
--
-- Demo Mode is public and no-auth, but its data must NOT be readable by any
-- firm user. RLS is ENABLED with NO policy: authenticated/anon clients see
-- nothing; only the service-role key (used by the trusted server pipeline)
-- bypasses RLS and can read/write. This satisfies the CLAUDE.md hard rule that
-- every table has RLS enabled, while keeping demo data private.
--
-- Audio is never stored. Transcript + result are purged after 72h by the
-- pipeline's purge job.

create table if not exists demo_calls (
  id            uuid primary key default gen_random_uuid(),
  client_ip     text,
  filename      text,
  status        text not null default 'queued'
                  check (status in ('queued','transcribing','scoring','done','error')),
  transcript    text,
  result_json   text,
  error         text,
  audio_deleted boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists demo_calls_ip_idx      on demo_calls(client_ip, created_at);
create index if not exists demo_calls_status_idx  on demo_calls(status);
create index if not exists demo_calls_created_idx on demo_calls(created_at);

create table if not exists demo_leads (
  id           uuid primary key default gen_random_uuid(),
  demo_call_id uuid references demo_calls(id) on delete set null,
  email        text not null,
  created_at   timestamptz not null default now()
);
create index if not exists demo_leads_call_idx on demo_leads(demo_call_id);

-- RLS ENABLED, NO POLICY -> only the service role (bypasses RLS) may access.
alter table demo_calls enable row level security;
alter table demo_leads enable row level security;
