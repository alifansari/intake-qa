-- 0033_triage.sql (SQLite / local pilot)
-- Live case-triage: an intake specialist grades a new inquiry in seconds from a
-- short form (scoring-v2/triage-live.mjs). Additive, firm-scoped. Independent of
-- the calls/flags pipeline: a triage may exist before any recorded call.
--
-- The Postgres twin is 0041_triage.sql (with RLS, required on the hosted DB).

CREATE TABLE IF NOT EXISTS firm_triage_profiles (
  firm_id              INTEGER PRIMARY KEY REFERENCES firms(id),
  posture              TEXT NOT NULL DEFAULT 'selective' CHECK (posture IN ('selective','volume')),
  accepted_case_types  TEXT,            -- JSON array of engine case-type ids; NULL = accept all
  min_policy_limits    TEXT,            -- band label: any | 25k | 50k | 100k | 250k
  take_mist            INTEGER,         -- 1 yes / 0 no / NULL undecided (minor-impact soft tissue)
  cost_fronting        TEXT DEFAULT 'moderate' CHECK (cost_fronting IN ('minimal','moderate','deep')),
  trial_capital        INTEGER NOT NULL DEFAULT 0 CHECK (trial_capital IN (0,1)),
  red_flag_strictness  TEXT DEFAULT 'balanced' CHECK (red_flag_strictness IN ('forgiving','balanced','strict')),
  profile_json         TEXT,            -- full profile blob (source of truth)
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS triage_cases (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id                  INTEGER NOT NULL REFERENCES firms(id),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_by               TEXT,
  caller_name              TEXT,
  caller_phone             TEXT,
  case_type                TEXT,
  incident_date            TEXT,
  grade_letter             TEXT,        -- A | B | C | D
  grade_color              TEXT,        -- green | amber | red
  headline                 TEXT,
  disposition              TEXT,        -- sign_now | develop | refer_out | decline_with_grace
  value_tier               TEXT,
  driving_reason           TEXT,
  flip_fact                TEXT,
  sol_deadline             TEXT,
  sol_days_remaining       INTEGER,
  sol_urgency              TEXT,        -- ok | soon | critical | expired | unknown
  attorney_review          INTEGER NOT NULL DEFAULT 0 CHECK (attorney_review IN (0,1)),
  input_json               TEXT,        -- raw form input
  verdict_json             TEXT,        -- full triage-live output (source of truth)
  -- disposition tracking / callback queue
  status                   TEXT NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','callback','contacted','signed','declined','referred')),
  status_updated_at        TEXT,
  status_by                TEXT
);

CREATE INDEX IF NOT EXISTS idx_triage_firm ON triage_cases(firm_id);
CREATE INDEX IF NOT EXISTS idx_triage_firm_status ON triage_cases(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_triage_firm_created ON triage_cases(firm_id, created_at);
