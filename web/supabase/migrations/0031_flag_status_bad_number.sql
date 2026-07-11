-- Intake QA — add 'bad_number' to the missed-case workflow statuses (0031).
--
-- WHY (intake-staff field guide, 2026-07-10): the most common callback outcomes
-- are "spoke to them", "left a message", and "bad number". The queue's one-tap
-- buttons must match the phone call, or the coordinator marks something false
-- just to clear the card. 'reached_out' keeps its key (it is the digest's
-- one-click "We called them") and now reads as "Left a message" in the UI.

alter table flag_status drop constraint if exists flag_status_status_check;
alter table flag_status add constraint flag_status_status_check
  check (status in ('needs_callback','reached_out','back_in_touch','signed','didnt_sign','bad_number'));
