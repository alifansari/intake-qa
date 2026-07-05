-- Intake QA — per-firm feature flags (migration 0008, SQLite dialect).
--
-- Ground rule 0.5: every enhancement ships behind a per-firm feature flag,
-- default OFF, togglable by the operator. This table holds the explicit on/off
-- rows; a missing row means the feature is OFF for that firm (default-off is a
-- code decision, not a stored one — see web/features.mjs and the facade ops).
--
-- Firm-scoped data. Postgres twin: web/supabase/migrations/0008_firm_features.sql
-- (RLS enabled WITH a firm-scoped policy, like other firm-data tables).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firm_features (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id    INTEGER NOT NULL REFERENCES firms(id),
  feature    TEXT    NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (firm_id, feature)
);
CREATE INDEX IF NOT EXISTS firm_features_firm_idx ON firm_features(firm_id);
