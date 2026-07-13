-- Intake QA beta — widen the events CHECK to cover the two founder-activity
-- lifecycle events (Postgres/Supabase dialect).
--
-- SQLite twin: web/db/migrations/0031_activity_events.sql (the tracks diverge
-- above 0019 by design — same logical migration, different number).
--
-- WHY: the founder activity digest (messaging/founder-alerts.mjs) reports every
-- new firm added (firm_created) and every call scored (score_completed), on top
-- of the uploads/callbacks/applications already logged. The events.event column
-- carries a CHECK allowlist (0036) that must be widened to accept them.
--
-- Postgres CAN alter a CHECK in place — drop the auto-named column constraint
-- and re-add the widened one. `if exists` keeps it safe to re-run.

alter table events drop constraint if exists events_event_check;
alter table events add constraint events_event_check check (event in (
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
));
