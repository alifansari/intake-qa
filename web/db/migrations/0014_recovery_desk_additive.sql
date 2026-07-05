-- Intake QA — recovery-desk additive schema (migration 0014, SQLite dialect).
--
-- ADDITIVE ONLY. No existing table's behavior changes; the frozen scoring/flagging/
-- gate logic and its tests are untouched. New sibling tables + columns support:
-- transcript citations (item 6), confidence tiers (item 7), version stamping,
-- artifact access logging (item 10), citation-failure logging, fee-value ranges
-- (item 12), demo mode (item 15), and the call-reconciliation invariant (item 9).
--
-- Schema note: the product has no separate `analyses` table — a `flags` row IS the
-- per-call analysis unit — so confidence/citations/versions reference flags(id).
-- Postgres twin: web/supabase/migrations/0014_recovery_desk_additive.sql.

PRAGMA foreign_keys = ON;

-- Demo mode (item 15): synthetic firms excluded from real metrics.
ALTER TABLE firms ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1));

-- Terminal call status feeds the reconciliation invariant (item 9). Nullable until
-- the pipeline sets it; population lands with the Inngest pipeline gate.
ALTER TABLE calls ADD COLUMN status TEXT;              -- 'analyzed' | 'excluded_*' | 'failed_*' | null
ALTER TABLE calls ADD COLUMN status_reason TEXT;       -- human-readable exclusion/failure reason

-- Transcript citations (item 6): every qualifying fact / flag rationale carries a
-- verbatim snippet + time window; the citation guard validates and bands these.
CREATE TABLE IF NOT EXISTS transcript_citations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id          INTEGER NOT NULL REFERENCES flags(id),
  fact_kind        TEXT    NOT NULL,                    -- 'qualifying_fact' | 'flag_rationale'
  start_ms         INTEGER NOT NULL,
  end_ms           INTEGER NOT NULL,
  verbatim_snippet TEXT    NOT NULL,
  validation_score REAL,                                -- partial-ratio 0-100 from the guard
  status           TEXT    NOT NULL DEFAULT 'needs_review'
                     CHECK (status IN ('passed', 'needs_review', 'failed')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_citations_flag ON transcript_citations(flag_id);

-- Confidence tier (item 7): SIBLING row — never mutates the frozen flags table.
CREATE TABLE IF NOT EXISTS flag_confidence (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id         INTEGER NOT NULL UNIQUE REFERENCES flags(id),
  confidence_tier TEXT    NOT NULL CHECK (confidence_tier IN ('strong', 'moderate')),
  rubric_version  TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Version stamping (item 7): auditability of every analysis.
CREATE TABLE IF NOT EXISTS analysis_versions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id        INTEGER NOT NULL REFERENCES flags(id),
  model_version  TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rubric_version TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_flag ON analysis_versions(flag_id);

-- Artifact access log (item 10): every view/download of a statement/readout/audio.
CREATE TABLE IF NOT EXISTS artifact_access_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id       INTEGER NOT NULL REFERENCES firms(id),
  actor         TEXT    NOT NULL,
  artifact_type TEXT    NOT NULL,
  artifact_id   TEXT    NOT NULL,
  action        TEXT    NOT NULL,
  at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_artifact_access_firm ON artifact_access_log(firm_id);

-- Citation-failure log (item 6): dropped facts land here for Ali's review.
CREATE TABLE IF NOT EXISTS citation_failures (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id      INTEGER REFERENCES flags(id),
  snippet      TEXT NOT NULL,
  nearest_text TEXT,
  score        REAL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Fee-value ranges (item 12): published-source ranges; firm historicals override
-- later. Money in CENTS. Values are CASE-VALUE ranges; the fee module (item 12)
-- applies the firm's contingency %. Ranges only — never a point estimate.
CREATE TABLE IF NOT EXISTS fee_value_ranges (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id       INTEGER REFERENCES firms(id),           -- null = global published row
  case_type     TEXT    NOT NULL,
  low_cents     INTEGER NOT NULL,
  high_cents    INTEGER NOT NULL,
  basis         TEXT    NOT NULL CHECK (basis IN ('published', 'firm_historical')),
  source        TEXT    NOT NULL,
  notes         TEXT,
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_fee_ranges_lookup ON fee_value_ranges(firm_id, case_type);

-- Seed a few published CASE-VALUE ranges (item 12). Ranges only; sourced.
-- TODO(Ali): add firm-historical rows (which override these) + confirm contingency %.
INSERT INTO fee_value_ranges (firm_id, case_type, low_cents, high_cents, basis, source, notes)
VALUES
  (NULL, 'Auto — rear-end', 1800000, 4500000, 'published', 'IRC "Paid in Full" (2023); JVR Personal Injury Valuation Handbooks', 'Auto BI settlement range; excludes policy limits and comparative fault.'),
  (NULL, 'Slip & fall',     1500000, 5000000, 'published', 'JVR Personal Injury Valuation Handbooks', 'Wide range by liability clarity and injury severity.'),
  (NULL, 'Dog bite',         800000, 3000000, 'published', 'IRC; JVR Personal Injury Valuation Handbooks', 'Varies with injury severity and homeowner coverage.');

-- Reconciliation invariant (item 9): received = processed + excluded + failed.
DROP VIEW IF EXISTS v_call_reconciliation;
CREATE VIEW v_call_reconciliation AS
  SELECT firm_id,
         COUNT(*)                                                   AS received,
         COUNT(*) FILTER (WHERE status = 'analyzed')                AS processed,
         COUNT(*) FILTER (WHERE status LIKE 'excluded%')            AS excluded,
         COUNT(*) FILTER (WHERE status LIKE 'failed%')              AS failed
  FROM calls
  GROUP BY firm_id;
