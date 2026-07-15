-- Marketing attribution for intake calls (SQLite / pilot).
--
-- CallRail sends the lead source, campaign, and UTM/gclid data on every call
-- payload, but the ingest mapper discarded all of it. Capturing it lets us
-- report SIGNABLE-CASE VALUE by lead source (the Marketing Signal): "your TV
-- leads carry 3x the signable value per call of your PPC leads." lead_source
-- and lead_campaign are dedicated columns so we can GROUP BY them; the full
-- attribution blob rides in attribution_json.
--
-- Marketing metadata only -- no claimant PII (caller phone/name stay in their
-- own columns; §VI).
ALTER TABLE calls ADD COLUMN lead_source TEXT;
ALTER TABLE calls ADD COLUMN lead_campaign TEXT;
ALTER TABLE calls ADD COLUMN attribution_json TEXT;
