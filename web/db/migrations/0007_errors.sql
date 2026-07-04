-- Intake QA v1 — operator error log (migration 0007, SQLite dialect).
--
-- A lightweight, always-on record of pipeline/webhook/API failures so an operator
-- can see what broke without digging through server logs. Writing here is
-- best-effort and must NEVER throw into the caller (a logging failure can't be
-- allowed to break the pipeline). firm_id is optional (some failures happen
-- before a firm is resolved). `context` is a small JSON blob for debugging.
--
-- Postgres twin: web/supabase/migrations/0007_errors.sql (RLS enabled, no policy
-- -> only the trusted service role reads/writes, matching demo/template tables).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS errors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT    NOT NULL,        -- e.g. 'webhook.callrail', 'pipeline.score', 'api.onboard'
  message    TEXT    NOT NULL,
  context    TEXT,                    -- optional JSON blob
  firm_id    INTEGER REFERENCES firms(id),
  alerted    INTEGER NOT NULL DEFAULT 0 CHECK (alerted IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS errors_created_idx ON errors(created_at);
CREATE INDEX IF NOT EXISTS errors_source_idx  ON errors(source);
