-- Intake QA — attempt tracking on the missed-case workflow (migration 0037).
--
-- WHY (B-011, callback science 2026-07-10): 93% of converted leads are reached
-- by the 6th call attempt, but most firms stop after ~2 (Velocify, 3.5M leads).
-- The desk encourages persistence ("most signups happen between calls 3 and 6")
-- only if it knows how many touches were actually logged.
--
-- Sibling-record doctrine: the frozen `flags` row is never mutated. `attempts`
-- increments when the coordinator logs a touch (left a message / spoke to
-- them). It is a private encouragement counter — never surfaced as a score,
-- never a quota, no per-staff comparison anywhere (intake-staff field guide).

alter table flag_status add column if not exists attempts integer not null default 0;
alter table flag_status add column if not exists last_attempt_at timestamptz;
