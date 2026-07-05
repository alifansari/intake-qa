-- Intake QA — peer benchmarking (migration 0011, SQLite dialect).
--
-- Anonymized cross-firm aggregates so a firm can answer "is my intake actually
-- bad?". Two safeguards: (1) a per-firm CONSENT flag (benchmark_data_sharing,
-- default OFF) — a firm's data is only ever included if it opts in; (2) a
-- k-ANONYMITY gate enforced in analytics/benchmarks.mjs — no snapshot is
-- produced or shown unless >= 5 consenting firms contribute. Snapshots hold ONLY
-- aggregate values + a contributor count — never any firm-identifiable data.
--
-- Postgres twin: web/supabase/migrations/0011_benchmarks.sql (snapshots are
-- aggregate/operator data -> RLS enabled, NO policy).

PRAGMA foreign_keys = ON;

-- Per-firm consent to contribute anonymized data (opt-in, default OFF).
ALTER TABLE firms ADD COLUMN benchmark_data_sharing INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  contributor_count        INTEGER NOT NULL,      -- number of consenting firms in this snapshot
  sample_size              INTEGER NOT NULL,      -- number of flags aggregated
  median_handling_score    REAL,
  q1_handling_score        REAL,
  q3_handling_score        REAL,
  leak_rate                REAL,                  -- 0..1 fraction of flags leaked-signable
  sign_rate_by_band        TEXT,                  -- JSON { weak, moderate, strong }
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_benchmark_created ON benchmark_snapshots(created_at);
