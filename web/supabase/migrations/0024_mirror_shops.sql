-- Intake QA — "The Mirror" multi-channel mystery-shop audit (migration 0024).
--
-- SCOPE: Extends Spot Check Studio (0022) ADDITIVELY with a firm-facing intake
-- coverage audit: one "shop" per firm covering up to four contact channels
-- (after-hours call, weekend call, web form, website chat), each graded
-- CAPTURED / FUMBLED / LOST with ring count, response latency, and
-- human-vs-machine. Plus an anonymized peer-benchmark reference table whose
-- rows are SEED DATA until real cohort shops replace them (each row carries
-- `is_seed` + `source`, and the client-facing report is required to label
-- seed-backed benchmarks as illustrative — compliance-invariants §IV/§V).
--
-- NOTHING here modifies any existing table. Spot Check Studio (0022) is
-- untouched; `studio_shop_channels.spot_check_id` is a nullable FK so a shopped
-- call that was fully scored can link to its existing scorecard.
--
-- COMPLIANCE (enforced in the DB, not just the app):
--   * `studio_shops_final_requires_review` — a shop report cannot be finalized
--     until its AI-draftable narrative has been human-reviewed (same gate as
--     0022's spot checks; compliance-invariants §IV/§VII).
--   * `studio_shops_final_requires_protocol` — a shop report cannot be
--     finalized without an affirmative attestation that the fieldwork followed
--     the approved CIPA-safe mystery-shop protocol (fixed scenario, no
--     recording without a consent basis, scenario signed off BEFORE dialing —
--     compliance-invariants §II). The attestation text lives in
--     web/src/lib/studio/shops-content.mjs (SHOP_PROTOCOL_TEXT).
--
-- SECURITY MODEL: identical to 0022 — RLS enabled on every table; shop tables
-- owner-scoped to `created_by = auth.uid()`; the peer-benchmark reference table
-- is read-only to authenticated users (anonymized aggregates, no PII) and
-- writable only via service role / SQL.
--
-- Idempotent where practical (create-if-not-exists + drop-then-create policies).
-- Postgres/Supabase only (like 0022 — NOT part of the SQLite pilot pipeline).

-- ---------------------------------------------------------------------------
-- studio_shops — one mystery-shop engagement for one firm (the audit itself).
-- ---------------------------------------------------------------------------
create table if not exists studio_shops (
  id                          uuid primary key default gen_random_uuid(),
  firm_id                     uuid not null references studio_firms(id) on delete cascade,
  shopped_from                date,                 -- shop window start
  shopped_to                  date,                 -- shop window end
  market                      text,                 -- peer-cohort area label (matches studio_peer_benchmarks.market)
  scenario_key                text,                 -- the approved fixed scenario this shop ran (§II)
  -- CIPA-safe fieldwork attestation (compliance-invariants §II). Who/when is
  -- recorded; the CHECK below makes an unattested shop unfinalizable.
  protocol_attested           boolean not null default false,
  protocol_attested_at        timestamptz,
  protocol_text_version       text,
  -- Leakage estimate (same shape + math as 0022: attorney-supplied fee, all
  -- inputs printed on the report, blank if the firm supplied no number).
  leakage_inputs              jsonb,                -- { average_signed_case_fee, illustrative_monthly_recurrence }
  leakage_single_case         numeric,
  leakage_illustrative_annual numeric,
  -- AI-draftable prose behind the human-review gate (same pattern as 0022).
  narrative_failure           text,
  narrative_fix               text,
  narrative_reviewed          boolean not null default false,
  status                      text not null default 'draft' check (status in ('draft','final')),
  finalized_at                timestamptz,
  ref_code                    text,                 -- MS-YYYYMMDD-XXXX
  created_by                  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at                  timestamptz not null default now(),
  -- COMPLIANCE GATES (DB layer):
  constraint studio_shops_final_requires_review
    check (status <> 'final' or narrative_reviewed = true),
  constraint studio_shops_final_requires_protocol
    check (status <> 'final' or protocol_attested = true)
);

create index if not exists studio_shops_firm_idx on studio_shops(firm_id);

-- ---------------------------------------------------------------------------
-- studio_shop_channels — one row per shopped channel within a shop. The grade
-- is founder-entered structured fact (CAPTURED / FUMBLED / LOST), never an LLM
-- output. A channel row with grade NULL means "attempt logged, not yet graded";
-- ungraded channels are excluded from headline counts (like 0022's
-- "Not assessed" — never counted as a failure by default).
-- ---------------------------------------------------------------------------
create table if not exists studio_shop_channels (
  id                        uuid primary key default gen_random_uuid(),
  shop_id                   uuid not null references studio_shops(id) on delete cascade,
  channel                   text not null
    check (channel in ('after_hours_call','weekend_call','web_form','website_chat')),
  grade                     text
    check (grade is null or grade in ('captured','fumbled','lost')),
  ring_count                integer check (ring_count is null or ring_count >= 0),
  response_latency_seconds  integer check (response_latency_seconds is null or response_latency_seconds >= 0),
  answered_by               text
    check (answered_by is null or answered_by in ('human','machine','none')),
  attempted_at              timestamptz,            -- when the shop attempt was made
  notes                     text,                   -- analyst field notes (the evidence the narrative must trace to)
  -- If this shopped call was also fully scored in Spot Check Studio, link the
  -- scorecard (additive bridge to 0022 — never required).
  spot_check_id             uuid references studio_spot_checks(id) on delete set null,
  created_by                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at                timestamptz not null default now(),
  -- One row per channel per shop (enables idempotent upsert from the editor).
  constraint studio_shop_channels_unique unique (shop_id, channel)
);

create index if not exists studio_shop_channels_shop_idx on studio_shop_channels(shop_id);

-- ---------------------------------------------------------------------------
-- studio_peer_benchmarks — anonymized peer shop results for the ranked line
-- ("4th of 6 firms shopped in this area for after-hours response").
--
-- SEED DATA WARNING: rows inserted below are ILLUSTRATIVE SEED DATA
-- (source='seed', is_seed=true). The report layer MUST surface the seed label
-- whenever any contributing row has is_seed = true. Real cohort fieldwork
-- replaces rows (service role), not the schema. Peer firms are stored ONLY as
-- anonymous labels ("Peer A") — never named (compliance-invariants §V/§VI).
-- ---------------------------------------------------------------------------
create table if not exists studio_peer_benchmarks (
  id                        uuid primary key default gen_random_uuid(),
  market                    text not null,          -- cohort area label, e.g. 'sample-metro'
  channel                   text not null
    check (channel in ('after_hours_call','weekend_call','web_form','website_chat')),
  firm_label                text not null,          -- anonymized, e.g. 'Peer A'
  grade                     text
    check (grade is null or grade in ('captured','fumbled','lost')),
  ring_count                integer check (ring_count is null or ring_count >= 0),
  response_latency_seconds  integer check (response_latency_seconds is null or response_latency_seconds >= 0),
  answered_by               text
    check (answered_by is null or answered_by in ('human','machine','none')),
  source                    text not null default 'seed',   -- 'seed' | (later) a real fieldwork batch ref
  is_seed                   boolean not null default true,
  created_at                timestamptz not null default now()
);

create index if not exists studio_peer_benchmarks_market_channel_idx
  on studio_peer_benchmarks(market, channel);

-- ---------------------------------------------------------------------------
-- RLS — owner-scoped on shop tables (matching 0022); read-only reference
-- policy on the benchmark table.
-- ---------------------------------------------------------------------------
alter table studio_shops           enable row level security;
alter table studio_shop_channels   enable row level security;
alter table studio_peer_benchmarks enable row level security;

drop policy if exists studio_shops_owner_all on studio_shops;
create policy studio_shops_owner_all on studio_shops
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists studio_shop_channels_owner_all on studio_shop_channels;
create policy studio_shop_channels_owner_all on studio_shop_channels
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Benchmarks: anonymized aggregates, no PII — readable by any authenticated
-- user (in practice only the founder reaches this surface; middleware + the
-- founder guard sit above). NO insert/update/delete policy: writes happen only
-- via service role / SQL (real fieldwork batches land out-of-band).
drop policy if exists studio_peer_benchmarks_read on studio_peer_benchmarks;
create policy studio_peer_benchmarks_read on studio_peer_benchmarks
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- SEED DATA — clearly-labeled illustrative peer cohort for one sample market.
-- Every row: source='seed', is_seed=true. The report labels any benchmark
-- computed from these rows as "illustrative (seed data)". Idempotent: guarded
-- so re-running the migration never duplicates the cohort.
-- ---------------------------------------------------------------------------
insert into studio_peer_benchmarks
  (market, channel, firm_label, grade, ring_count, response_latency_seconds, answered_by, source, is_seed)
select * from (values
  -- After-hours call: 5 peers — most metro PI firms fumble or lose after-hours.
  ('sample-metro', 'after_hours_call', 'Peer A', 'captured', 2,     35,    'human',   'seed', true),
  ('sample-metro', 'after_hours_call', 'Peer B', 'fumbled',  6,     70,    'machine', 'seed', true),
  ('sample-metro', 'after_hours_call', 'Peer C', 'lost',     10,    null,  'none',    'seed', true),
  ('sample-metro', 'after_hours_call', 'Peer D', 'fumbled',  4,     55,    'machine', 'seed', true),
  ('sample-metro', 'after_hours_call', 'Peer E', 'lost',     8,     null,  'none',    'seed', true),
  -- Weekend call: 5 peers.
  ('sample-metro', 'weekend_call',     'Peer A', 'fumbled',  5,     60,    'machine', 'seed', true),
  ('sample-metro', 'weekend_call',     'Peer B', 'captured', 3,     40,    'human',   'seed', true),
  ('sample-metro', 'weekend_call',     'Peer C', 'lost',     12,    null,  'none',    'seed', true),
  ('sample-metro', 'weekend_call',     'Peer D', 'lost',     9,     null,  'none',    'seed', true),
  ('sample-metro', 'weekend_call',     'Peer E', 'fumbled',  4,     80,    'machine', 'seed', true),
  -- Web form: 5 peers — latency in seconds (3600 = 1h, 86400 = 1 day).
  ('sample-metro', 'web_form',         'Peer A', 'fumbled',  null,  14400, 'human',   'seed', true),
  ('sample-metro', 'web_form',         'Peer B', 'captured', null,  900,   'human',   'seed', true),
  ('sample-metro', 'web_form',         'Peer C', 'lost',     null,  null,  'none',    'seed', true),
  ('sample-metro', 'web_form',         'Peer D', 'fumbled',  null,  28800, 'machine', 'seed', true),
  ('sample-metro', 'web_form',         'Peer E', 'lost',     null,  null,  'none',    'seed', true),
  -- Website chat: 5 peers.
  ('sample-metro', 'website_chat',     'Peer A', 'lost',     null,  null,  'none',    'seed', true),
  ('sample-metro', 'website_chat',     'Peer B', 'fumbled',  null,  300,   'machine', 'seed', true),
  ('sample-metro', 'website_chat',     'Peer C', 'captured', null,  45,    'human',   'seed', true),
  ('sample-metro', 'website_chat',     'Peer D', 'lost',     null,  null,  'none',    'seed', true),
  ('sample-metro', 'website_chat',     'Peer E', 'fumbled',  null,  600,   'machine', 'seed', true)
) as seed(market, channel, firm_label, grade, ring_count, response_latency_seconds, answered_by, source, is_seed)
where not exists (
  select 1 from studio_peer_benchmarks where market = 'sample-metro' and source = 'seed'
);
