-- Intake QA — multi-user roles + per-agent callback assignment (migration 0044).
--
-- WHY: high-volume PI firms run many intake agents + an intake manager + an
-- admin, but the desk had exactly ONE privilege split (FOUNDER_EMAIL). The
-- firm_members(role) column has existed since 0001 (default 'operator') and was
-- never READ anywhere. This migration activates roles and adds per-callback
-- ownership so a firm can see "who owns this callback" and "who acted".
--
-- ROLE MODEL: 'agent' | 'manager' | 'admin'
--   * agent   — works the callback queue + their own calls; no team dashboards
--               (scorecard) and no firm settings.
--   * manager — everything an agent sees PLUS the team dashboards (scorecard).
--   * admin   — manager + firm settings/config; the firm owner.
--
-- BACKWARD COMPAT: the legacy default 'operator' always belonged to the single
-- shared login, which WAS the firm owner and saw everything. So 'operator' (and
-- any unrecognized/blank value) maps to 'admin' — we NEVER downgrade an existing
-- user out of access. 'agent' is an opt-in restriction, set explicitly when an
-- admin adds a rank-and-file intake agent. New members default to 'admin' too,
-- matching the onboarding flow (the row it creates is the firm's owner).

-- 1) Backfill legacy/blank roles to admin BEFORE tightening the constraint, so
--    no existing member loses access and the new CHECK cannot fail on old data.
update firm_members set role = 'admin'
  where role is null or role not in ('agent','manager','admin');

-- 2) New default for freshly-onboarded owners.
alter table firm_members alter column role set default 'admin';

-- 3) Constrain to the three real roles.
alter table firm_members drop constraint if exists firm_members_role_check;
alter table firm_members add constraint firm_members_role_check
  check (role in ('agent','manager','admin'));

-- 4) Per-agent callback ownership + who-acted attribution on flag_status
--    (sibling record; the frozen `flags` row is never mutated).
--    assignee_user_id   — who OWNS this callback ("Claim this callback" / assign).
--    updated_by_user_id — the auth user who last acted (reliable per-agent
--                         attribution; the existing text `updated_by` column
--                         keeps the human-readable email/label as before).
alter table flag_status
  add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;
alter table flag_status
  add column if not exists updated_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_flag_status_assignee on flag_status(assignee_user_id);

-- RLS: flag_status already has a firm-scoped read policy (0030) and writes are
-- server-side (service role). New columns inherit that policy unchanged — no
-- cross-firm leak is introduced.
