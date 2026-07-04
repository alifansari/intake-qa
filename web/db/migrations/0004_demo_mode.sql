-- Intake QA v1 — Demo Mode tables (migration 0004, SQLite dialect)
--
-- Demo Mode is the public, no-auth "upload one call and watch it get scored"
-- experience. It is HARD-ISOLATED from the firm pipeline: these tables have no
-- firm_id and never join to calls/conversations/messages, so a demo upload can
-- never become a real send. Audio bytes are never stored here (the temp file is
-- deleted after transcription); transcript + score are purged after 72h.
--
-- Postgres twin: web/supabase/migrations/0004_demo_mode.sql (RLS enabled, no
-- policy -> only the service role can read).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS demo_calls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ip     TEXT,                              -- best-effort, for rate limiting
  filename      TEXT,
  -- lifecycle: queued/transcribing/scoring are "active" (count toward the
  -- 1-concurrent limit); done/error are terminal.
  status        TEXT    NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','transcribing','scoring','done','error')),
  transcript    TEXT,                              -- purged at 72h
  result_json   TEXT,                              -- computed demo result (score, flag, fee-at-risk, preview)
  error         TEXT,
  audio_deleted INTEGER NOT NULL DEFAULT 0 CHECK (audio_deleted IN (0,1)),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS demo_calls_ip_idx      ON demo_calls(client_ip, created_at);
CREATE INDEX IF NOT EXISTS demo_calls_status_idx  ON demo_calls(status);
CREATE INDEX IF NOT EXISTS demo_calls_created_idx ON demo_calls(created_at);

-- Lead-gen capture: "email me this report". Stores only email + which demo call.
CREATE TABLE IF NOT EXISTS demo_leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_call_id INTEGER REFERENCES demo_calls(id) ON DELETE SET NULL,
  email        TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS demo_leads_call_idx ON demo_leads(demo_call_id);
