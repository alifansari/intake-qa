-- Intake QA — report_access_events RLS (SQLite twin of 0018).
--
-- SQLite has no row-level security; RLS is a Postgres/Supabase concept. This twin
-- exists only to keep the two migration tracks in lockstep (same numbers/names).
-- The enforcement lives in the Postgres twin (supabase/migrations/0018). No-op here.
PRAGMA foreign_keys = ON;
