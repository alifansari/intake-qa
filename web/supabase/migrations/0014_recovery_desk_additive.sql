-- Intake QA — recovery-desk additive schema (Postgres/Supabase twin of SQLite 0014).
--
-- ADDITIVE ONLY. New sibling tables + columns; no existing behavior changes. New
-- firm-data tables get RLS ENABLED with NO policy (service-role only) for now — the
-- dedicated security gate (item 10) adds firm-scoped policies. Matches the 0010
-- precedent. Money in CENTS. `flags` is the per-call analysis unit (no `analyses`).

alter table firms add column if not exists is_demo boolean not null default false;

alter table calls add column if not exists status text;         -- 'analyzed' | 'excluded_*' | 'failed_*' | null
alter table calls add column if not exists status_reason text;

create table if not exists transcript_citations (
  id               uuid primary key default gen_random_uuid(),
  flag_id          uuid not null references flags(id) on delete cascade,
  fact_kind        text not null,
  start_ms         integer not null,
  end_ms           integer not null,
  verbatim_snippet text not null,
  validation_score real,
  status           text not null default 'needs_review'
                     check (status in ('passed', 'needs_review', 'failed')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_citations_flag on transcript_citations(flag_id);

create table if not exists flag_confidence (
  id              uuid primary key default gen_random_uuid(),
  flag_id         uuid not null unique references flags(id) on delete cascade,
  confidence_tier text not null check (confidence_tier in ('strong', 'moderate')),
  rubric_version  text not null,
  created_at      timestamptz not null default now()
);

create table if not exists analysis_versions (
  id             uuid primary key default gen_random_uuid(),
  flag_id        uuid not null references flags(id) on delete cascade,
  model_version  text not null,
  prompt_version text not null,
  rubric_version text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_analysis_versions_flag on analysis_versions(flag_id);

create table if not exists artifact_access_log (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  actor         text not null,
  artifact_type text not null,
  artifact_id   text not null,
  action        text not null,
  at            timestamptz not null default now()
);
create index if not exists idx_artifact_access_firm on artifact_access_log(firm_id);

create table if not exists citation_failures (
  id           uuid primary key default gen_random_uuid(),
  flag_id      uuid references flags(id) on delete set null,
  snippet      text not null,
  nearest_text text,
  score        real,
  created_at   timestamptz not null default now()
);

create table if not exists fee_value_ranges (
  id         uuid primary key default gen_random_uuid(),
  firm_id    uuid references firms(id) on delete cascade,   -- null = global published row
  case_type  text not null,
  low_cents  integer not null,
  high_cents integer not null,
  basis      text not null check (basis in ('published', 'firm_historical')),
  source     text not null,
  notes      text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_fee_ranges_lookup on fee_value_ranges(firm_id, case_type);

insert into fee_value_ranges (firm_id, case_type, low_cents, high_cents, basis, source, notes)
values
  (null, 'Auto — rear-end', 1800000, 4500000, 'published', 'IRC "Paid in Full" (2023); JVR Personal Injury Valuation Handbooks', 'Auto BI settlement range; excludes policy limits and comparative fault.'),
  (null, 'Slip & fall',     1500000, 5000000, 'published', 'JVR Personal Injury Valuation Handbooks', 'Wide range by liability clarity and injury severity.'),
  (null, 'Dog bite',         800000, 3000000, 'published', 'IRC; JVR Personal Injury Valuation Handbooks', 'Varies with injury severity and homeowner coverage.')
on conflict do nothing;

create or replace view v_call_reconciliation as
  select firm_id,
         count(*)                                        as received,
         count(*) filter (where status = 'analyzed')     as processed,
         count(*) filter (where status like 'excluded%') as excluded,
         count(*) filter (where status like 'failed%')   as failed
  from calls
  group by firm_id;

-- RLS: enable on new firm-data tables, NO policy yet (service role only). Item 10
-- adds firm-scoped policies. fee_value_ranges is reference data (service role).
alter table transcript_citations enable row level security;
alter table flag_confidence       enable row level security;
alter table analysis_versions     enable row level security;
alter table artifact_access_log   enable row level security;
alter table citation_failures     enable row level security;
alter table fee_value_ranges      enable row level security;
