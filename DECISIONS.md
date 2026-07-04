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
- **D1.8 Turbopack cannot bundle the root `lib/` engine.** The demo pipeline is imported
  by a Next route, so a static `import "../../lib/*.js"` (and `new URL("../..", import.meta.url)`)
  breaks the build. Fix: compute the engine path at runtime (`pathToFileURL(join(REPO_ROOT,...))`)
  and import it via that computed specifier; derive `REPO_ROOT` with `dirname(fileURLToPath(...))`.
  `resend` in the lead route is imported via a computed specifier too (optional dep, warning only).

## Phase 2 — Approval Queue Labor Fix

- **D2.1 Graduated autonomy is scaffolding, locked OFF at the DB.** `firms.autonomy_level`
  (migration 0005, both tracks) has a CHECK allowing ONLY `'manual'` — the database itself
  refuses to store an autonomous mode. The send chokepoint adds a defensive gate (skip
  `autonomy_not_manual`) so even a corrupted row cannot bypass human approval. Approval
  (gate 1) is always required regardless.
- **D2.2 Batch approve = N individual approvals.** `approveManyAction` loops the existing
  per-message `approveMessage`, stamping the same reviewer on each. No new "bulk" DB path,
  so every message still carries an explicit human approver (the compliance promise). Nothing
  sends from the queue — approved messages stay behind the chokepoint.
- **D2.3 SLA logic is pure + shared.** `messaging/sla.mjs` (no I/O) is imported by BOTH the
  queue client (browser) and the digest (Node) so "overdue" means the same everywhere.
  Stale threshold = 12h. The client computes `now` post-mount (and ticks it) to avoid a
  hydration mismatch.
- **D2.4 Daily digest mirrors the weekly-report pattern.** Pure `buildDigest` + TEST_MODE-gated
  `sendDailyDigest` with an injectable Resend mailer (lazy-imported). In TEST_MODE it writes
  `web/output/digest-<firm>-<date>.html` and transmits nothing. Recipient from `DIGEST_TO`.

## Phase 3 — SOL Guardian + Case-Ready Summary

- **D3.1 SOL Guardian is two layers, LLM only for facts.** An injectable LLM extractor
  (`analysis/sol-guardian.md`) reports FACTS only (incident date, case type, government
  defendant, minor). The deadline is then computed by PURE deterministic date math
  (`computeSol`) that never calls a model — so the date is exactly testable and cannot be
  hallucinated. This is the whole point: an attorney-verifiable estimate, not an LLM guess.
- **D3.2 California rule priority: government > MICRA > general PI.** `selectRule` picks the
  6-month government-claim deadline (Gov Code §911.2) first because it is the shortest and
  most-often-missed, then 1-year MICRA (CCP §340.5), else the 2-year general statute
  (CCP §335.1). Month-end overflow clamps (Aug 31 + 6mo → Feb 28). Edge cases (delayed
  discovery, tolling variants) are exactly why the disclaimer + attorney verification exist.
- **D3.3 Minor tolling never reported as "expired".** A minor on a non-government matter sets
  `minorTollingMayApply` and bumps an otherwise-"expired" urgency to "critical" (tolling under
  CCP §352 likely extends it). A minor on a GOVERNMENT claim is NOT tolled — stays urgent.
- **D3.4 Mandatory disclaimer on every result.** Both passes attach a disclaimer string
  (`SOL_DISCLAIMER` / `SUMMARY_DISCLAIMER`) that the UI always renders. The summary carries
  no fees and no legal conclusions — it is a triage memo, not advice.
- **D3.5 Both passes are best-effort in the demo pipeline.** `runDemoPipeline` wraps each in
  try/catch so a failed SOL/summary pass never sinks the core score result. Both are
  injectable (fake extractor/summarizer in tests) so demo tests stay network-free.
