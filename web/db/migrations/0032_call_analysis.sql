-- Intake QA — durable per-call analysis (migration 0032, SQLite dialect).
--
-- WHY: the calibrated scoring engine produces a rich per-call analysis every run
-- (overall + category scores, case signability, the conversion signals, the
-- single biggest coaching miss with its quote/timestamp/model line, the top
-- strength, revenue-at-risk, a plain-English summary) — but the pipeline was
-- throwing ALL of it away, persisting only the four flag scalars. A firm could
-- never see "how a call went," and a call that scored well vanished into a
-- counter. This table durably stores the engine's output per call so the desk
-- can show (a) a per-call readout and (b) a team-wide scorecard.
--
-- ADDITIVE ONLY. The frozen `flags` decision logic is untouched; this is a
-- sibling keyed by call_id. Postgres twin: supabase/migrations/0040_call_analysis.sql.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS call_analyses (
  call_id                INTEGER PRIMARY KEY REFERENCES calls(id),
  firm_id                INTEGER NOT NULL REFERENCES firms(id),

  -- Headline verdict.
  overall_score          INTEGER,            -- 0-100 (scores.overall)
  band                   TEXT,               -- scores.band (e.g. 'needs_coaching')
  case_signability       TEXT,               -- 'signable' | 'possibly_signable' | 'needs_development' | ...
  lost_signable          INTEGER NOT NULL DEFAULT 0 CHECK (lost_signable IN (0,1)),
  revenue_at_risk_cents  INTEGER,            -- alerts.revenue_at_risk.amount_usd * 100 (null if none)
  case_type              TEXT,               -- humanized case type

  -- The four money moves (conversion signals). Booleans stored 0/1/null.
  retainer_asked         INTEGER,            -- conversion.retainer_asked
  next_step_specificity  TEXT,               -- 'specific' | 'vague' | 'none'
  contact_info_captured  TEXT,               -- 'full' | 'partial' | 'none'

  -- Category sub-scores (0-100) — persisted as columns so the team scorecard can
  -- AVG them without parsing JSON. Any may be null if the engine omitted it.
  cat_qualification      INTEGER,
  cat_conversion         INTEGER,
  cat_connection         INTEGER,
  cat_risk_compliance    INTEGER,
  cat_process            INTEGER,

  -- Human-readable payloads for the per-call readout.
  summary                TEXT,               -- 2-3 sentence plain-English summary
  coaching_json          TEXT,               -- {top_strength, one_thing} as JSON
  score_json             TEXT,               -- the full ScoredCall blob (source of truth)

  -- Provenance.
  rep                    TEXT,               -- intake rep, when known (null for uploads)
  source                 TEXT,               -- 'callrail' | 'manual'
  model_version          TEXT,
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_call_analyses_firm ON call_analyses(firm_id);
