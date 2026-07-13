-- Intake QA — durable per-call analysis (migration 0040, Postgres dialect).
-- Postgres twin of db/migrations/0032_call_analysis.sql. See that file for WHY.
--
-- ADDITIVE ONLY. Sibling to the frozen `flags` table, keyed by call_id. Firm-
-- scoped RLS matches the other firm-data tables (calls/flags/...): firm users
-- see only their own rows; the trusted service role bypasses RLS.

create table if not exists call_analyses (
  call_id                uuid primary key references calls(id) on delete cascade,
  firm_id                uuid not null references firms(id) on delete cascade,

  overall_score          integer,
  band                   text,
  case_signability       text,
  lost_signable          boolean not null default false,
  revenue_at_risk_cents  bigint,
  case_type              text,

  retainer_asked         boolean,
  next_step_specificity  text,
  contact_info_captured  text,

  cat_qualification      integer,
  cat_conversion         integer,
  cat_connection         integer,
  cat_risk_compliance    integer,
  cat_process            integer,

  summary                text,
  coaching_json          text,
  score_json             text,

  rep                    text,
  source                 text,
  model_version          text,
  created_at             timestamptz not null default now()
);
create index if not exists idx_call_analyses_firm on call_analyses(firm_id);

alter table call_analyses enable row level security;
drop policy if exists call_analyses_firm_all on call_analyses;
create policy call_analyses_firm_all on call_analyses
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
