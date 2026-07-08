-- Intake QA — subscription checkout + pricing reconciliation (migration 0019, SQLite dialect).
--
-- Adds the columns and plan rows needed for the click-to-buy -> paying ->
-- provisioned flow (Stripe subscription-mode Checkout + webhook provisioning),
-- and reconciles the seeded plan prices to the DECIDED numbers:
--
--   Core    $2,500/mo   (base_monthly_cents = 250000)
--   Pro     $5,000/mo   (base_monthly_cents = 500000)
--   Charter $1,500/mo   (base_monthly_cents = 150000; intro that steps up to Core)
--
-- PRICING MODEL (unchanged legal constraint, Rule 5.4 / B&P §§6151-6152 / SB 37):
-- FLAT MONTHLY only. Never per recovered case, per signed client, or a percentage
-- of any recovery. per_case_fee_cents stays 0 on every plan.
--
-- Postgres twin: web/supabase/migrations/0019_subscription_checkout.sql.

PRAGMA foreign_keys = ON;

-- Store the Stripe subscription id alongside the customer id so the webhook can
-- match subscription lifecycle events (payment_failed / past_due) back to a firm.
ALTER TABLE firm_billing ADD COLUMN stripe_subscription_id TEXT;

-- Reconcile the flat-monthly plan rows to the DECIDED numbers. Insert is
-- idempotent; the following UPDATEs make the prices correct even if the rows
-- (from 0010) already exist with the old amounts.
INSERT OR IGNORE INTO billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_call_cap)
VALUES
  ('core',    250000, 0, 400),
  ('pro',     500000, 0, 800),
  ('charter', 150000, 0, 400);

UPDATE billing_plans
   SET base_monthly_cents = 250000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = NULL, monthly_call_cap = 400
 WHERE name = 'core';
UPDATE billing_plans
   SET base_monthly_cents = 500000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = NULL, monthly_call_cap = 800
 WHERE name = 'pro';
UPDATE billing_plans
   SET base_monthly_cents = 150000, per_case_fee_cents = 0, monthly_case_fee_cap_cents = NULL, monthly_call_cap = 400
 WHERE name = 'charter';
