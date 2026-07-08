-- Intake QA — subscription checkout + pricing reconciliation (migration 0019, Postgres dialect).
--
-- Postgres twin of db/migrations/0019_subscription_checkout.sql. Adds the Stripe
-- subscription id column and reconciles the flat-monthly plan prices to the
-- DECIDED numbers: Core $2,500, Pro $5,000, Charter $1,500 (intro -> Core).
--
-- PRICING MODEL (Rule 5.4 / B&P §§6151-6152 / SB 37): FLAT MONTHLY only, never
-- per recovered case / per signed client / percentage of recovery.

alter table firm_billing add column if not exists stripe_subscription_id text;

insert into billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_call_cap)
values
  ('core',    250000, 0, 400),
  ('pro',     500000, 0, 800),
  ('charter', 150000, 0, 400)
on conflict (name) do nothing;

update billing_plans
   set base_monthly_cents = 250000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = null, monthly_call_cap = 400
 where name = 'core';
update billing_plans
   set base_monthly_cents = 500000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = null, monthly_call_cap = 800
 where name = 'pro';
update billing_plans
   set base_monthly_cents = 150000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = null, monthly_call_cap = 400
 where name = 'charter';
