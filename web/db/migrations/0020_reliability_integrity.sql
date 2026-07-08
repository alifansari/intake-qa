-- Intake QA — reliability & money-integrity hardening (migration 0020, SQLite).
--
-- P0-2  consent_events: firm-scoped consent log for the Live Coach (and any other
--        consent-relevant event). The Postgres twin already exists (supabase 0001);
--        the pilot's SQLite schema was missing it. A ConsentEvent MUST be written
--        before any mic/recording workflow opens.
-- P0-4a processed_stripe_events: idempotency ledger for the Stripe webhook. An
--        insert-if-absent at the top of the handler makes replayed events no-ops.
-- P0-4b UNIQUE(firm_id, period) on invoices: one invoice per firm per billing
--        period, so a double-close cannot mint a second invoice / second credit.
--
-- Idempotent: guarded with IF NOT EXISTS. Money stays in the existing units.

PRAGMA foreign_keys = ON;

-- P0-2 — consent log (twin of supabase/migrations/0001 consent_events). --------
CREATE TABLE IF NOT EXISTS consent_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id         INTEGER REFERENCES firms(id),
  conversation_id INTEGER REFERENCES conversations(id),
  basis           TEXT    NOT NULL CHECK (length(trim(basis)) > 0),
  detail          TEXT,
  actor           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_consent_events_firm ON consent_events(firm_id);

-- P0-4a — Stripe webhook idempotency ledger. -----------------------------------
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- P0-4b — one invoice per firm per period. A partial unique index tolerates the
-- historical 'void' rows (a re-issued invoice after a void is legitimate) while
-- still blocking a second live invoice for the same (firm_id, period).
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_firm_period
  ON invoices(firm_id, period)
  WHERE status <> 'void';
