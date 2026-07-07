-- Intake QA — reliability & money-integrity hardening (Postgres twin of SQLite 0020).
--
-- P0-3  messages.purged_at: retention scrubs message bodies but keeps the log row;
--        stamp when the body was nulled (SQLite already had this column).
-- P0-4a processed_stripe_events: Stripe webhook idempotency ledger (service-role).
-- P0-4b UNIQUE(firm_id, period) on invoices, excluding void rows.
--
-- Idempotent. Postgres/Supabase.

-- P0-3 ------------------------------------------------------------------------
alter table messages add column if not exists purged_at timestamptz;

-- P0-2 — consent_events already exists (supabase 0001); add `actor` for parity
-- with the SQLite twin so createConsentEvent can record who affirmed consent.
alter table consent_events add column if not exists actor text;

-- P0-4a -----------------------------------------------------------------------
create table if not exists processed_stripe_events (
  event_id     text primary key,
  event_type   text,
  processed_at timestamptz not null default now()
);
-- Service-role only (no firm identity); enable RLS with no policy like demo_calls.
alter table processed_stripe_events enable row level security;

-- P0-4b -----------------------------------------------------------------------
create unique index if not exists uq_invoices_firm_period
  on invoices(firm_id, period)
  where status <> 'void';
