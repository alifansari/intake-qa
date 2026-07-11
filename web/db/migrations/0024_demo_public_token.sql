-- Per-row public token for demo calls (sqlite twin of supabase 0032).
-- Polling by an unguessable token, not the sequential id, so a demo result's
-- caller PII can't be enumerated by incrementing the id.

ALTER TABLE demo_calls ADD COLUMN public_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS demo_calls_public_token_idx
  ON demo_calls (public_token);
