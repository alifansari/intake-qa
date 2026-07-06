-- Intake QA — enable RLS on report_access_events (Postgres/Supabase, migration 0018).
--
-- Additive, idempotent. This is the ONE table that shipped (in 0017) without RLS.
-- It is token-keyed, not firm-keyed, so — exactly like demo_calls / audit_sessions —
-- we enable RLS with NO policy: only the trusted service role (the server) may read
-- or write it. The reading layer authorizes by report token in the app, not by a
-- firm identity. Closes the last "every table has RLS" gap (CLAUDE.md hard rule).
alter table report_access_events enable row level security;
