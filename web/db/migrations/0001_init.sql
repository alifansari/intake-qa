-- Intake QA v1 — initial schema (migration 0001)
--
-- Dialect: written for SQLite (local dev via node:sqlite). The design maps
-- cleanly to Postgres for production; when Supabase/Postgres lands, the only
-- changes are:
--   * INTEGER PRIMARY KEY AUTOINCREMENT      -> BIGINT GENERATED ALWAYS AS IDENTITY
--   * INTEGER 0/1 boolean columns            -> BOOLEAN
--   * TEXT ISO timestamps + strftime default -> TIMESTAMPTZ DEFAULT now()
--   * CHECK(col IN (...)) enums              -> keep as-is, or native ENUM types
-- The column names, nullability, foreign keys, and CHECK constraints are identical.
--
-- Conventions:
--   * Every table has created_at (ISO-8601 UTC text) with a default.
--   * Booleans are INTEGER with CHECK(col IN (0,1)).
--   * Enums are TEXT with a CHECK constraint listing the allowed values.
--   * Money is stored as INTEGER whole US dollars (no cents) for the pilot.

PRAGMA foreign_keys = ON;

-- Firms -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firms (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT    NOT NULL,
  -- average contingency fee per signed case; feeds reconciliation math
  avg_case_fee       INTEGER NOT NULL DEFAULT 0,
  timezone           TEXT    NOT NULL DEFAULT 'America/Los_Angeles',
  subscription_price INTEGER,
  -- per-firm kill switch; starts ON (1 = all sends halted) for safety
  kill_switch        INTEGER NOT NULL DEFAULT 1 CHECK (kill_switch IN (0, 1)),
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Calls -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calls (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id          INTEGER NOT NULL REFERENCES firms(id),
  source           TEXT    NOT NULL CHECK (source IN ('callrail', 'manual')),
  external_call_id TEXT,                 -- CallRail id; null for manual uploads
  recording_url    TEXT,
  transcript       TEXT,                 -- nullable until transcription completes
  caller_phone     TEXT,
  caller_name      TEXT,
  received_at      TEXT    NOT NULL,     -- when the intake call came in (ISO-8601)
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_calls_firm ON calls(firm_id);

-- Flags -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flags (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id             INTEGER NOT NULL REFERENCES calls(id),
  firm_id             INTEGER NOT NULL REFERENCES firms(id),
  qualification_score INTEGER,           -- 0-100 overall score from the rubric
  is_leaked_signable  INTEGER NOT NULL DEFAULT 0 CHECK (is_leaked_signable IN (0, 1)),
  reason              TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_flags_call ON flags(call_id);
CREATE INDEX IF NOT EXISTS idx_flags_firm ON flags(firm_id);

-- Conversations ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id       INTEGER NOT NULL REFERENCES flags(id),
  firm_id       INTEGER NOT NULL REFERENCES firms(id),
  caller_phone  TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending_approval'
                  CHECK (status IN ('pending_approval', 'active', 'opted_out', 'handed_off', 'closed')),
  -- consent basis is REQUIRED (e.g. 'inbound_call_inquiry_EBR'); never empty
  consent_basis TEXT    NOT NULL CHECK (length(trim(consent_basis)) > 0),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_firm ON conversations(firm_id);
CREATE INDEX IF NOT EXISTS idx_conversations_flag ON conversations(flag_id);

-- Messages --------------------------------------------------------------------
-- Messages are NEVER hard-deleted. Retention purge sets `body` to NULL and
-- stamps `purged_at`, but the log row (direction, status, timestamps) remains.
CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  direction       TEXT    NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  body            TEXT,                  -- nullable so retention can purge it, keeping the row
  status          TEXT    NOT NULL
                    CHECK (status IN ('drafted', 'approved', 'sent', 'delivered', 'received', 'failed')),
  approved_by     TEXT,                  -- who approved the outbound send (human-in-the-loop)
  sent_at         TEXT,
  purged_at       TEXT,                  -- set when body was NULLed by retention
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Outcomes --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outcomes (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id        INTEGER NOT NULL REFERENCES conversations(id),
  result                 TEXT    NOT NULL
                           CHECK (result IN ('signed', 'booked_callback', 'no_response', 'opted_out', 'lost')),
  recovered_fee_estimate INTEGER,
  noted_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_outcomes_conversation ON outcomes(conversation_id);

-- Recoveries ------------------------------------------------------------------
-- Weekly rollup that feeds the reconciliation email.
CREATE TABLE IF NOT EXISTS recoveries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id         INTEGER NOT NULL REFERENCES firms(id),
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  signed          INTEGER NOT NULL DEFAULT 0 CHECK (signed IN (0, 1)),
  fee_amount      INTEGER,
  week_of         TEXT    NOT NULL,      -- ISO date of the week's Monday
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_recoveries_firm ON recoveries(firm_id);
CREATE INDEX IF NOT EXISTS idx_recoveries_week ON recoveries(week_of);
