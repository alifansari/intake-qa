-- Intake QA — per-recovered-case billing (migration 0010, SQLite dialect).
--
-- PRICING MODEL (legal-ethics constraint, Rule 5.4): billing is a FLAT DOLLAR
-- FEE PER RECOVERED CASE, never a percentage of the attorney's fee. The
-- recovered fee amount is NEVER an input to any billing calculation — note that
-- `billable_events` deliberately has NO recovered-fee column, so fee-derived
-- billing is structurally impossible. Recovered fees are shown for ROI only.
--
-- Money is in CENTS here (Stripe-native), unlike the whole-dollar pilot tables.
--
-- Postgres twin: web/supabase/migrations/0010_billing.sql. Firm-data tables get
-- RLS WITH a firm policy; billing_plans (reference) + stripe_sim_log (operator)
-- get RLS with NO policy (service role only).

PRAGMA foreign_keys = ON;

-- Plans are ROWS (not code) so the operator can change pricing without a deploy.
CREATE TABLE IF NOT EXISTS billing_plans (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  name                       TEXT    NOT NULL UNIQUE,
  base_monthly_cents         INTEGER NOT NULL DEFAULT 0,
  per_case_fee_cents         INTEGER NOT NULL DEFAULT 0,   -- FLAT per recovered case
  per_case_fee_by_type       TEXT,                          -- nullable JSON: {caseType: flatCents}
  monthly_case_fee_cap_cents INTEGER,                       -- nullable; caps case fees / month
  created_at                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Seed the three plans as DATA (idempotent). Pilots are free; core/pro are flat.
INSERT OR IGNORE INTO billing_plans
  (name, base_monthly_cents, per_case_fee_cents, monthly_case_fee_cap_cents)
VALUES
  ('pilot', 0,      0,     NULL),
  ('core',  150000, 50000, NULL),
  ('pro',   250000, 35000, 700000);

CREATE TABLE IF NOT EXISTS firm_billing (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id                   INTEGER NOT NULL UNIQUE REFERENCES firms(id),
  plan_id                   INTEGER NOT NULL REFERENCES billing_plans(id),
  status                    TEXT    NOT NULL DEFAULT 'trialing'
                              CHECK (status IN ('trialing','active','paused','canceled')),
  billing_anchor_day        INTEGER NOT NULL DEFAULT 1 CHECK (billing_anchor_day BETWEEN 1 AND 28),
  stripe_customer_id        TEXT,
  -- Risk-reversal guarantee (find-it-free): if we don't identify >= threshold in
  -- flagged fee-at-risk by the deadline, that period's base fee is auto-voided.
  guarantee_type            TEXT    NOT NULL DEFAULT 'none'
                              CHECK (guarantee_type IN ('none','find_it_free')),
  guarantee_threshold_cents INTEGER,
  guarantee_deadline        TEXT,
  started_at                TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_firm_billing_firm ON firm_billing(firm_id);

-- Invoices are NEVER hard-deleted, only voided (audit rule extended to finance).
CREATE TABLE IF NOT EXISTS invoices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id       INTEGER NOT NULL REFERENCES firms(id),
  period        TEXT    NOT NULL,                           -- 'YYYY-MM'
  status        TEXT    NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','finalized','void')),
  total_cents   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  voided_at     TEXT,
  void_reason   TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_firm_period ON invoices(firm_id, period);

-- One event per SIGNED, recovered case. NO recovered-fee column by design — the
-- fee applied comes from the plan, never from what the firm actually recovered.
CREATE TABLE IF NOT EXISTS billable_events (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id                    INTEGER NOT NULL REFERENCES firms(id),
  outcome_id                 INTEGER NOT NULL REFERENCES outcomes(id),
  case_type                  TEXT,                          -- nullable; drives optional flat override
  per_case_fee_cents_applied INTEGER NOT NULL,             -- FLAT fee snapshotted from the plan
  period                     TEXT    NOT NULL,              -- 'YYYY-MM'
  status                     TEXT    NOT NULL DEFAULT 'accrued'
                               CHECK (status IN ('accrued','invoiced','voided','disputed')),
  dispute_reason             TEXT,
  invoice_id                 INTEGER REFERENCES invoices(id),
  created_at                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- one billable event per outcome (idempotent accrual)
  UNIQUE (outcome_id)
);
CREATE INDEX IF NOT EXISTS idx_billable_firm_period ON billable_events(firm_id, period);
CREATE INDEX IF NOT EXISTS idx_billable_status ON billable_events(status);

-- Each line stores the full computation snapshot for audit (kind, description,
-- amount, and the case/outcome it traces to).
CREATE TABLE IF NOT EXISTS invoice_lines (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id),
  kind         TEXT    NOT NULL CHECK (kind IN ('base','per_case','cap_adjustment','guarantee_credit')),
  description  TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL,                            -- may be negative (credits)
  outcome_id   INTEGER REFERENCES outcomes(id),            -- set for per_case lines
  snapshot     TEXT,                                        -- JSON: plan/fee/cap math
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- Operator-only simulation log of would-be Stripe calls (test mode / no keys).
CREATE TABLE IF NOT EXISTS stripe_sim_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id    INTEGER REFERENCES firms(id),
  action     TEXT    NOT NULL,                              -- 'create_customer' | 'create_invoice' | 'finalize'
  payload    TEXT,                                          -- JSON of the would-be call
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_stripe_sim_firm ON stripe_sim_log(firm_id);
