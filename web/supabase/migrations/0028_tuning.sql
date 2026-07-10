-- Intake QA — de-escalation / false-positive tuning loop (migration 0028, Phase 5).
--
-- SCOPE: dispositions on resolved escalations + the monthly tuning proposals
-- derived from them. THE LOOP ONLY PROPOSES — an attorney approves every
-- change, and approval is a named action. Design rules baked in:
--   * "Didn't convert" is a SEPARATE axis (converted boolean) from
--     "false positive" — a real case that didn't sign is NOT a false alarm,
--     and conflating them would teach the system to stop catching real cases.
--   * false_positive REQUIRES a reason (CHECK) — no thumbs-down without why.
--   * right_call_bad_outcome exists so a correct escalation with an
--     unfortunate ending never counts against the trigger.
--   * Protected triggers can only be LOOSENED through the friction flow
--     (requires_friction + the recorded confirmation phrase); the engine
--     never auto-proposes loosening them.
--
-- Additive only. RLS: firm-scoped read; writes server-only.

create table if not exists escalation_dispositions (
  id             uuid primary key default gen_random_uuid(),
  escalation_id  uuid not null references escalations(id) on delete cascade,
  disposition    text not null
    check (disposition in ('true_positive','false_positive','right_call_bad_outcome')),
  fp_reason      text,
  -- SEPARATE from disposition: did the lead convert/sign? (nullable = unknown)
  converted      boolean,
  noted_by       text not null,
  note           text,
  created_at     timestamptz not null default now(),
  constraint escalation_dispositions_unique unique (escalation_id),
  -- A false positive without a stated reason is not a disposition, it's a mood.
  constraint escalation_dispositions_fp_reason
    check (disposition <> 'false_positive' or (fp_reason is not null and length(fp_reason) > 0))
);

create index if not exists escalation_dispositions_escalation_idx
  on escalation_dispositions(escalation_id);

create table if not exists tuning_proposals (
  id                 uuid primary key default gen_random_uuid(),
  firm_id            uuid references firms(id) on delete cascade,  -- null = demo/global
  trigger_key        text not null,
  current_tier       text not null check (current_tier in ('hot','warm','flagged')),
  proposed_action    text not null
    check (proposed_action in ('tier_downgrade','suppress','tier_restore','loosen_protected')),
  proposed_tier      text check (proposed_tier is null or proposed_tier in ('hot','warm','flagged')),
  rationale          jsonb not null default '{}'::jsonb,   -- precision stats behind the proposal
  sample_size        integer not null default 0,
  requires_friction  boolean not null default false,       -- protected-trigger loosening only
  friction_phrase    text,                                 -- the exact confirmation recorded at approval
  status             text not null default 'proposed'
    check (status in ('proposed','approved','rejected','expired')),
  decided_by         text,
  decided_at         timestamptz,
  created_at         timestamptz not null default now(),
  -- Approval is a NAMED action; a decided proposal must carry who decided.
  constraint tuning_proposals_decided_named
    check (status in ('proposed','expired') or (decided_by is not null and length(decided_by) > 0))
);

create index if not exists tuning_proposals_firm_idx on tuning_proposals(firm_id);
create index if not exists tuning_proposals_status_idx on tuning_proposals(status);

alter table escalation_dispositions enable row level security;
alter table tuning_proposals        enable row level security;

drop policy if exists escalation_dispositions_firm_read on escalation_dispositions;
create policy escalation_dispositions_firm_read on escalation_dispositions
  for select
  using (exists (
    select 1 from escalations e
    where e.id = escalation_dispositions.escalation_id
      and e.firm_id in (select current_user_firm_ids())
  ));

drop policy if exists tuning_proposals_firm_read on tuning_proposals;
create policy tuning_proposals_firm_read on tuning_proposals
  for select
  using (firm_id in (select current_user_firm_ids()));
