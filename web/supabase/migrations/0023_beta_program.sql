-- Intake QA — Beta program layer + rescue desk models (Postgres/Supabase twin of
-- SQLite 0021_beta_program.sql). See that file's header for the model narrative.
--
-- RLS decisions:
--   * beta_applicants / waitlist_entries / nda_records / beta_feedback /
--     practice_area_rulesets / review_queue_items / handling_scores:
--     RLS ENABLED, NO POLICY -> service role only. Applicants have no auth user
--     yet; the review queue is the ANALYST's surface (a pending flag must be
--     invisible to the firm until confirmed — invariant d); handling scores are
--     coaching-sensitive (module 7 privacy) so exposure is app-mediated.
--   * firm_ruleset_overrides / rescue_packets / rescue_packet_items /
--     rescue_ledger_entries / callback_audit_entries / compliance_config:
--     firm-scoped policies via current_user_firm_ids(), matching 0001.

-- 0a. Beta applicant intake + qualification -----------------------------------

create table if not exists beta_applicants (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  name                text not null,
  firm_name           text not null,
  role                text,
  bar_number          text,
  practice_area       text not null,
  state               text not null,
  monthly_call_volume integer,
  phone_system        text,
  crm_system          text,
  records_calls       boolean not null default false,
  spanish_call_pct    integer,
  status              text not null default 'applied'
                        check (status in ('applied','nda_pending','nda_signed','onboarding',
                                          'active_tester','completed','waitlisted','rejected')),
  qualification       jsonb,
  firm_id             uuid references firms(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists beta_applicants_status_idx on beta_applicants(status);
create index if not exists beta_applicants_email_idx  on beta_applicants(email);

create table if not exists waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references beta_applicants(id) on delete cascade,
  practice_area text not null,
  state         text,
  reason        text,
  created_at    timestamptz not null default now(),
  unique (applicant_id)
);
create index if not exists waitlist_practice_area_idx on waitlist_entries(practice_area);

-- 0b. NDA gate (Dropbox Sign) — HARD gate before any data access (invariant f).
create table if not exists nda_records (
  id                   uuid primary key default gen_random_uuid(),
  applicant_id         uuid not null references beta_applicants(id) on delete cascade,
  provider             text not null default 'dropbox_sign',
  signature_request_id text unique,
  status               text not null default 'sent'
                         check (status in ('sent','signed','declined','canceled')),
  document_ref         text,
  sent_at              timestamptz not null default now(),
  signed_at            timestamptz
);
create index if not exists nda_records_applicant_idx on nda_records(applicant_id);

-- 0c. Structured per-artifact feedback (per-audit, per-rescue-packet).
create table if not exists beta_feedback (
  id                    uuid primary key default gen_random_uuid(),
  applicant_id          uuid references beta_applicants(id),
  firm_id               uuid references firms(id),
  subject_type          text not null
                          check (subject_type in ('audit','rescue_packet','coaching','onboarding','general')),
  subject_id            text,
  ux_setup_ease         integer check (ux_setup_ease between 1 and 5),
  ux_report_clarity     integer check (ux_report_clarity between 1 and 5),
  ux_delivery           integer check (ux_delivery between 1 and 5),
  utility_flags_signable text   check (utility_flags_signable in ('yes','no','partial')),
  utility_would_have_recovered text check (utility_would_have_recovered in ('yes','no','unsure')),
  utility_diagnosis_accurate   text check (utility_diagnosis_accurate in ('yes','no','partial')),
  utility_script_usable        text check (utility_script_usable in ('yes','no','with_edits')),
  trust_score           integer check (trust_score between 1 and 5),
  trust_false_positives integer,
  wtp_would_pay         text    check (wtp_would_pay in ('yes','no','maybe')),
  wtp_monthly_max_cents integer,
  wtp_must_have         text,
  open_feedback         text,
  created_at            timestamptz not null default now()
);
create index if not exists beta_feedback_subject_idx on beta_feedback(subject_type, subject_id);
create index if not exists beta_feedback_firm_idx    on beta_feedback(firm_id);

-- 2. Pluggable practice-area rulesets (only california-pi ships active).
create table if not exists practice_area_rulesets (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  display_name text not null,
  version      integer not null default 1,
  active       boolean not null default false,
  config       jsonb,
  created_at   timestamptz not null default now()
);
insert into practice_area_rulesets (key, display_name, version, active)
values ('california-pi', 'California Personal Injury', 1, true)
on conflict (key) do nothing;

create table if not exists firm_ruleset_overrides (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  ruleset_key text not null default 'california-pi',
  overrides   jsonb,
  updated_at  timestamptz not null default now(),
  unique (firm_id)
);

-- 2b. Handling score (sibling of flags; no standalone empathy score by design).
create table if not exists handling_scores (
  id                     uuid primary key default gen_random_uuid(),
  flag_id                uuid not null references flags(id) on delete cascade,
  speed_to_lead_seconds  integer,
  screening_completeness integer check (screening_completeness between 0 and 100),
  next_step_secured      boolean not null default false,
  objection_handling     integer check (objection_handling between 0 and 100),
  rubric_version         text,
  created_at             timestamptz not null default now(),
  unique (flag_id)
);

-- 3. Unified human-in-the-loop review queue (invariant d).
create table if not exists review_queue_items (
  id                uuid primary key default gen_random_uuid(),
  firm_id           uuid not null references firms(id) on delete cascade,
  flag_id           uuid not null references flags(id) on delete cascade,
  state             text not null default 'pending'
                      check (state in ('pending','confirmed','rejected')),
  confidence_tier   text,
  reviewer          text,
  reviewed_at       timestamptz,
  reject_reason     text,
  criteria_feedback jsonb,
  created_at        timestamptz not null default now(),
  unique (flag_id)
);
create index if not exists review_queue_state_idx on review_queue_items(firm_id, state);

-- 4. Daily rescue packet, capped at TOP 3 (rank check), zero-login delivery.
create table if not exists rescue_packets (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  packet_date   text not null,
  status        text not null default 'draft' check (status in ('draft','delivered')),
  delivered_via jsonb,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (firm_id, packet_date)
);

create table if not exists rescue_packet_items (
  id              uuid primary key default gen_random_uuid(),
  packet_id       uuid not null references rescue_packets(id) on delete cascade,
  flag_id         uuid not null references flags(id),
  rank            integer not null check (rank between 1 and 3),
  prospect_name   text,
  prospect_phone  text,
  diagnosis       text,
  callback_script text,
  est_value_cents integer,
  recoverability  numeric,
  sol_deadline    text,
  created_at      timestamptz not null default now(),
  unique (packet_id, rank),
  unique (packet_id, flag_id)
);

-- 5. Staged recovered-case ledger with would-have-lost gating.
create table if not exists rescue_ledger_entries (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references firms(id) on delete cascade,
  flag_id               uuid not null references flags(id),
  rescue_tag            text not null unique,
  stage                 text not null default 'flagged'
                          check (stage in ('flagged','contacted','consult','signed','settled','dead')),
  stage_history         jsonb,
  would_have_lost       boolean not null default false,
  would_have_lost_basis text,
  control_holdout       boolean not null default false,
  fee_value_cents       integer,
  contacted_at          timestamptz,
  signed_at             timestamptz,
  settled_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (flag_id)
);
create index if not exists rescue_ledger_firm_idx on rescue_ledger_entries(firm_id, stage);

-- 8. Callback-actor audit log (invariant a: firm employees only).
create table if not exists callback_audit_entries (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  flag_id       uuid references flags(id),
  actor_type    text not null default 'firm_employee'
                  check (actor_type in ('firm_employee')),
  employee_name text not null check (length(employee_name) > 0),
  occurred_at   timestamptz not null,
  outcome       text,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists callback_audit_firm_idx on callback_audit_entries(firm_id, occurred_at);

-- 8b. Per-firm compliance config (consent readiness, BAA reference).
create table if not exists compliance_config (
  id                       uuid primary key default gen_random_uuid(),
  firm_id                  uuid not null references firms(id) on delete cascade,
  consent_greeting_version text,
  consent_attested         boolean not null default false,
  consent_attested_by      text,
  consent_attested_at      timestamptz,
  recording_checklist      jsonb,
  baa_reference            text,
  baa_signed_at            timestamptz,
  updated_at               timestamptz not null default now(),
  unique (firm_id)
);

-- 8c. Per-call consent status (invariant c).
alter table calls add column if not exists consent_status text not null default 'unknown'
  check (consent_status in ('unknown','consented','no_consent'));

-- 11. $0 NDA-gated beta plan (flat-fee structure preserved).
insert into billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_case_fee_cap_cents)
values ('beta', 0, 0, null)
on conflict (name) do nothing;

-- Row-level security --------------------------------------------------------

-- Service-role only (RLS on, no policy):
alter table beta_applicants        enable row level security;
alter table waitlist_entries       enable row level security;
alter table nda_records            enable row level security;
alter table beta_feedback          enable row level security;
alter table practice_area_rulesets enable row level security;
alter table review_queue_items     enable row level security;
alter table handling_scores        enable row level security;

-- Firm-scoped policies (matching the 0001 pattern):
alter table firm_ruleset_overrides enable row level security;
alter table rescue_packets         enable row level security;
alter table rescue_packet_items    enable row level security;
alter table rescue_ledger_entries  enable row level security;
alter table callback_audit_entries enable row level security;
alter table compliance_config      enable row level security;

drop policy if exists firm_ruleset_overrides_firm_all on firm_ruleset_overrides;
create policy firm_ruleset_overrides_firm_all on firm_ruleset_overrides
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists rescue_packets_firm_all on rescue_packets;
create policy rescue_packets_firm_all on rescue_packets
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists rescue_packet_items_firm_all on rescue_packet_items;
create policy rescue_packet_items_firm_all on rescue_packet_items
  for all
  using (exists (select 1 from rescue_packets p
                  where p.id = rescue_packet_items.packet_id
                    and p.firm_id in (select current_user_firm_ids())))
  with check (exists (select 1 from rescue_packets p
                       where p.id = rescue_packet_items.packet_id
                         and p.firm_id in (select current_user_firm_ids())));

drop policy if exists rescue_ledger_entries_firm_all on rescue_ledger_entries;
create policy rescue_ledger_entries_firm_all on rescue_ledger_entries
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists callback_audit_entries_firm_all on callback_audit_entries;
create policy callback_audit_entries_firm_all on callback_audit_entries
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists compliance_config_firm_all on compliance_config;
create policy compliance_config_firm_all on compliance_config
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
