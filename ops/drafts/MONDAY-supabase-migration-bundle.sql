
-- ============================================================
-- 0034_firm_callrail_secret
-- ============================================================
-- Intake QA — per-firm CallRail webhook secret (0034).
--
-- WHY: CallRail issues a signing token PER ACCOUNT — you don't choose it — so one
-- shared CALLRAIL_WEBHOOK_SECRET across five firms cannot verify all of them. This
-- column lets each firm carry its own account's signing secret; the per-firm
-- webhook route (/webhooks/callrail/<firm-id>) prefers it and falls back to the
-- env secret (the original single-pilot firm). Firm-scoped and RLS-protected like
-- the rest of the firm row.

alter table firms add column if not exists callrail_webhook_secret text;

-- ============================================================
-- 0036_event_log
-- ============================================================
-- Intake QA beta — first-party product event log + alert state (Postgres/Supabase dialect).
--
-- SQLite twin: web/db/migrations/0028_event_log.sql (the tracks diverge above
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

-- ============================================================
-- 0037_welcome_emails
-- ============================================================
-- Intake QA — persisted welcome emails (0036).
--
-- WHY: /api/studio/onboard-firm now composes the complete firm-personalized
-- welcome email (sign-in link, webhook address, first-48-hours plan). This table
-- keeps the REDACTED copy — the temporary password is masked before persistence
-- (it is shown once at provisioning and never stored readable) — so the founder
-- can re-read what a firm was sent, and so a founder-clicked send is recorded.
--
-- RLS: enabled, NO policy → service-role/founder surface only (same posture as
-- beta_applicants in 0023). A firm never needs to query its own welcome email;
-- exposure is app-mediated through the founder-gated studio.

create table if not exists welcome_emails (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references firms(id),
  to_email        text not null,
  subject         text not null,
  body_redacted   text not null,   -- NEVER the raw temp password
  sent_at         timestamptz,     -- set only by the founder-clicked send
  sent_message_id text,            -- Resend message id when sent live
  created_at      timestamptz not null default now()
);
create index if not exists welcome_emails_firm_idx on welcome_emails(firm_id);

alter table welcome_emails enable row level security;

-- ============================================================
-- 0038_flag_status_attempts
-- ============================================================
-- Intake QA — attempt tracking on the missed-case workflow (migration 0037).
--
-- WHY (B-011, callback science 2026-07-10): 93% of converted leads are reached
-- by the 6th call attempt, but most firms stop after ~2 (Velocify, 3.5M leads).
-- The desk encourages persistence ("most signups happen between calls 3 and 6")
-- only if it knows how many touches were actually logged.
--
-- Sibling-record doctrine: the frozen `flags` row is never mutated. `attempts`
-- increments when the coordinator logs a touch (left a message / spoke to
-- them). It is a private encouragement counter — never surfaced as a score,
-- never a quota, no per-staff comparison anywhere (intake-staff field guide).

alter table flag_status add column if not exists attempts integer not null default 0;
alter table flag_status add column if not exists last_attempt_at timestamptz;
