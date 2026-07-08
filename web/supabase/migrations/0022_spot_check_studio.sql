-- Intake QA — Spot Check Studio (founder-only tool) schema + RLS (migration 0022).
--
-- SCOPE: These tables back the "/studio/*" Spot Check Studio, a FOUNDER-ONLY tool
-- where Ali uploads a firm's own consented intake calls, runs the existing
-- leak-audit pipeline on them, and generates a one-page "Intake Quality Audit —
-- Spot Check" scorecard. They are Supabase-only (NOT part of the JSON/SQLite pilot
-- pipeline) and are HARD-ISOLATED from the product tables.
--
-- NAMING NOTE: the spec named these tables `firms` / `spot_checks` / `recordings`,
-- but `firms` ALREADY EXISTS in 0001_init.sql with a different shape (product firm
-- accounts), and re-defining it would clobber the product. To avoid any collision
-- and keep the Studio hard-isolated, every table here is prefixed `studio_`. The
-- columns/semantics are exactly as specified.
--
-- SECURITY MODEL (defense in depth — this is the DB layer):
--   * RLS is ENABLED on every table with a policy scoped to `created_by = auth.uid()`
--     (CLAUDE.md hard requirement; the Studio is single-user so the owner is also
--     the only reader/writer). Middleware + a shared server guard enforce the
--     FOUNDER_EMAIL allowlist ABOVE this layer; RLS is the last line of defense.
--   * A CHECK constraint makes it IMPOSSIBLE to insert a recording without
--     consent_attested = true (CIPA / all-party consent, compliance-invariants §II).
--
-- Idempotent where practical (create-if-not-exists + drop-then-create policies).
-- Postgres/Supabase only (SQLite has no RLS).

-- ---------------------------------------------------------------------------
-- studio_firms — the firm a spot check is about (Ali's own working record; NOT a
-- product firm account). Minimal contact block for the scorecard header.
-- ---------------------------------------------------------------------------
create table if not exists studio_firms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  phone       text,
  website     text,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- studio_spot_checks — one scorecard. The headline score/grade is computed by the
-- DETERMINISTIC rubric in TypeScript from `dimension_inputs` + `critical_fails`
-- (NO LLM in the number). `narrative_failure`/`narrative_fix` are AI-DRAFTED prose
-- that a human must review (narrative_reviewed) before status can reach 'final'.
-- ---------------------------------------------------------------------------
create table if not exists studio_spot_checks (
  id                          uuid primary key default gen_random_uuid(),
  firm_id                     uuid not null references studio_firms(id) on delete cascade,
  tested_at                   timestamptz,
  scenario_key                text,
  touchpoints                 jsonb not null default '[]'::jsonb,
  dimension_inputs            jsonb not null default '{}'::jsonb,  -- the six rubric inputs (0/50/100 each)
  critical_fails              jsonb not null default '[]'::jsonb,  -- checked critical-fail keys (cap grade at F)
  notes                       text,
  computed_score              integer,                             -- 0-100, from the deterministic rubric
  computed_grade              text,                                -- A/B/C/D/F, from the rubric + critical-fail override
  dimension_scores            jsonb,                               -- per-dimension weighted contribution (for the exhibit)
  leakage_inputs              jsonb,                               -- { average_signed_case_fee, illustrative_monthly_recurrence }
  leakage_single_case         numeric,
  leakage_illustrative_annual numeric,
  narrative_failure           text,
  narrative_fix               text,
  narrative_reviewed          boolean not null default false,      -- review gate: must be true to finalize/print
  status                      text not null default 'draft' check (status in ('draft','final')),
  finalized_at                timestamptz,
  ref_code                    text,
  created_by                  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at                  timestamptz not null default now(),
  -- COMPLIANCE GATE (enforced in the DB, not just the app): a scorecard cannot be
  -- 'final' unless its AI-drafted narrative has been human-reviewed. No unreviewed
  -- AI text can ever reach a finalized/printed scorecard (compliance-invariants IV/VII).
  constraint studio_spot_checks_final_requires_review
    check (status <> 'final' or narrative_reviewed = true)
);

create index if not exists studio_spot_checks_firm_idx on studio_spot_checks(firm_id);

-- ---------------------------------------------------------------------------
-- studio_recordings — the firm's own consented intake call(s) Ali uploads, plus
-- the transcript + frozen scoring the existing pipeline produces. The consent
-- attestation is stored IMMUTABLY alongside the file (who/when/what-version).
-- ---------------------------------------------------------------------------
create table if not exists studio_recordings (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references studio_firms(id) on delete cascade,
  spot_check_id         uuid references studio_spot_checks(id) on delete set null,
  storage_path          text not null,
  original_filename     text not null,
  source                text not null default 'firm_supplied',
  -- Consent attestation (CIPA / all-party consent — compliance-invariants §II).
  consent_attested      boolean not null,
  consent_attested_by   uuid references auth.users(id),
  consent_attested_at   timestamptz,
  consent_text_version  text,
  transcript            text,
  scoring               jsonb,
  transcribed_at        timestamptz,
  created_by            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  -- HARD CONSTRAINT: a recording row CANNOT exist without an affirmative consent
  -- attestation. Enforced here so no app bug can ever bypass it.
  constraint studio_recordings_requires_consent check (consent_attested = true)
);

create index if not exists studio_recordings_firm_idx on studio_recordings(firm_id);
create index if not exists studio_recordings_spot_check_idx on studio_recordings(spot_check_id);

-- ---------------------------------------------------------------------------
-- RLS — created_by = auth.uid() on every table (owner-only). The Studio is
-- single-user; the FOUNDER_EMAIL allowlist is enforced above this layer in
-- middleware and in every server action/route. RLS guarantees that even a leaked
-- anon token can only ever touch its own rows.
-- ---------------------------------------------------------------------------
alter table studio_firms       enable row level security;
alter table studio_spot_checks enable row level security;
alter table studio_recordings  enable row level security;

drop policy if exists studio_firms_owner_all on studio_firms;
create policy studio_firms_owner_all on studio_firms
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists studio_spot_checks_owner_all on studio_spot_checks;
create policy studio_spot_checks_owner_all on studio_spot_checks
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists studio_recordings_owner_all on studio_recordings;
create policy studio_recordings_owner_all on studio_recordings
  for all
  using (created_by = auth.uid())
  -- The WITH CHECK also re-asserts consent at the RLS layer (belt and suspenders
  -- with the table CHECK): no insert/update may leave consent unattested.
  with check (created_by = auth.uid() and consent_attested = true);

-- ---------------------------------------------------------------------------
-- Private Storage bucket for the firm's consented audio + owner-only object RLS.
-- Files live in a PRIVATE bucket (public = false); every upload/download goes
-- through a short-lived signed URL created by the server (service-role), exactly
-- like the existing demo-audio pattern in web/src/lib/supabase/storage.ts.
--
-- If your Supabase project restricts DDL on the storage schema from the SQL editor,
-- create the bucket "studio-audio" (PRIVATE) in the dashboard instead; the object
-- policies below are still the intended access model.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('studio-audio', 'studio-audio', false)
on conflict (id) do update set public = false;

-- Owner-only access to objects in the private bucket. `owner` is set by Supabase
-- Storage to the uploading user's auth.uid(); service-role bypasses RLS for the
-- server-side signed-URL/download path.
drop policy if exists studio_audio_owner_all on storage.objects;
create policy studio_audio_owner_all on storage.objects
  for all
  to authenticated
  using (bucket_id = 'studio-audio' and owner = auth.uid())
  with check (bucket_id = 'studio-audio' and owner = auth.uid());
