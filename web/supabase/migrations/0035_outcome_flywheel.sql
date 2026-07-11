-- Intake QA — outcome-data flywheel (migration 0035, Conveyor Increment 0).
--
-- SCOPE: the two thin siblings that turn the QA log into an outcome-labeled
-- corpus (intake facts -> the firm's decision -> realized net recovery). DARK,
-- backend-only: nothing user-facing reads these yet. Spec:
-- ops/drafts/engine-v2-conveyor-MVP.md §6 "Increment 0" + its AMENDMENT (the
-- answer_value data spine), and ops/drafts/intake-fact-sheet-spec.md §3 (what
-- the spine must capture for non-lossiness).
--
-- DATA CONTRACT (enforced in code, stated here):
--   * SIBLINGS ONLY. The frozen flags row / ScoredCall passthrough is never
--     edited — both tables key to call_id (+ optional flag_id), per CLAUDE.md.
--   * IMMUTABLE SNAPSHOT: case_disposition.intake_feature_snapshot is written
--     once, at decision time (what was KNOWN then — backbone facts + question-
--     check states + answer_values). Repository upserts never overwrite it.
--   * CENSORED, NEVER ZERO: every case_outcome money/duration column is
--     nullable and has NO default. A missing value means "not yet known /
--     censored", never $0. Open cases are right-censored (end_state 'open',
--     financials null). Declines are censored too — never assume declined =
--     worthless (that's circular).
--   * INTAKE QA IS NOT THE SYSTEM OF RECORD — the firm's CMS wins on conflict.
--     external_case_ref (CMS matter id: Filevine/Litify/Clio) is the join key
--     that cannot be backfilled later.
--   * NO PER-STAFFER SCORING: decided_by is a ROLE (e.g. 'attorney',
--     'intake_manager'), never a scored staffer identity.
--   * AUDIT TRAIL: case_outcome edits bump outcome_version and append the
--     prior snapshot to edits (same pattern as the existing Outcome record).
--   * DELETION CASCADE (§VI): both tables cascade from firms/calls.
--
-- Additive only. RLS firm-scoped read; writes server-only.

create table if not exists case_disposition (
  id                      uuid primary key default gen_random_uuid(),
  call_id                 uuid not null references calls(id) on delete cascade,
  flag_id                 uuid references flags(id) on delete set null,
  firm_id                 uuid not null references firms(id) on delete cascade,
  disposition             text not null
    check (disposition in ('signed','developing','referred_out','declined','no_action')),
  decided_by              text not null,      -- ROLE text, never a scored staffer
  decided_at              timestamptz not null,
  -- Immutable: what was KNOWN at decision time (backbone facts + question-check
  -- states + typed answer_values). Written once; never updated (code-enforced).
  intake_feature_snapshot jsonb not null default '{}'::jsonb,
  external_case_ref       text,               -- CMS matter id; null until the firm supplies it
  created_at              timestamptz not null default now(),
  constraint case_disposition_call_unique unique (call_id)
);

create index if not exists case_disposition_firm_idx on case_disposition(firm_id);
create index if not exists case_disposition_flag_idx on case_disposition(flag_id);

create table if not exists case_outcome (
  id                      uuid primary key default gen_random_uuid(),
  call_id                 uuid not null references calls(id) on delete cascade,
  firm_id                 uuid not null references firms(id) on delete cascade,
  end_state               text not null default 'open'
    check (end_state in ('settled','tried','dropped','withdrew','referred_resolved','open')),
  -- ALL money columns nullable with NO default: missing = censored, never 0.
  gross                   numeric,
  costs_advanced          numeric,
  lien_load               numeric,
  net_to_client           numeric,
  net_fee_to_firm         numeric,
  referral_fee            numeric,
  time_to_resolution_days numeric,
  -- Demand milestones (Increment 0 AMENDMENT): intake facts -> demand -> recovery.
  demand_sent_at          timestamptz,
  demand_amount           numeric,
  first_offer             numeric,
  outcome_version         integer not null default 1,
  edits                   jsonb not null default '[]'::jsonb,  -- append-only prior snapshots
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint case_outcome_call_unique unique (call_id)
);

create index if not exists case_outcome_firm_idx on case_outcome(firm_id);
create index if not exists case_outcome_end_state_idx on case_outcome(end_state);

-- RLS: firm members read their firm's rows; all writes are server-side.
alter table case_disposition enable row level security;
alter table case_outcome     enable row level security;

drop policy if exists case_disposition_firm_read on case_disposition;
create policy case_disposition_firm_read on case_disposition
  for select
  using (firm_id in (select current_user_firm_ids()));

drop policy if exists case_outcome_firm_read on case_outcome;
create policy case_outcome_firm_read on case_outcome
  for select
  using (firm_id in (select current_user_firm_ids()));
