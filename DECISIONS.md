# DECISIONS.md — autonomous build decisions

Each entry: the ambiguity, the choice, one line of reasoning. Newest at top per phase.

## Phase 1 — Demo Mode

- **D1.1 Two migration tracks.** New tables added to BOTH `web/db/migrations/*.sql`
  (SQLite, drives tests + local pilot) and `web/supabase/migrations/*.sql` (Postgres,
  hosted). Reason: the pipeline runs on either backend via the store facade; both must
  have the schema or tests/prod diverge.
- **D1.2 Real send chokepoint is `web/messaging/send.mjs`.** CLAUDE.md names
  `web/src/lib/messaging/send.ts` aspirationally, but that file does not exist; the
  enforced chokepoint is the `.mjs`. All new send gates go there. Demo mode never
  touches the send layer at all (it only drafts a *preview*, never a message row).
- **D1.3 Demo isolation via separate tables.** `demo_calls` / `demo_leads` are wholly
  separate from the firm pipeline tables (no `firm_id`, no conversations/messages). A
  demo upload can NEVER become a real send. Postgres RLS: enable RLS with NO policy →
  only the service role (which bypasses RLS) can read; authenticated users see nothing.
- **D1.4 Injectable transcriber + scorer in the demo pipeline.** Same pattern as
  `scoreUnscored`. Defaults call the real AssemblyAI + frozen Claude engine; tests inject
  deterministic fakes so there is zero network/cost in the suite.
- **D1.5 Fee-at-risk basis.** Demo fee estimates live in `web/demo-config.json`, labeled
  "estimates — replaced by your firm's real numbers". Per-case-type values with a
  conservative fallback. The scoring engine still uses a real markdown firm config
  (`config/demo-firm.md`, a filled copy of the template — the template itself is never
  edited, per CLAUDE.md).
- **D1.6 Rate limiting is DB-backed by IP.** `demo_calls` stores `client_ip` +
  `created_at` + a live `status`; the limiter counts rows in the trailing hour (max 3)
  and rows still in a processing status (max 1 concurrent). Reason: simplest correct
  option that survives serverless cold starts (no in-memory state). IP is best-effort
  from `x-forwarded-for`.
- **D1.7 Retention.** Audio bytes are never persisted to the DB; the uploaded file is
  processed from a temp path and deleted immediately after transcription. Transcript +
  score are purged after 72h by `purgeExpiredDemoCalls` (invoked opportunistically on
  each upload, and runnable as a cron). Stated on the results page as a selling point.
