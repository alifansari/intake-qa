-- CRM dead-lead rescue import (migration 0027, SQLite dialect).
--
-- The rescue layer that sits ABOVE a firm's CRM cadence: the firm exports the
-- leads its cadence marked dead (Lead Docket "Lost/Rejected/Chase-exhausted",
-- CloudLex Insights, etc.), we re-triage them on legal merit, and the few live
-- ones enter the EXISTING rescue conveyor (review -> packet -> ledger) as
-- flags. These two tables are additive sidecars — calls/flags are untouched;
-- an imported lead's call row uses source='manual' (it IS a manual import) and
-- crm_leads carries the authoritative CRM provenance.
--
-- Honest-denominator rule: EVERY imported row gets a crm_leads record with its
-- triage verdict, including the ones that stayed dead — "40 imported, 3
-- surfaced" is only a claim if the other 37 are auditable.
--
-- Postgres twin: web/supabase/migrations/0035_crm_rescue_import.sql (with RLS).

PRAGMA foreign_keys = ON;

-- One row per uploaded export file. imported_by is a NAMED human (the same
-- named-actor rule as review sign-off and callback logging).
CREATE TABLE IF NOT EXISTS crm_import_batches (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id            INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  crm                TEXT    NOT NULL,                    -- 'leaddocket' | 'cloudlex' | 'litify' | 'lawmatics' | 'lawruler' | 'cliogrow' | 'other'
  filename           TEXT,
  imported_by        TEXT    NOT NULL CHECK (length(trim(imported_by)) > 0),
  row_count          INTEGER NOT NULL DEFAULT 0,
  surfaced_count     INTEGER NOT NULL DEFAULT 0,          -- rescue candidates queued for human review
  needs_info_count   INTEGER NOT NULL DEFAULT 0,
  screened_out_count INTEGER NOT NULL DEFAULT 0,
  skipped_count      INTEGER NOT NULL DEFAULT 0,          -- unparseable / duplicate rows
  rubric_version     TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS crm_import_batches_firm_idx ON crm_import_batches(firm_id);

-- One row per imported dead lead, with the deterministic triage verdict frozen
-- at import time. call_id/flag_id are set ONLY for surfaced rescue candidates
-- (the rows that entered the review queue); screened-out and needs-info rows
-- live here alone, as the auditable remainder.
CREATE TABLE IF NOT EXISTS crm_leads (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id           INTEGER NOT NULL REFERENCES crm_import_batches(id) ON DELETE CASCADE,
  firm_id            INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  crm                TEXT    NOT NULL,
  external_lead_id   TEXT,                                -- the CRM's own lead id, when the export has one
  prospect_name      TEXT,
  prospect_phone     TEXT,
  prospect_email     TEXT,
  case_type          TEXT,                                -- normalized snake_case, or NULL when unknown
  incident_date      TEXT,                                -- ISO date, or NULL (honest null, never guessed)
  lead_created_at    TEXT,                                -- when the lead first contacted the firm
  last_contact_at    TEXT,                                -- last touch recorded by the CRM
  crm_status         TEXT,                                -- verbatim from the export (statuses are firm-configurable)
  crm_substatus      TEXT,
  attempts           INTEGER,                             -- contact attempts logged by the CRM; NULL = not in export
  language           TEXT,                                -- 'es' | 'en' | NULL — coverage/fairness signal, NEVER a merit input
  notes              TEXT,
  verdict            TEXT    NOT NULL
                       CHECK (verdict IN ('rescue_candidate','needs_info','screened_out')),
  screen_reason      TEXT,                                -- plain-English basis when screened_out (legally-determinable facts only)
  gap_kind           TEXT,                                -- which triage gap lost this lead (see rescue/triage.mjs GAP_KINDS)
  gap_basis          TEXT,                                -- plain-English basis for the gap classification
  value_tier         TEXT    CHECK (value_tier IN ('standard','elevated','high')),
  value_tier_basis   TEXT,                                -- cited markers behind the tier (no citation, no claim)
  sol_deadline       TEXT,                                -- estimated ISO date from analysis/sol.mjs; NULL = unknown
  sol_days_remaining INTEGER,
  sol_urgency        TEXT,                                -- 'expired' | 'critical' | 'soon' | 'ok' | 'unknown'
  recoverability     REAL,                                -- 0..1 estimate used in ranking
  rubric_version     TEXT    NOT NULL,
  call_id            INTEGER UNIQUE REFERENCES calls(id), -- set only when surfaced
  flag_id            INTEGER UNIQUE REFERENCES flags(id), -- set only when surfaced
  raw                TEXT,                                 -- JSON of the original export row (provenance)
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS crm_leads_batch_idx ON crm_leads(batch_id);
CREATE INDEX IF NOT EXISTS crm_leads_firm_idx  ON crm_leads(firm_id, verdict);
-- Idempotent re-import: the same CRM lead never duplicates when the export
-- carries a stable external id. (Partial index: NULL external ids always insert.)
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_external_idx
  ON crm_leads(firm_id, crm, external_lead_id)
  WHERE external_lead_id IS NOT NULL;
