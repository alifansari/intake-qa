-- Intake QA beta — first-party product event log + alert state (SQLite dialect).
--
-- Postgres twin: web/supabase/migrations/0036_event_log.sql (the tracks diverge
-- above 0019 by design — same logical migration, different number; see
-- web/README.md "Migrations (two tracks)").
--
-- WHY FIRST-PARTY: intake calls are confidential legal data. No PostHog, no
-- Plausible, no third-party pixel — product events land in OUR database, hold
-- IDs and counts only (never transcripts, never caller PII), and are read only
-- by the founder-gated /studio/beta board and the founder alert sweep.
--
-- `events` is append-only and best-effort: a failed event write must never
-- break the user action that produced it (same posture as the errors table).
--
-- `alert_state` is a tiny key/value watermark store for the founder alert
-- sweep (last error id alerted, last application seen, last daily-pulse date)
-- so each trigger fires exactly once per window instead of spamming.
--
-- `firms.stage` is the founder-set funnel state behind ops/insights.md B1/B2
-- ("the two numbers that decide everything": audit→pilot and pilot→paid).
-- There is no better source for pilot/paid yet, so the founder sets it by hand
-- on /studio/beta.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT    NOT NULL CHECK (event IN (
               'sign_in',
               'desk_view',
               'digest_sent',
               'digest_opened',
               'digest_link_clicked',
               'callback_marked',
               'upload_started',
               'upload_completed',
               'audit_started',
               'audit_completed',
               'apply_submitted'
             )),
  firm_id    INTEGER REFERENCES firms(id),  -- nullable: public flows (audit, apply) have no firm yet
  actor      TEXT,                          -- who did it: an email, 'email-digest-link', 'public', 'system'
  context    TEXT,                          -- small JSON blob: ids and counts ONLY, never PII/transcripts
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS events_event_created_idx ON events(event, created_at);
CREATE INDEX IF NOT EXISTS events_firm_created_idx  ON events(firm_id, created_at);

CREATE TABLE IF NOT EXISTS alert_state (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Founder-set funnel stage (NULL = onboarded, not yet a pilot).
ALTER TABLE firms ADD COLUMN stage TEXT CHECK (stage IN ('pilot', 'paid'));
ALTER TABLE firms ADD COLUMN stage_updated_at TEXT;
