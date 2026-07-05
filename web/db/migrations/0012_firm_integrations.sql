-- Intake QA — CRM / outbound-webhook integrations (migration 0012, SQLite).
--
-- Per-firm config for pushing our findings OUT to a firm's system of record
-- (Lead Docket, Filevine) or to a generic signed webhook. Provider credentials
-- are stored ENCRYPTED at rest (AES-256-GCM via integrations/crypto.mjs, keyed
-- by INTEGRATIONS_ENC_KEY) — never plaintext. Nothing here can send SMS; these
-- are export integrations, not the send chokepoint.
--
-- Postgres twin: web/supabase/migrations/0012_firm_integrations.sql (firm-data ->
-- RLS enabled WITH a firm-scoped policy).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firm_integrations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id               INTEGER NOT NULL REFERENCES firms(id),
  provider              TEXT    NOT NULL CHECK (provider IN ('leaddocket','filevine','webhook')),
  credentials_encrypted TEXT,                 -- AES-GCM ciphertext (never plaintext); nullable
  field_map             TEXT,                 -- JSON mapping our fields -> their fields
  webhook_url           TEXT,                 -- for provider='webhook' (or a per-provider base URL)
  webhook_secret        TEXT,                 -- shared secret for outbound HMAC signatures
  enabled               INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_firm_integrations_firm ON firm_integrations(firm_id);
