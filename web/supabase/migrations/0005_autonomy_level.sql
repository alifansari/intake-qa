-- Intake QA — graduated-autonomy scaffolding (Postgres twin of SQLite 0005).
--
-- firms.autonomy_level is forward-looking scaffolding, LOCKED to 'manual' in the
-- pilot: the CHECK allows no other value, so the database refuses to store an
-- autonomous mode. The send chokepoint (messaging/send.mjs) also refuses to
-- transmit unless the firm is 'manual'. PILOT MODE (a human approves every text)
-- cannot be disabled by data alone. firms already has RLS enabled (0001).
alter table firms
  add column if not exists autonomy_level text not null default 'manual'
    check (autonomy_level in ('manual'));
