-- Marketing attribution for intake calls (Postgres / hosted twin of SQLite 0038).
--
-- Captures the lead source / campaign / UTM data CallRail sends but the ingest
-- mapper discarded, enabling signable-value-by-source reporting. Marketing
-- metadata only -- no claimant PII. RLS on `calls` already covers new columns
-- (table-level policy), so no new policy is required.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS lead_campaign TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS attribution_json TEXT;
