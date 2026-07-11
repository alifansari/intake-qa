-- Per-firm CallRail webhook secret (sqlite twin of supabase 0034).
-- Each firm's own CallRail account signing token; the per-firm webhook route
-- prefers it over the shared env secret.

ALTER TABLE firms ADD COLUMN callrail_webhook_secret TEXT;
