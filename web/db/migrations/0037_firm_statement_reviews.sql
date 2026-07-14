-- Intake QA — firm-pipeline statement review gate (migration 0037, SQLite dialect).
--
-- Tiered / sampled review for the ongoing Monthly Missed-Revenue Statement — the
-- REAL firm-pipeline product (calls/flags/flag_confidence/citation_failures/
-- call_analyses), NOT the demo-isolated audit_sessions. A statement for one
-- (firm, period 'YYYY-MM') auto-releases only when EVERY leaked flag is
-- engine-scored + evidence-verified (strong confidence, zero citation-guard
-- failures, under the dollar line); otherwise it holds in analyst_review for a
-- human sign-off. The citation guard remains the universal §IV floor either way.
--
-- Gated at the app layer by SAMPLED_REVIEW_ENABLED (DEFAULT OFF). With the flag
-- OFF nothing writes here, so this table is inert and the statement path is
-- byte-identical to today.
--
-- ADDITIVE ONLY. Sibling keyed by (firm_id, period); the frozen scoring/flagging
-- pipeline is untouched. Postgres twin: supabase/migrations/0045_firm_statement_reviews.sql.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firm_statement_reviews (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id             INTEGER NOT NULL REFERENCES firms(id),
  period              TEXT    NOT NULL,                    -- 'YYYY-MM'
  report_status       TEXT    NOT NULL DEFAULT 'draft'
                        CHECK (report_status IN ('draft', 'analyst_review', 'released')),
  -- Provenance is the honest label for HOW the statement cleared review:
  -- 'analyst_reviewed' (a human signed off) or 'engine_scored' (auto-released,
  -- every flag evidence-verified). NULL until a status is decided. Never implies
  -- human review that did not happen (§IV / §V).
  provenance          TEXT    CHECK (provenance IN ('analyst_reviewed', 'engine_scored')),
  auto_count          INTEGER NOT NULL DEFAULT 0,          -- flags that were auto_eligible
  force_review_count  INTEGER NOT NULL DEFAULT 0,          -- flags that forced human review
  released_at         TEXT,
  released_by         TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id, period)
);
CREATE INDEX IF NOT EXISTS idx_firm_statement_reviews_firm ON firm_statement_reviews(firm_id);
