-- Intake QA — Beta program layer + rescue desk models (migration 0021, SQLite dialect).
--
-- The beta program is the delivery vehicle for the whole product: a prospective
-- tester applies -> is qualified against the ICP (small/mid CALIFORNIA plaintiff
-- PI firms) -> signs an NDA (HARD gate: no data access before signed) -> becomes
-- an active tester -> receives outputs -> gives structured per-artifact feedback.
--
-- Also adds the rescue-desk models the beta exercises end-to-end: pluggable
-- practice-area rulesets (only california-pi ships), per-call handling scores,
-- the unified human-in-the-loop review queue, daily rescue packets (top-3 cap),
-- the staged recovered-case ledger, the callback-actor audit log, per-firm
-- compliance config, and a per-call consent status.
--
-- Postgres twin: web/supabase/migrations/0023_beta_program.sql (with RLS).
--
-- INVARIANTS enforced at this layer:
--   (a) callbacks are made by FIRM EMPLOYEES only (callback_audit_entries.actor_type)
--   (d) no flag surfaces without human sign-off (review_queue_items.state)
--   (f) no data access before NDA signed (beta_applicants.status ordering +
--       nda_records; enforced in web/beta/nda.mjs, the single access chokepoint)

PRAGMA foreign_keys = ON;

-- 0a. Beta applicant intake + qualification -----------------------------------

CREATE TABLE IF NOT EXISTS beta_applicants (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  email               TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  firm_name           TEXT    NOT NULL,
  role                TEXT,                              -- owner / managing partner / intake manager / other
  bar_number          TEXT,                              -- CA bar number (self-reported)
  practice_area       TEXT    NOT NULL,                  -- requested practice area, e.g. 'personal_injury'
  state               TEXT    NOT NULL,                  -- two-letter, e.g. 'CA'
  monthly_call_volume INTEGER,
  phone_system        TEXT,                              -- RingCentral / CallRail / other
  crm_system          TEXT,                              -- CasePeer / Filevine / Litify / Clio / Law Ruler / Lead Docket / none
  records_calls       INTEGER NOT NULL DEFAULT 0,        -- 0/1: firm already records intake calls
  spanish_call_pct    INTEGER,                           -- 0-100, % of intake calls in Spanish
  status              TEXT    NOT NULL DEFAULT 'applied'
                        CHECK (status IN ('applied','nda_pending','nda_signed','onboarding',
                                          'active_tester','completed','waitlisted','rejected')),
  qualification       TEXT,                              -- JSON: { qualified, reasons[], waitlist_tag }
  firm_id             INTEGER REFERENCES firms(id),      -- set at onboarding when the firm row is created
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS beta_applicants_status_idx ON beta_applicants(status);
CREATE INDEX IF NOT EXISTS beta_applicants_email_idx  ON beta_applicants(email);

-- Non-ICP applicants: tagged waitlist by requested practice area. They are NOT
-- admitted to the PI beta; the tag is what makes a future non-PI cohort findable.
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id  INTEGER NOT NULL REFERENCES beta_applicants(id) ON DELETE CASCADE,
  practice_area TEXT    NOT NULL,                        -- the waitlist tag
  state         TEXT,
  reason        TEXT,                                    -- why not admitted (plain English)
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (applicant_id)
);
CREATE INDEX IF NOT EXISTS waitlist_practice_area_idx ON waitlist_entries(practice_area);

-- 0b. NDA gate (Dropbox Sign). No applicant may connect/upload calls or view
-- any audit until a row here has status='signed'.
CREATE TABLE IF NOT EXISTS nda_records (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id         INTEGER NOT NULL REFERENCES beta_applicants(id) ON DELETE CASCADE,
  provider             TEXT    NOT NULL DEFAULT 'dropbox_sign',
  signature_request_id TEXT    UNIQUE,                   -- correlates the webhook event
  status               TEXT    NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('sent','signed','declined','canceled')),
  document_ref         TEXT,                             -- executed-document reference (file id / url)
  sent_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  signed_at            TEXT
);
CREATE INDEX IF NOT EXISTS nda_records_applicant_idx ON nda_records(applicant_id);

-- 0c. Structured feedback, tied to the SPECIFIC output (per-audit, per-packet),
-- never one global survey. Numeric ratings are 1-5; enums are short codes.
CREATE TABLE IF NOT EXISTS beta_feedback (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id          INTEGER REFERENCES beta_applicants(id),
  firm_id               INTEGER REFERENCES firms(id),
  subject_type          TEXT    NOT NULL
                          CHECK (subject_type IN ('audit','rescue_packet','coaching','onboarding','general')),
  subject_id            TEXT,                            -- audit session token / rescue_packet id / etc.
  ux_setup_ease         INTEGER CHECK (ux_setup_ease BETWEEN 1 AND 5),
  ux_report_clarity     INTEGER CHECK (ux_report_clarity BETWEEN 1 AND 5),
  ux_delivery           INTEGER CHECK (ux_delivery BETWEEN 1 AND 5),
  utility_flags_signable TEXT   CHECK (utility_flags_signable IN ('yes','no','partial')),
  utility_would_have_recovered TEXT CHECK (utility_would_have_recovered IN ('yes','no','unsure')),
  utility_diagnosis_accurate   TEXT CHECK (utility_diagnosis_accurate IN ('yes','no','partial')),
  utility_script_usable        TEXT CHECK (utility_script_usable IN ('yes','no','with_edits')),
  trust_score           INTEGER CHECK (trust_score BETWEEN 1 AND 5),
  trust_false_positives INTEGER,                         -- count of flags the tester says were junk
  wtp_would_pay         TEXT    CHECK (wtp_would_pay IN ('yes','no','maybe')),
  wtp_monthly_max_cents INTEGER,                         -- flat monthly they'd pay (cents) — NEVER per-case
  wtp_must_have         TEXT,                            -- what would make it a must-have
  open_feedback         TEXT,
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS beta_feedback_subject_idx ON beta_feedback(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS beta_feedback_firm_idx    ON beta_feedback(firm_id);

-- 2. Pluggable practice-area rulesets. ONLY 'california-pi' ships active; the
-- table exists so nothing hardcodes PI, per the architecture requirement. The
-- config payload shape is documented in web/rulesets/index.mjs.
CREATE TABLE IF NOT EXISTS practice_area_rulesets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT    NOT NULL UNIQUE,                  -- 'california-pi'
  display_name TEXT    NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  active       INTEGER NOT NULL DEFAULT 0,               -- 0/1; only california-pi is active
  config       TEXT,                                     -- JSON ruleset payload (source of truth is code)
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO practice_area_rulesets (key, display_name, version, active)
SELECT 'california-pi', 'California Personal Injury', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM practice_area_rulesets WHERE key = 'california-pi');

-- Per-firm tunables layered over a ruleset (case types wanted/excluded, minimum
-- severity, geography, SOL windows). Merged in web/rulesets/index.mjs.
CREATE TABLE IF NOT EXISTS firm_ruleset_overrides (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id     INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  ruleset_key TEXT    NOT NULL DEFAULT 'california-pi',
  overrides   TEXT,                                      -- JSON
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id)
);

-- 2b. HANDLING score, separate from case-quality (sibling of flags, mirroring
-- flag_confidence). Empathy is folded into next_step_secured by design — no
-- standalone empathy score.
CREATE TABLE IF NOT EXISTS handling_scores (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id                INTEGER NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  speed_to_lead_seconds  INTEGER,                        -- time to live answer; NULL = unknown
  screening_completeness INTEGER CHECK (screening_completeness BETWEEN 0 AND 100),
  next_step_secured      INTEGER NOT NULL DEFAULT 0,     -- 0/1: appointment/callback locked in
  objection_handling     INTEGER CHECK (objection_handling BETWEEN 0 AND 100),
  rubric_version         TEXT,
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (flag_id)
);

-- 3. Unified human-in-the-loop review queue. A signable-but-lost flag reaches a
-- tester ONLY through state='confirmed' here (invariant d). Rejection captures
-- the "not a real case" criteria feedback that tunes firm-specific rules.
CREATE TABLE IF NOT EXISTS review_queue_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id           INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  flag_id           INTEGER NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  state             TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (state IN ('pending','confirmed','rejected')),
  confidence_tier   TEXT,                                -- copied from flag_confidence at enqueue time
  reviewer          TEXT,                                -- named human reviewer (analyst)
  reviewed_at       TEXT,
  reject_reason     TEXT,                                -- plain-English "why this is not a real case"
  criteria_feedback TEXT,                                -- JSON: which firm criteria this should adjust
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (flag_id)
);
CREATE INDEX IF NOT EXISTS review_queue_state_idx ON review_queue_items(firm_id, state);

-- 4. Done-for-you daily rescue packet: capped at TOP 3 items per firm per day,
-- delivered by push (SMS/email/CRM task); dashboard is secondary.
CREATE TABLE IF NOT EXISTS rescue_packets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id      INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  packet_date  TEXT    NOT NULL,                         -- 'YYYY-MM-DD' in the firm's timezone
  status       TEXT    NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','delivered')),
  delivered_via TEXT,                                    -- JSON: { email, sms, crm } delivery receipts
  delivered_at TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id, packet_date)
);

CREATE TABLE IF NOT EXISTS rescue_packet_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id        INTEGER NOT NULL REFERENCES rescue_packets(id) ON DELETE CASCADE,
  flag_id          INTEGER NOT NULL REFERENCES flags(id),
  rank             INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),  -- top-3 cap, enforced by schema
  prospect_name    TEXT,
  prospect_phone   TEXT,
  diagnosis        TEXT,                                 -- plain-English what-went-wrong
  callback_script  TEXT,                                 -- pre-filled, readable in ~2 minutes
  est_value_cents  INTEGER,
  recoverability   REAL,                                 -- 0..1 estimate used in ranking
  sol_deadline     TEXT,                                 -- ISO date when the SOL clock matters
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (packet_id, rank),
  UNIQUE (packet_id, flag_id)
);

-- 5. Recovered-revenue ledger with the full stage chain and "would-have-lost"
-- gating. One entry per rescued flag, tagged with a unique rescue_tag so the
-- ROI claim is auditable end-to-end. Counted as "recovered" ONLY if the lead
-- had gone cold before the flag (would_have_lost = 1).
CREATE TABLE IF NOT EXISTS rescue_ledger_entries (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id               INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  flag_id               INTEGER NOT NULL REFERENCES flags(id),
  rescue_tag            TEXT    NOT NULL UNIQUE,         -- e.g. 'RSQ-2026-000042'
  stage                 TEXT    NOT NULL DEFAULT 'flagged'
                          CHECK (stage IN ('flagged','contacted','consult','signed','settled','dead')),
  stage_history         TEXT,                            -- JSON: [{stage, at, by}]
  would_have_lost       INTEGER NOT NULL DEFAULT 0,      -- 0/1; gating for "recovered" claims
  would_have_lost_basis TEXT,                            -- plain-English basis for the counterfactual
  control_holdout       INTEGER NOT NULL DEFAULT 0,      -- 0/1: randomly held out (optional counterfactual)
  fee_value_cents       INTEGER,                         -- realized fee once settled (whole ledger is auditable)
  contacted_at          TEXT,
  signed_at             TEXT,
  settled_at            TEXT,
  created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (flag_id)
);
CREATE INDEX IF NOT EXISTS rescue_ledger_firm_idx ON rescue_ledger_entries(firm_id, stage);

-- 8. Callback-actor audit log. The service NEVER contacts prospects; every
-- callback is made by a named firm employee. actor_type has exactly one legal
-- value so a non-employee actor is unrepresentable (invariant a).
CREATE TABLE IF NOT EXISTS callback_audit_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id       INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  flag_id       INTEGER REFERENCES flags(id),
  actor_type    TEXT    NOT NULL DEFAULT 'firm_employee'
                  CHECK (actor_type IN ('firm_employee')),
  employee_name TEXT    NOT NULL CHECK (length(employee_name) > 0),
  occurred_at   TEXT    NOT NULL,
  outcome       TEXT,                                    -- reached / voicemail / booked_consult / declined / bad_number
  note          TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS callback_audit_firm_idx ON callback_audit_entries(firm_id, occurred_at);

-- 8b. Per-firm compliance config: recording-consent readiness (CIPA §632/632.7),
-- BAA reference, consent-greeting script version in use. The consent gate in
-- web/beta/consent-gate.mjs reads this.
CREATE TABLE IF NOT EXISTS compliance_config (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id                  INTEGER NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  consent_greeting_version TEXT,                          -- which bilingual greeting script the firm attests to using
  consent_attested         INTEGER NOT NULL DEFAULT 0,    -- 0/1: firm attests all recorded lines play the greeting
  consent_attested_by      TEXT,
  consent_attested_at      TEXT,
  recording_checklist      TEXT,                          -- JSON: onboarding recording-readiness checklist state
  baa_reference            TEXT,                          -- executed BAA document reference
  baa_signed_at            TEXT,
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id)
);

-- 8c. Per-call consent status (invariant c: no un-consented call is analyzed).
-- 'unknown' defers to the firm-level attestation in compliance_config;
-- 'no_consent' is a hard exclusion enforced in web/beta/consent-gate.mjs.
ALTER TABLE calls ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (consent_status IN ('unknown','consented','no_consent'));

-- 11. Packaging: a $0 NDA-gated beta plan (flat structure preserved: per-case
-- columns stay 0 by the flat-fee rule in billing/invoice.mjs + billing/packaging.mjs).
INSERT INTO billing_plans (name, base_monthly_cents, per_case_fee_cents, monthly_case_fee_cap_cents)
SELECT 'beta', 0, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM billing_plans WHERE name = 'beta');
