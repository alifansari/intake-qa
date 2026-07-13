-- Intake QA beta — widen the events CHECK to cover the two founder-activity
-- lifecycle events (SQLite dialect).
--
-- Postgres twin: web/supabase/migrations/0039_activity_events.sql (the tracks
-- diverge above 0019 by design — same logical migration, different number).
--
-- WHY: the founder activity digest (messaging/founder-alerts.mjs) reports every
-- new firm added and every call scored, in addition to the uploads/callbacks/
-- applications already in the log. Those two need new event names, and the
-- events.event column carries a CHECK allowlist (0028) that must be widened.
--
-- SQLite cannot ALTER a CHECK constraint, so the append-only events table is
-- rebuilt: create the widened twin, copy every row, drop the old, rename.
-- events has no INCOMING foreign keys (only an outgoing ref to firms), so the
-- drop/rename is safe. Indexes are recreated afterward.

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
               'score_completed'
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
