-- Intake QA — flat-monthly billing (Postgres/Supabase twin of SQLite 0013).
--
-- PRICING MODEL CHANGE: billing is now a FLAT MONTHLY SUBSCRIPTION, tiered by
-- analyzed-call volume. It is NEVER charged per recovered case, per signed
-- client, or as a percentage of any recovery. This supersedes the per-case
-- model from 0010: a fee tied to whether a case is signed/recovered risks
-- characterization as "capping" under Cal. Bus. & Prof. Code §§6151-6152 (now
-- backed by SB 37's private right of action). A flat monthly analysis fee does
-- not.
--
-- The per-case columns + billable_events table are LEFT IN PLACE so historical
-- invoices remain readable; they are simply no longer used, and every plan's
-- per-case fee is zeroed below. No RLS changes (no new firm-data tables).
--
-- The tier prices + call caps mirror web/src/lib/site-constants.ts PRICING_TIERS.

-- Analyzed-call volume a plan covers. NULL = uncapped (pilot). Exceeding the cap
-- flags an upgrade conversation in the operator console; it is NEVER auto-billed.
alter table billing_plans add column if not exists monthly_call_cap integer;

-- No plan charges per recovered case anymore.
update billing_plans
   set per_case_fee_cents = 0,
       per_case_fee_by_type = null,
       monthly_case_fee_cap_cents = null;

-- Flat monthly tiers (idempotent; prices confirmed July 2026).
insert into billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_call_cap)
values
  ('tier_1', 50000,  0, 150),
  ('tier_2', 90000,  0, 400),
  ('tier_3', 150000, 0, 800)
on conflict (name) do nothing;

-- Ensure prices + caps are correct even if the rows already existed.
update billing_plans set base_monthly_cents = 50000,  monthly_call_cap = 150 where name = 'tier_1';
update billing_plans set base_monthly_cents = 90000,  monthly_call_cap = 400 where name = 'tier_2';
update billing_plans set base_monthly_cents = 150000, monthly_call_cap = 800 where name = 'tier_3';
