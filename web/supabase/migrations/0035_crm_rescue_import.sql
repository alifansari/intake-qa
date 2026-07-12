-- CRM dead-lead rescue import (Postgres/Supabase twin of SQLite
-- 0027_crm_rescue_import.sql). See that file's header for the model narrative.
--
-- RLS decisions:
--   * crm_import_batches / crm_leads: RLS ENABLED, NO POLICY -> service role
--     only. Both are the ANALYST's import/triage surface — an imported dead
--     lead must be invisible to the firm until a named reviewer confirms it
--     into the rescue conveyor (same invariant-d posture as review_queue_items).

create table if not exists crm_import_batches (
  id                 uuid primary key default gen_random_uuid(),
  firm_id            uuid not null references firms(id) on delete cascade,
  crm                text not null,
  filename           text,
  imported_by        text not null check (length(trim(imported_by)) > 0),
  row_count          integer not null default 0,
  surfaced_count     integer not null default 0,
  needs_info_count   integer not null default 0,
  screened_out_count integer not null default 0,
  skipped_count      integer not null default 0,
  rubric_version     text,
  created_at         timestamptz not null default now()
);
create index if not exists crm_import_batches_firm_idx on crm_import_batches(firm_id);

create table if not exists crm_leads (
  id                 uuid primary key default gen_random_uuid(),
  batch_id           uuid not null references crm_import_batches(id) on delete cascade,
  firm_id            uuid not null references firms(id) on delete cascade,
  crm                text not null,
  external_lead_id   text,
  prospect_name      text,
  prospect_phone     text,
  prospect_email     text,
  case_type          text,
  incident_date      date,
  lead_created_at    timestamptz,
  last_contact_at    timestamptz,
  crm_status         text,
  crm_substatus      text,
  attempts           integer,
  language           text,
  notes              text,
  verdict            text not null
                       check (verdict in ('rescue_candidate','needs_info','screened_out')),
  screen_reason      text,
  gap_kind           text,
  gap_basis          text,
  value_tier         text check (value_tier in ('standard','elevated','high')),
  value_tier_basis   text,
  sol_deadline       date,
  sol_days_remaining integer,
  sol_urgency        text,
  recoverability     real,
  rubric_version     text not null,
  call_id            uuid unique references calls(id),
  flag_id            uuid unique references flags(id),
  raw                jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists crm_leads_batch_idx on crm_leads(batch_id);
create index if not exists crm_leads_firm_idx  on crm_leads(firm_id, verdict);
create unique index if not exists crm_leads_external_idx
  on crm_leads(firm_id, crm, external_lead_id)
  where external_lead_id is not null;

alter table crm_import_batches enable row level security;
alter table crm_leads          enable row level security;
