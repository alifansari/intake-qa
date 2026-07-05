-- Intake QA — CRM / outbound-webhook integrations (Postgres twin of SQLite 0012).
--
-- Per-firm export config; provider credentials stored ENCRYPTED at rest (never
-- plaintext). Firm-data -> RLS enabled WITH a firm-scoped policy.

create table if not exists firm_integrations (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references firms(id) on delete cascade,
  provider              text not null check (provider in ('leaddocket','filevine','webhook')),
  credentials_encrypted text,
  field_map             jsonb,
  webhook_url           text,
  webhook_secret        text,
  enabled               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (firm_id, provider)
);
create index if not exists idx_firm_integrations_firm on firm_integrations(firm_id);

alter table firm_integrations enable row level security;
drop policy if exists firm_integrations_firm_all on firm_integrations;
create policy firm_integrations_firm_all on firm_integrations
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));
