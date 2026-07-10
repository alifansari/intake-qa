-- Intake QA — on-call / acknowledgment model (migration 0027, Phase 4).
--
-- SCOPE: one config row per firm holding the on-call structure the pure
-- engine (web/src/lib/oncall/engine.mjs) validates and evaluates:
--   * role slots with humans mapped in (primary / backup / backstop chain)
--   * rotation (members + period), vacation holds, holiday calendar, swaps
--   * override precedence: manual hold > swap > holiday > rotation
--   * per-tier ack timeout ladders with re-alert cadence, ending in the
--     BACKSTOP (book a callback + raise an "escalation-unclaimed" alarm) —
--     coverage is ALWAYS assigned; "no silent gaps" is a validateConfig()
--     invariant, and the solo-friendly default maps every tier to the
--     founder with a protected fatality-tier floor.
--
-- The config lives as one validated jsonb document rather than five small
-- tables: the engine owns the shape (versioned), swaps/holidays are bounded
-- lists, and every read needs the whole document anyway. Escalation state
-- itself stays in 0026's tables (ack_deadline_at / acked_by / events).
--
-- Additive only. RLS firm-scoped.

create table if not exists firm_oncall (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  config      jsonb not null default '{}'::jsonb,   -- shape: see ONCALL_CONFIG_VERSION in engine.mjs
  updated_at  timestamptz not null default now(),
  constraint firm_oncall_unique unique (firm_id)
);

-- Waterfall position for the ack ladder (0 = primary target). Additive.
alter table escalations add column if not exists waterfall_step integer not null default 0;

alter table firm_oncall enable row level security;

drop policy if exists firm_oncall_firm_all on firm_oncall;
create policy firm_oncall_firm_all on firm_oncall
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
