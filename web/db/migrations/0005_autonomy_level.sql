-- Intake QA v1 — graduated-autonomy scaffolding (migration 0005), KEPT OFF.
--
-- Adds firms.autonomy_level as forward-looking scaffolding for a future
-- graduated-autonomy feature. In the pilot it is LOCKED to 'manual': the CHECK
-- constraint allows no other value, so the database itself refuses to store an
-- autonomous mode. The send chokepoint (messaging/send.mjs) also refuses to
-- transmit unless the firm is 'manual' — belt and suspenders. PILOT MODE
-- (a human approves every text) therefore cannot be turned off by data alone.
ALTER TABLE firms
  ADD COLUMN autonomy_level TEXT NOT NULL DEFAULT 'manual'
    CHECK (autonomy_level IN ('manual'));
