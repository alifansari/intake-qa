-- Intake QA — escalation engine (migration 0026, Phase 3).
--
-- SCOPE: escalations derived from canonical intake records (0025), their
-- append-only event log, and per-firm threshold config. ALERT DELIVERY IS
-- MOCKED: web/src/lib/escalation/alert-sender.mjs is an injectable port and
-- the only implementation logs/simulates (event kind 'alert_attempted' with
-- simulated=true). No real SMS/call/push sender exists in this codebase —
-- connecting one is explicitly deferred (ROADMAP.md) and gated on sign-off.
--
-- DESIGN:
--   * Four trigger families: case_value | time_decay | competitive_loss |
--     human_judgment. Three tiers: hot | warm | flagged.
--   * OVER-ESCALATION IS THE SAFE DEFAULT — rules err toward firing; the
--     Phase-5 tuning loop proposes downgrades with attorney approval.
--   * PROTECTED triggers (emergency/catastrophic, gov claims-notice, SOL-near,
--     spoliation) cannot be disabled or downgraded by ordinary config — the
--     engine enforces it (engine.mjs mergeConfig), and Phase 5 adds the
--     friction-ful loosening flow.
--   * Lifecycle: fired → routed → acked → actioned → resolved (+ unclaimed
--     backstop, Phase 4). Timestamps hoisted; every transition is ALSO an
--     append-only escalation_events row ("every number drillable").
--
-- Additive only. RLS on everything (firm-scoped read; writes server-only).

create table if not exists firm_escalation_config (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  -- Per-trigger overrides: { "<trigger_key>": { "tier": "warm", "enabled": false } }
  -- Protected triggers ignore disable/downgrade here (engine-enforced).
  overrides   jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint firm_escalation_config_unique unique (firm_id)
);

create table if not exists escalations (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid references firms(id) on delete cascade,   -- null = demo/unattributed
  lead_id         uuid references intake_leads(id) on delete cascade,
  source          text not null default 'intake_chat',
  trigger_key     text not null,
  trigger_family  text not null
    check (trigger_family in ('case_value','time_decay','competitive_loss','human_judgment')),
  tier            text not null check (tier in ('hot','warm','flagged')),
  status          text not null default 'fired'
    check (status in ('fired','routed','acked','actioned','resolved','unclaimed')),
  reasons         jsonb not null default '[]'::jsonb,
  fired_at        timestamptz not null default now(),
  ack_deadline_at timestamptz,          -- set by the Phase-4 timeout ladder
  acked_at        timestamptz,
  acked_by        text,                 -- named ownership: ack = a person's name, not a system state
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists escalations_firm_idx on escalations(firm_id);
create index if not exists escalations_lead_idx on escalations(lead_id);
create index if not exists escalations_status_idx on escalations(status);

create table if not exists escalation_events (
  id             uuid primary key default gen_random_uuid(),
  escalation_id  uuid not null references escalations(id) on delete cascade,
  kind           text not null
    check (kind in ('fired','routed','alert_attempted','alert_suppressed','acked',
                    'actioned','resolved','waterfall','unclaimed','disposition')),
  actor          text,                  -- who/what caused it ('system', a person's name)
  payload        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists escalation_events_escalation_idx
  on escalation_events(escalation_id);

-- RLS: firm members read their firm's rows; all writes are server-side.
alter table firm_escalation_config enable row level security;
alter table escalations            enable row level security;
alter table escalation_events      enable row level security;

drop policy if exists firm_escalation_config_firm_all on firm_escalation_config;
create policy firm_escalation_config_firm_all on firm_escalation_config
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists escalations_firm_read on escalations;
create policy escalations_firm_read on escalations
  for select
  using (firm_id in (select current_user_firm_ids()));

drop policy if exists escalation_events_firm_read on escalation_events;
create policy escalation_events_firm_read on escalation_events
  for select
  using (exists (
    select 1 from escalations e
    where e.id = escalation_events.escalation_id
      and e.firm_id in (select current_user_firm_ids())
  ));
