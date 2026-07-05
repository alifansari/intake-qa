-- Intake QA — per-firm feature flags (Postgres/Supabase twin of SQLite 0008).
--
-- Ground rule 0.5: every enhancement ships behind a per-firm feature flag,
-- default OFF. A missing row means OFF (default-off is a code decision).
--
-- Firm-scoped data -> RLS ENABLED WITH a firm-scoped policy, matching the other
-- firm-data tables (calls/flags/conversations/...). The trusted service role
-- (operator toggles) bypasses RLS; firm users see only their own flags.

create table if not exists firm_features (
  id         uuid primary key default gen_random_uuid(),
  firm_id    uuid not null references firms(id) on delete cascade,
  feature    text not null,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (firm_id, feature)
);
create index if not exists firm_features_firm_idx on firm_features(firm_id);

alter table firm_features enable row level security;
drop policy if exists firm_features_firm_all on firm_features;
create policy firm_features_firm_all on firm_features
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
