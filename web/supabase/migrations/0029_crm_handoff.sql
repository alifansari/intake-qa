-- Intake QA — CRM handoff queue (migration 0029, Phase 7).
--
-- SCOPE: the durable queue between the canonical intake record and a firm's
-- CRM. NO REAL CRM IS CONNECTED: the only connector implementation is the
-- in-memory mock (web/src/lib/crm/mock.mjs); real Lead Docket / Filevine /
-- Litify / Clio credentials are gated on explicit per-integration sign-off
-- (compliance-invariants §VII, ROADMAP.md). Provider field maps live in the
-- existing firm_integrations.field_map (0012).
--
-- DATA CONTRACT (enforced in code, stated here):
--   * CREATE-ONLY. The connector port has no update/merge method — the AI can
--     never edit an existing matter. Probable duplicates are FLAGGED for a
--     human (status 'duplicate_flagged'), never merged.
--   * REVIEW POSTURE per item: 'review_then_write' (default — a person
--     approves before anything is written) or 'write_then_flag' (written
--     immediately, visually flagged as AI-captured until verified).
--   * IDEMPOTENT: one queue item per (lead, provider); the worker never
--     double-creates. Failures retry with backoff (attempts/next_attempt_at)
--     until abandoned.
--   * LEAST DATA NECESSARY: the queued payload is the MAPPED record (native
--     fields + one labeled notes block), never raw events or transcripts.
--     The consent flag travels inside the payload always.
--
-- Additive only. RLS firm-scoped read; writes server-only.

create table if not exists crm_handoff_queue (
  id               uuid primary key default gen_random_uuid(),
  firm_id          uuid references firms(id) on delete cascade,
  lead_id          uuid not null references intake_leads(id) on delete cascade,
  provider         text not null
    check (provider in ('leaddocket','filevine','litify','clio','mock')),
  idempotency_key  text not null,
  payload          jsonb not null default '{}'::jsonb,     -- the MAPPED record
  review_posture   text not null default 'review_then_write'
    check (review_posture in ('review_then_write','write_then_flag')),
  status           text not null default 'queued'
    check (status in ('queued','review','approved','written','duplicate_flagged','failed','abandoned')),
  attempts         integer not null default 0,
  next_attempt_at  timestamptz,
  last_error       text,
  external_id      text,                                    -- the CRM's id after a successful create
  duplicate_of     text,                                    -- external id the human should compare against
  approved_by      text,                                    -- named review approval
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint crm_handoff_queue_idempotent unique (idempotency_key)
);

create index if not exists crm_handoff_queue_status_idx on crm_handoff_queue(status);
create index if not exists crm_handoff_queue_lead_idx on crm_handoff_queue(lead_id);

alter table crm_handoff_queue enable row level security;

drop policy if exists crm_handoff_queue_firm_read on crm_handoff_queue;
create policy crm_handoff_queue_firm_read on crm_handoff_queue
  for select
  using (firm_id in (select current_user_firm_ids()));
