-- Intake QA — Leak Audit sessions (Postgres/Supabase twin of SQLite 0009).
--
-- Multi-call upgrade of Demo Mode, entirely demo-isolated: audit_session_calls
-- only references demo_calls, never the firm pipeline. Nothing here can send.
--
-- RLS ENABLED, NO POLICY -> only the service role (trusted server) may access,
-- exactly like demo_calls / demo_leads. The session token, not a firm identity,
-- is what authorizes read access to a report (checked in the app layer).

create table if not exists audit_sessions (
  id                  uuid primary key default gen_random_uuid(),
  token               text not null unique,
  visitor_fingerprint text,
  monthly_call_volume integer,
  email               text,
  status              text not null default 'open'
                        check (status in ('open','completed','expired')),
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null
);
create index if not exists audit_sessions_token_idx on audit_sessions(token);
create index if not exists audit_sessions_fp_idx    on audit_sessions(visitor_fingerprint, created_at);

create table if not exists audit_session_calls (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references audit_sessions(id) on delete cascade,
  demo_call_id uuid not null references demo_calls(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (session_id, demo_call_id)
);
create index if not exists audit_session_calls_session_idx on audit_session_calls(session_id);

-- RLS ENABLED, NO POLICY -> service role only.
alter table audit_sessions      enable row level security;
alter table audit_session_calls enable row level security;
