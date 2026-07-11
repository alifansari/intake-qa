-- Add 'bad_number' to flag_status (sqlite twin of supabase 0031).
-- SQLite can't alter a CHECK constraint, so rebuild the table in place.

CREATE TABLE IF NOT EXISTS flag_status_new (
  flag_id     INTEGER PRIMARY KEY REFERENCES flags(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'needs_callback'
    CHECK (status IN ('needs_callback','reached_out','back_in_touch','signed','didnt_sign','bad_number')),
  updated_by  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

INSERT INTO flag_status_new (flag_id, status, updated_by, updated_at)
  SELECT flag_id, status, updated_by, updated_at FROM flag_status;

DROP TABLE flag_status;

ALTER TABLE flag_status_new RENAME TO flag_status;
