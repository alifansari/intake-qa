-- Intake QA — persist the missed-case workflow status (migration 0030).
--
-- WHY: the desk's status buttons ("We reached out" → "They responded" →
-- "Signed / Didn't sign") were device-local React state — they LOOKED saved
-- and reset on reload. For the intake coordinator that's a trust-destroying
-- lie ("I marked these yesterday!"). This sibling table makes the click real.
--
-- Sibling-record doctrine: the frozen `flags` row is never mutated; status
-- lives beside it, one row per flag, with who touched it last.

create table if not exists flag_status (
  flag_id     uuid primary key references flags(id) on delete cascade,
  status      text not null default 'needs_callback'
    check (status in ('needs_callback','reached_out','back_in_touch','signed','didnt_sign')),
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table flag_status enable row level security;

-- Firm members can read their own firm's statuses; writes are server-side.
drop policy if exists flag_status_firm_read on flag_status;
create policy flag_status_firm_read on flag_status
  for select
  using (exists (
    select 1 from flags f
    where f.id = flag_status.flag_id
      and f.firm_id in (select current_user_firm_ids())
  ));
