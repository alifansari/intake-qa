-- Intake QA — Leak Audit sessions (migration 0009, SQLite dialect).
--
-- The Leak Audit is the multi-call upgrade of Demo Mode: up to 10 calls uploaded
-- under one shareable session token, aggregated into a "$X/month leaking" report.
-- It lives entirely in the DEMO-ISOLATED world: audit_session_calls only ever
-- references demo_calls, never the firm pipeline. Nothing here can send.
--
-- Postgres twin: web/supabase/migrations/0009_audit_sessions.sql (RLS enabled,
-- NO policy -> service role only, matching demo_calls).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS audit_sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  token               TEXT    NOT NULL UNIQUE,          -- unguessable, shareable
  visitor_fingerprint TEXT,                             -- best-effort, for the 7-day cap
  monthly_call_volume INTEGER,                          -- caller-supplied; NULL -> assumed default
  email               TEXT,                             -- captured on the report (optional)
  status              TEXT    NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','completed','expired')),
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at          TEXT    NOT NULL                  -- 30 days out; report 404s after
);
CREATE INDEX IF NOT EXISTS audit_sessions_token_idx ON audit_sessions(token);
CREATE INDEX IF NOT EXISTS audit_sessions_fp_idx    ON audit_sessions(visitor_fingerprint, created_at);

-- Link table: which demo_calls belong to an audit session (isolation preserved —
-- these are demo_calls, not firm calls).
CREATE TABLE IF NOT EXISTS audit_session_calls (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  demo_call_id INTEGER NOT NULL REFERENCES demo_calls(id) ON DELETE CASCADE,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (session_id, demo_call_id)
);
CREATE INDEX IF NOT EXISTS audit_session_calls_session_idx ON audit_session_calls(session_id);
