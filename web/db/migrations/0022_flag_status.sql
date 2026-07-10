-- Persist the missed-case workflow status (sqlite twin of supabase 0030).
-- Sibling record beside the frozen flags row; one row per flag.

CREATE TABLE IF NOT EXISTS flag_status (
  flag_id     INTEGER PRIMARY KEY REFERENCES flags(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'needs_callback'
    CHECK (status IN ('needs_callback','reached_out','back_in_touch','signed','didnt_sign')),
  updated_by  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
