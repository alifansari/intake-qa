-- Intake QA — the missed-call pager (SQLite dialect).
--
-- Postgres twin: web/supabase/migrations/0047_missed_call_pager.sql (the tracks
-- diverge above 0019 by design — same logical migration, different number).
--
-- WHY: 78% of PI clients sign with whichever firm calls back first, and CallRail
-- already tells us on the post-call webhook whether an inbound call was answered
-- (`answered: false`, `call_type: "voicemail" | "missed"`). We were throwing that
-- away and only surfacing misses in the NIGHTLY digest — hours after the lead was
-- winnable. Capturing the answer status lets us record a `call_missed` event at
-- ingest, which the founder-activity sweep (~5 min) turns into an immediate ping.
--
-- Two changes:
--   1. calls gains the answer status (answered / call_type / direction / duration).
--   2. the events CHECK allowlist is widened to accept 'call_missed'.
--
-- SQLite cannot ALTER a CHECK constraint, so the append-only events table is
-- rebuilt: create the widened twin, copy every row, drop the old, rename. events
-- has no INCOMING foreign keys (only an outgoing ref to firms), so the
-- drop/rename is safe. Indexes are recreated afterward. (Same pattern as 0031.)

ALTER TABLE calls ADD COLUMN answered         INTEGER;  -- 1 | 0 | null (unknown, e.g. manual upload)
ALTER TABLE calls ADD COLUMN call_type        TEXT;     -- CallRail: 'voicemail' | 'missed' | 'answered' | ...
ALTER TABLE calls ADD COLUMN direction        TEXT;     -- 'inbound' | 'outbound'
ALTER TABLE calls ADD COLUMN duration_seconds INTEGER;

CREATE TABLE events_new (
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
               'apply_submitted',
               'firm_created',
               'score_completed',
               'call_missed'
             )),
  firm_id    INTEGER REFERENCES firms(id),
  actor      TEXT,
  context    TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO events_new (id, event, firm_id, actor, context, created_at)
  SELECT id, event, firm_id, actor, context, created_at FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

CREATE INDEX IF NOT EXISTS events_event_created_idx ON events(event, created_at);
CREATE INDEX IF NOT EXISTS events_firm_created_idx  ON events(firm_id, created_at);
