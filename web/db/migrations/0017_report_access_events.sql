-- Intake QA — report access events (migration 0017, SQLite dialect).
--
-- ADDITIVE ONLY. The Intake Leak Report is shareable by token (forward-to-partner
-- by design, no login wall). This logs views and downloads + distinct viewer
-- fingerprints so the desk can see a report was opened and forwarded. Token-based
-- (not firm-scoped) because the reading layer is token-gated. Postgres twin alongside.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS report_access_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  token              TEXT    NOT NULL,
  event_type         TEXT    NOT NULL CHECK (event_type IN ('view', 'download')),
  viewer_fingerprint TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_report_access_token ON report_access_events(token);
