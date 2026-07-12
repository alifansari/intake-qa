-- Intake QA beta — first-party product event log + alert state (Postgres/Supabase dialect).
--
-- SQLite twin: web/db/migrations/0027_event_log.sql (the tracks diverge above
-- 0019 by design — same logical migration, different number; see web/README.md
-- "Migrations (two tracks)").
--
-- WHY FIRST-PARTY: intake calls are confidential legal data. No PostHog, no
-- Plausible, no third-party pixel — product events land in OUR database, hold
-- IDs and counts only (never transcripts, never caller PII), and are read only
-- by the founder-gated /studio/beta board and the founder alert sweep.
--
-- RLS is ENABLED with NO policy on both tables -> only the trusted service
-- role (which bypasses RLS) can read/write, matching the errors table. No end
-- user ever reads the raw event log.

create table if not exists events (
  id         bigint generated always as identity primary key,
  event      text        not null check (event in (
               'sign_in',
               'desk_view',
               'digest_sent',
               'digest_opened',
               'digest_link_clicked',
               'callback_marked',
               'upload_started',
               'upload_completed',
               'audit_started',
               'audit_completed',
               'apply_submitted'
             )),
  firm_id    uuid        references firms(id),  -- nullable: public flows (audit, apply) have no firm yet
  actor      text,                               -- who did it: an email, 'email-digest-link', 'public', 'system'
  context    text,                               -- small JSON blob: ids and counts ONLY, never PII/transcripts
  created_at timestamptz not null default now()
);
create index if not exists events_event_created_idx on events(event, created_at);
create index if not exists events_firm_created_idx  on events(firm_id, created_at);

create table if not exists alert_state (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- Founder-set funnel stage (NULL = onboarded, not yet a pilot). Behind
-- ops/insights.md B1/B2 — audit→pilot and pilot→paid are the two conversions
-- that decide the model; the founder sets stage by hand on /studio/beta.
alter table firms add column if not exists stage text check (stage in ('pilot', 'paid'));
alter table firms add column if not exists stage_updated_at timestamptz;

alter table events enable row level security;
alter table alert_state enable row level security;
