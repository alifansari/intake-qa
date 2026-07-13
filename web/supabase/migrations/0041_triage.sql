-- 0041_triage.sql (Postgres / Supabase) -- twin of SQLite 0033_triage.sql
-- Live case-triage records + per-firm triage profile. Firm-scoped with RLS
-- (hard requirement: every table with firm data enables RLS + a firm policy).

create table if not exists firm_triage_profiles (
  firm_id              uuid primary key references firms(id) on delete cascade,
  posture              text not null default 'selective' check (posture in ('selective','volume')),
  accepted_case_types  jsonb,
  min_policy_limits    text,
  take_mist            boolean,
  cost_fronting        text default 'moderate' check (cost_fronting in ('minimal','moderate','deep')),
  trial_capital        boolean not null default false,
  red_flag_strictness  text default 'balanced' check (red_flag_strictness in ('forgiving','balanced','strict')),
  profile_json         jsonb,
  updated_at           timestamptz not null default now()
);

create table if not exists triage_cases (
  id                   uuid primary key default gen_random_uuid(),
  firm_id              uuid not null references firms(id) on delete cascade,
  created_at           timestamptz not null default now(),
  created_by           text,
  caller_name          text,
  caller_phone         text,
  case_type            text,
  incident_date        text,
  grade_letter         text,
  grade_color          text,
  headline             text,
  disposition          text,
  value_tier           text,
  driving_reason       text,
  flip_fact            text,
  sol_deadline         text,
  sol_days_remaining   integer,
  sol_urgency          text,
  attorney_review      boolean not null default false,
  input_json           jsonb,
  verdict_json         jsonb,
  status               text not null default 'new'
                         check (status in ('new','callback','contacted','signed','declined','referred')),
  status_updated_at    timestamptz,
  status_by            text
);

create index if not exists idx_triage_firm on triage_cases(firm_id);
create index if not exists idx_triage_firm_status on triage_cases(firm_id, status);
create index if not exists idx_triage_firm_created on triage_cases(firm_id, created_at);

alter table firm_triage_profiles enable row level security;
drop policy if exists firm_triage_profiles_firm_all on firm_triage_profiles;
create policy firm_triage_profiles_firm_all on firm_triage_profiles
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

alter table triage_cases enable row level security;
drop policy if exists triage_cases_firm_all on triage_cases;
create policy triage_cases_firm_all on triage_cases
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
