-- Intake QA v1 — migration 0003: e-sign / callback handoffs.
--
-- When a re-engaged caller signals intent-to-proceed we hand them off to SIGN
-- (Dropbox Sign, sandbox/TEST mode only) or BOOK a callback. This table records
-- that handoff. It is the correlation seam for the async e-sign COMPLETION
-- webhook, which only carries a `signature_request_id` — we look the handoff up
-- by that id to find the conversation, then write the outcome + recovery.
--
-- The outcome itself lands in the EXISTING `outcomes` / `recoveries` tables
-- (see 0001_init.sql); nothing about those changes.
--
-- Postgres mapping (per 0001 conventions):
--   * INTEGER PRIMARY KEY AUTOINCREMENT      -> BIGINT GENERATED ALWAYS AS IDENTITY
--   * INTEGER 0/1 columns                     -> BOOLEAN
--   * TEXT ISO timestamps + strftime default  -> TIMESTAMPTZ DEFAULT now()
--   * CHECK(col IN (...)) enums               -> keep as-is, or native ENUM types

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS handoffs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id       INTEGER NOT NULL REFERENCES conversations(id),
  firm_id               INTEGER NOT NULL REFERENCES firms(id),
  kind                  TEXT    NOT NULL CHECK (kind IN ('esign', 'callback')),
  provider              TEXT,                 -- 'dropbox_sign' for esign; null for callback
  signature_request_id  TEXT,                 -- Dropbox Sign id; correlates the completion webhook
  sign_url              TEXT,                 -- embedded OR plain signature link (test mode)
  embedded              INTEGER NOT NULL DEFAULT 0 CHECK (embedded IN (0, 1)),
  callback_requested_at TEXT,                 -- booked callback time (kind='callback')
  status                TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'canceled')),
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_handoffs_conversation ON handoffs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_firm ON handoffs(firm_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_sigreq ON handoffs(signature_request_id);
