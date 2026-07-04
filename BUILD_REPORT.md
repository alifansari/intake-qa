# BUILD_REPORT.md — Intake QA, component-by-component

Written for a product analyst / evaluator. It describes what the system does, how the
pieces fit, and where the compliance guarantees are enforced. It does not sell — it states.

## One line

Catch the signable personal-injury intake calls a firm's team let slip, then win them back
with compliant, human-approved SMS re-engagement — every text approved by a person, nothing
sent while in pilot.

## The three tracks (do not conflate)

1. **Concierge CLI (repo root)** — the calibrated scoring engine: MP3 → AssemblyAI (diarized,
   polling) → Claude scoring against `scoring/system-prompt.md` + firm config + 3 gold examples
   → JSON → one-page HTML report. Plain Node, no build step. This engine is **frozen** — new
   analysis is added as separate passes, never by editing the prompt files.
2. **Intake QA v1 SaaS (`web/`)** — the product below, built on a demo foundation. Next.js 16
   App Router + TypeScript + Tailwind. Data flows through a store facade that runs on local
   SQLite (pilot/tests) or Supabase Postgres (hosted) with identical stage code.
3. **Outcome Reconciliation Dashboard (`web/` demo views)** — the shareable views that prove
   the scorer's flags match real outcomes; now v1's reporting layer.

## Compliance chokepoint (the load-bearing part)

Every outbound SMS passes through one function, `web/messaging/send.mjs`, which applies gates
in order: **pilot-mode (human approval required) → opt-out → global kill switch → per-firm kill
switch → quiet hours → TEST_MODE**. No code path sends around it. The pure decision logic lives
in `messaging/compliance.mjs` (quiet hours, opt-out keyword detection, kill switch, TEST_MODE)
so it is identical for SQLite and Postgres and is unit-tested without I/O.

- **PILOT MODE**: no autonomous sends — a human approves each message.
- **Quiet hours**: no sends 8pm–8am recipient-local.
- **Opt-out**: STOP/UNSUBSCRIBE/CANCEL/QUIT/END/REVOKE/OPT OUT → immediate, logged, permanent.
- **Kill switch**: global env flag halts everything; per-firm switch defaults ON for new firms.
- **TEST_MODE**: while on, sends are simulated/logged, never transmitted. Off only after A2P 10DLC.

## Pipeline stages (`web/`)

- **Ingestion** — `ingest/callrail.mjs` (HMAC-verified webhook) + `ingest/manual.mjs` (MP3
  upload). Zod-validated at the boundary. Writes a `calls` row via the store facade.
- **Scoring** — `ingest/score-worker.mjs` (`scoreUnscored`) transcribes + scores each unscored
  call with the frozen engine; a call is "scored" once it has a `flags` row. Transcriber + scorer
  are injectable so tests run with deterministic fakes (no network, no key).
- **Flag logic** — leaked-signable = the engine's `alerts.lost_signable_case === true`.
- **Draft** — `messaging/draft.mjs` fills an attorney-approved template and runs `validateDraft`
  (opt-out present, firm named, ≤320 chars, no legal advice/guarantees). This same guard is what
  onboarding uses to validate a firm's template pack.
- **Approval queue** — `/queue` (`src/app/queue`): per-message Approve/Edit/Reject plus batch
  approve, keyboard shortcuts, and SLA staleness highlighting (>12h). A daily digest
  (`messaging/digest.mjs`) emails the reviewer the pending/overdue list (TEST_MODE-gated).
- **Send** — the chokepoint above; in TEST_MODE it simulates and logs.
- **Inbound** — `messaging/inbound.mjs`: routes replies, auto-honors opt-out, queues reply drafts.
- **E-sign / callback** — `messaging/handoff.mjs` + Dropbox Sign (sandbox) signature link or a
  booked callback; completion webhook correlates back to the handoff.
- **Weekly reconciliation** — `messaging/reconcile.mjs` + `weekly-report.mjs`: the recovered-$
  figure is **signed outcomes only** (recoveries exist only for `signed`), so the brag number is
  honest. TEST_MODE-gated email; renders HTML to `web/output/` otherwise.

## Phase additions

- **P1 Demo Mode** — public `/demo`: upload a call, watch it score, see a watermarked result with
  fee-at-risk. Hard-isolated tables (`demo_calls`/`demo_leads`, no firm_id, no messages) so a demo
  can NEVER become a real send. DB-backed IP rate limit; audio never persisted; 72h purge.
- **P2 Approval-queue labor fix** — batch actions, shortcuts, SLA, daily digest, and graduated
  autonomy scaffolded but LOCKED OFF at the DB (`autonomy_level` CHECK allows only `'manual'`).
- **P3 SOL Guardian + Case-Ready Summary** — an injectable LLM extracts FACTS only; a pure,
  deterministic California deadline calculator (`analysis/sol.mjs`) computes the statute-of-
  limitations estimate (government-claim > MICRA > general PI; minor tolling handled). Every result
  carries a mandatory attorney-verification disclaimer. Both passes are best-effort in the demo.
- **P4 Onboarding wizard** — `/onboard`: a 5-step wizard producing a firm config + a versioned,
  approved template pack (`template_versions`, immutable snapshots with `approved_by`). New firms
  are born SAFE (kill switch ON, autonomy manual). `/getting-started` explains it in plain English.
- **P5 Go-live readiness** — an always-on operator error log (`errors` table, both tracks; Postgres
  RLS service-role-only), a TEST_MODE-gated operator alert email, a read-only `/admin/status` board
  (guardrail flags, per-firm kill switches, pending approvals, recent errors), and `npm run smoke`,
  a fast no-network readiness preflight. `GO_LIVE.md` is the 10-gate human checklist.

## Data + storage seam

- All access goes through `ingest/store.mjs` — an async facade that dispatches per-call to SQLite
  (`ingest/db.mjs`) or Postgres (`ingest/db-postgres.mjs`) based on the handle. Same stage code
  runs on either backend.
- Two migration tracks kept in lockstep: `web/db/migrations/*.sql` (SQLite) and
  `web/supabase/migrations/*.sql` (Postgres). Every firm-data table has RLS; isolated/operator
  tables enable RLS with no policy (service role only). `npm run smoke` asserts the tracks align.

## How to verify (no keys, no network, nothing sent)

- `npm --prefix web test` — 71 unit tests (compliance, reconcile, SOL, onboarding, error log).
- `npm --prefix web run smoke` — config/readiness preflight.
- `npm --prefix web run e2e-synthetic` — the full recovery loop on fake data, every stage PASS.
- `npm --prefix web run build` — production build.

## Stack (locked)

Next.js 16 / TypeScript / Tailwind; Supabase (Postgres + Auth + Storage + RLS); Vercel;
AssemblyAI; Anthropic (Claude Sonnet 4.6, prompt caching on); Twilio; Dropbox Sign; Resend.
No alternatives introduced.
