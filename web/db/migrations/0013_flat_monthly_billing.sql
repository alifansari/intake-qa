-- Intake QA — flat-monthly billing (migration 0013, SQLite dialect).
--
-- PRICING MODEL CHANGE: billing is now a FLAT MONTHLY SUBSCRIPTION, tiered by
-- analyzed-call volume. It is NEVER charged per recovered case, per signed
-- client, or as a percentage of any recovery. This supersedes the per-case
-- model from 0010: a fee tied to whether a case is signed/recovered risks
-- characterization as "capping" under Cal. Bus. & Prof. Code §§6151-6152 (now
-- backed by SB 37's private right of action). A flat monthly analysis fee does
-- not.
--
-- The per-case COLUMNS (per_case_fee_cents, monthly_case_fee_cap_cents) and the
-- billable_events table are LEFT IN PLACE so historical invoices remain
-- readable; they are simply no longer used by the billing engine, and every
-- plan's per-case fee is zeroed below.
--
-- Postgres twin: web/supabase/migrations/0013_flat_monthly_billing.sql.
-- The tier prices + call caps mirror web/src/lib/site-constants.ts PRICING_TIERS.

PRAGMA foreign_keys = ON;

-- Analyzed-call volume a plan covers. NULL = uncapped (pilot). Exceeding the cap
-- flags an upgrade conversation in the operator console; it is NEVER auto-billed.
ALTER TABLE billing_plans ADD COLUMN monthly_call_cap INTEGER;

-- No plan charges per recovered case anymore.
UPDATE billing_plans
   SET per_case_fee_cents = 0,
       per_case_fee_by_type = NULL,
       monthly_case_fee_cap_cents = NULL;

-- Flat monthly tiers (idempotent insert; prices confirmed July 2026).
INSERT OR IGNORE INTO billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_call_cap)
VALUES
  ('tier_1', 50000,  0, 150),
  ('tier_2', 90000,  0, 400),
  ('tier_3', 150000, 0, 800);

-- Ensure prices + caps are correct even if the rows already existed.
UPDATE billing_plans SET base_monthly_cents = 50000,  monthly_call_cap = 150 WHERE name = 'tier_1';
UPDATE billing_plans SET base_monthly_cents = 90000,  monthly_call_cap = 400 WHERE name = 'tier_2';
UPDATE billing_plans SET base_monthly_cents = 150000, monthly_call_cap = 800 WHERE name = 'tier_3';
