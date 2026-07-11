-- Intake QA — per-firm CallRail webhook secret (0034).
--
-- WHY: CallRail issues a signing token PER ACCOUNT — you don't choose it — so one
-- shared CALLRAIL_WEBHOOK_SECRET across five firms cannot verify all of them. This
-- column lets each firm carry its own account's signing secret; the per-firm
-- webhook route (/webhooks/callrail/<firm-id>) prefers it and falls back to the
-- env secret (the original single-pilot firm). Firm-scoped and RLS-protected like
-- the rest of the firm row.

alter table firms add column if not exists callrail_webhook_secret text;
