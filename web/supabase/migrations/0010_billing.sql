-- Intake QA — per-recovered-case billing (Postgres/Supabase twin of SQLite 0010).
--
-- PRICING MODEL (Rule 5.4): FLAT dollar fee per recovered case, never a % of the
-- attorney's fee. The recovered fee is NEVER a billing input — billable_events
-- has no recovered-fee column by design. Amounts are in CENTS.
--
-- RLS: firm-data tables (firm_billing, billable_events, invoices, invoice_lines)
-- get a firm-scoped policy; billing_plans (reference) + stripe_sim_log (operator)
-- get RLS enabled with NO policy (service role only).

create table if not exists billing_plans (
  id                         uuid primary key default gen_random_uuid(),
  name                       text not null unique,
  base_monthly_cents         integer not null default 0,
  per_case_fee_cents         integer not null default 0,
  per_case_fee_by_type       jsonb,
  monthly_case_fee_cap_cents integer,
  created_at                 timestamptz not null default now()
);

insert into billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_case_fee_cap_cents)
values
  ('pilot', 0,      0,     null),
  ('core',  150000, 50000, null),
  ('pro',   250000, 35000, 700000)
on conflict (name) do nothing;

create table if not exists firm_billing (
  id                        uuid primary key default gen_random_uuid(),
  firm_id                   uuid not null unique references firms(id) on delete cascade,
  plan_id                   uuid not null references billing_plans(id),
  status                    text not null default 'trialing'
                              check (status in ('trialing','active','paused','canceled')),
  billing_anchor_day        integer not null default 1 check (billing_anchor_day between 1 and 28),
  stripe_customer_id        text,
  guarantee_type            text not null default 'none'
                              check (guarantee_type in ('none','find_it_free')),
  guarantee_threshold_cents integer,
  guarantee_deadline        timestamptz,
  started_at                timestamptz not null default now()
);
create index if not exists idx_firm_billing_firm on firm_billing(firm_id);

create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references firms(id) on delete cascade,
  period      text not null,
  status      text not null default 'open' check (status in ('open','finalized','void')),
  total_cents integer not null default 0,
  created_at  timestamptz not null default now(),
  voided_at   timestamptz,
  void_reason text
);
create index if not exists idx_invoices_firm_period on invoices(firm_id, period);

create table if not exists billable_events (
  id                         uuid primary key default gen_random_uuid(),
  firm_id                    uuid not null references firms(id) on delete cascade,
  outcome_id                 uuid not null references outcomes(id),
  case_type                  text,
  per_case_fee_cents_applied integer not null,
  period                     text not null,
  status                     text not null default 'accrued'
                               check (status in ('accrued','invoiced','voided','disputed')),
  dispute_reason             text,
  invoice_id                 uuid references invoices(id),
  created_at                 timestamptz not null default now(),
  unique (outcome_id)
);
create index if not exists idx_billable_firm_period on billable_events(firm_id, period);
create index if not exists idx_billable_status on billable_events(status);

create table if not exists invoice_lines (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id),
  kind         text not null check (kind in ('base','per_case','cap_adjustment','guarantee_credit')),
  description  text not null,
  amount_cents integer not null,
  outcome_id   uuid references outcomes(id),
  snapshot     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_invoice_lines_invoice on invoice_lines(invoice_id);

create table if not exists stripe_sim_log (
  id         uuid primary key default gen_random_uuid(),
  firm_id    uuid references firms(id),
  action     text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_stripe_sim_firm on stripe_sim_log(firm_id);

-- RLS ------------------------------------------------------------------------
-- Reference + operator tables: enabled, no policy (service role only).
alter table billing_plans  enable row level security;
alter table stripe_sim_log enable row level security;

-- Firm-data tables: enabled with a firm-scoped policy.
alter table firm_billing    enable row level security;
alter table billable_events enable row level security;
alter table invoices        enable row level security;
alter table invoice_lines   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['firm_billing','billable_events','invoices']
  loop
    execute format('drop policy if exists %I_firm_all on %I', t, t);
    execute format(
      'create policy %I_firm_all on %I for all
         using (firm_id in (select current_user_firm_ids()))
         with check (firm_id in (select current_user_firm_ids()))',
      t, t);
  end loop;
end $$;

-- invoice_lines: scope through the parent invoice's firm_id.
drop policy if exists invoice_lines_firm_all on invoice_lines;
create policy invoice_lines_firm_all on invoice_lines
  for all
  using (
    exists (select 1 from invoices i
             where i.id = invoice_lines.invoice_id
               and i.firm_id in (select current_user_firm_ids())))
  with check (
    exists (select 1 from invoices i
             where i.id = invoice_lines.invoice_id
               and i.firm_id in (select current_user_firm_ids())));
