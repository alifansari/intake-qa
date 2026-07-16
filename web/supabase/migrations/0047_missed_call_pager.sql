-- Intake QA — the missed-call pager (Postgres/Supabase dialect).
--
-- SQLite twin: web/db/migrations/0039_missed_call_pager.sql (the tracks diverge
-- above 0019 by design — same logical migration, different number).
--
-- WHY: CallRail's post-call webhook already reports whether an inbound call was
-- answered (`answered: false`, `call_type: 'voicemail' | 'missed'`). Capturing it
-- lets us record a `call_missed` event at ingest, which the founder-activity
-- sweep turns into a near-real-time ping instead of a next-morning digest line.
--
-- Postgres CAN alter a CHECK in place — drop the auto-named column constraint and
-- re-add the widened one. `if exists` / `if not exists` keep it safe to re-run.
-- RLS on `calls` already covers new columns (table-level policy).

alter table calls add column if not exists answered         boolean;
alter table calls add column if not exists call_type        text;
alter table calls add column if not exists direction        text;
alter table calls add column if not exists duration_seconds integer;

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
  'score_completed',
  'call_missed'
));
