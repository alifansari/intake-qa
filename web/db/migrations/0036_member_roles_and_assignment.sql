-- Multi-user roles + per-agent callback assignment (sqlite twin of supabase 0044).
--
-- The pilot/sqlite backend never had firm_members (no Supabase auth), so roles
-- are effectively a no-op here: the single local user is treated as 'admin' by
-- lib/desk/roles.ts. We still create the table (WITHOUT an auth.users FK, which
-- does not exist locally) so the role model is symmetric and unit-testable, and
-- we add the assignment columns to flag_status so setFlagStatus and the desk
-- read paths behave identically against SQLite and Postgres.
--
-- Role model + backward-compat mapping are documented in supabase/0044.

CREATE TABLE IF NOT EXISTS firm_members (
  firm_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('agent','manager','admin')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (firm_id, user_id)
);

-- Per-agent callback ownership + who-acted attribution (sibling to the frozen
-- flags row). assignee_user_id = who owns the callback; updated_by_user_id =
-- the user who last acted (the text updated_by column keeps the readable label).
ALTER TABLE flag_status ADD COLUMN assignee_user_id TEXT;
ALTER TABLE flag_status ADD COLUMN updated_by_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_flag_status_assignee ON flag_status(assignee_user_id);
