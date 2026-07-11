-- Intake QA — per-row public token for demo calls (0032).
--
-- WHY (security): /api/demo/status previously accepted the sequential integer
-- demo_calls.id and returned result_json, which contains the uploader's own
-- callers' names + callback numbers. Any visitor could enumerate ids and harvest
-- other people's prospective-client PII inside the 72h window (Rule 1.18 breach).
-- Polling now requires this unguessable token; the integer id stays internal.

alter table demo_calls add column if not exists public_token text;
create unique index if not exists demo_calls_public_token_idx
  on demo_calls (public_token) where public_token is not null;
