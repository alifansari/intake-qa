# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with the founder

The owner is a non-coder founder. Before making changes, explain in plain English what you're about to do and why. After a set of changes, run the build and then tell them exactly what to click to verify it works.

**NEVER run destructive commands** (`rm -rf`, `DROP TABLE`, force push, resetting the database) without stopping first and asking for confirmation in **bold**.

## What this product is

A SaaS for solo / small California plaintiff personal-injury law firms. The core pipeline:

1. Firm uploads intake-call MP3s
2. We transcribe them (AssemblyAI, via webhooks — not polling)
3. We score the transcript against an LLM rubric (Anthropic Claude Sonnet 4.6)
4. We email a weekly report with scores, alerts, and revenue-at-risk

End users are non-technical law-firm staff, so UX and copy should assume no technical knowledge.

## Three build tracks

There are three implementations of the same product. Do not confuse their rules:

1. **Concierge pipeline (local CLI)** — what currently exists in THIS repo. A plain
   Node.js command-line tool that turns one MP3 into an HTML report on the founder's Mac.
   Deliberately simple: polling (not webhooks), local files (not a database), plain Node
   (not Next.js). See the section below. The "do not introduce alternatives" stack list is
   about the SaaS track and does NOT apply here.
2. **SaaS (30-day track)** — the hosted web app described under "Stack" and "Architecture"
   below. Not built yet.
3. **Outcome Reconciliation Dashboard (`web/`)** — a shareable demo/prototype that proves
   the scorer's flags match real-world outcomes. Real Next.js app (the SaaS foundation) but
   backed by LOCAL JSON, no auth, no DB. See the section below.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`

## Stack (do not introduce alternatives)

- Next.js 16 (App Router), TypeScript, Tailwind
- Supabase — Postgres + Auth (magic links) + Storage + Row Level Security
- Vercel (Pro plan) for hosting
- Upstash QStash for background job queueing
- AssemblyAI for transcription (webhooks, not polling)
- Anthropic API (Claude Sonnet 4.6) for scoring; prompt caching ON
- Resend for weekly report emails

**Do NOT introduce:** Redux, Prisma, a different DB, or a different auth system.

## Architecture & conventions

The processing flow is asynchronous and event-driven. An upload does not block on transcription or scoring — work is handed off to QStash and completed via webhook callbacks:

- Upload lands in Supabase Storage → a job is enqueued on QStash
- AssemblyAI transcribes and calls back via **webhook** (never poll for results)
- The transcript is scored with the Anthropic rubric, then persisted
- A separate weekly process aggregates scores into a Resend email report

Code layout and where things go:

- `app/` — routes and pages (App Router)
- `lib/` — helpers and clients (Supabase client, Anthropic client, AssemblyAI client). **All business logic lives here, not inside UI components.**
- `scoring/` — the calibrated scoring engine, as plain text: `system-prompt.md`,
  `firm-config-template.md` (the blank template), and `gold-example-1.md` / `-2` / `-3`
  (the worked gold examples). The original Word `.docx` versions are archived in
  `source-docx/` as a backup — do not use those at runtime.
- `config/` — filled firm configs used at runtime (e.g. `config/test-firm.md`). Make a
  real firm's config by copying `scoring/firm-config-template.md` here and filling it in;
  never edit the template itself.

### Scoring pipeline contract (fixed)

`scoring/` is a calibrated scoring engine. When building the scoring pipeline, assemble the Anthropic request exactly this way:

- Load `scoring/system-prompt.md` verbatim as the **system prompt**
- **Prepend the firm's config** to the system prompt
- Include the **three gold examples** as few-shot anchors

**Treat the prompt text as fixed.** Do NOT rewrite, reword, or "improve" `system-prompt.md`, the config template, or the gold examples. They are calibrated — changing them changes scoring behavior.

## Concierge pipeline (local CLI — current implementation)

A local Node.js CLI: MP3 → AssemblyAI transcription (diarized, **polling** not webhooks) →
Claude scoring against `scoring/system-prompt.md` → JSON result → one-page HTML report.

Run it:
- One call: `node score.js calls/test1.mp3`
- A folder: `node score.js calls/` (also writes `output/summary.html` with a total
  "found money" revenue-at-risk row)
- No-audio smoke test: `node fake-test.js` (scores a canned transcript; needs only
  `ANTHROPIC_API_KEY`)
- Report only, no API/cost: `node lib/report.js <score.json> <out.html> "Firm Name"`

Layout:
- `score.js` — orchestrator (transcribe → score → report)
- `lib/transcribe.js` — AssemblyAI + INTAKE/CALLER role heuristic
- `lib/score-call.js` — builds the Claude request (system prompt + firm config + 3 examples
  in order 2,1,3), model `claude-sonnet-4-6`, temp 0, prompt caching on the stable parts
- `lib/report.js` — HTML report + batch summary renderer
- `lib/examples.js` — parses gold-example files into few-shot blocks
- `output/` — generated transcripts/scores/reports (git-ignored)
- `calls/` — input audio (git-ignored, confidential)

Keys live in `.env` (git-ignored): `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`. There is no
build step and no lint/test config yet — the "Commands" above (`npm run dev` etc.) belong to
the SaaS track and do not exist in this repo.

## Outcome Reconciliation Dashboard (`web/` — demo/prototype)

A shareable, phone-friendly Next.js app for design-partner sales conversations. It proves
the intake scorer's flags line up with what really happened (did the flagged "lost signable"
call actually sign elsewhere?). It is the SaaS foundation, but for the demo it runs on LOCAL
JSON with **no auth and no database**. Lives entirely in `web/` — the root CLI is untouched.

Run it: `npm --prefix web run dev` (or `cd web && npm run dev`), then open `localhost:3000`.
Regenerate demo data: `node web/scripts/generate-seed.mjs`. Deploys to Vercel with the seed
committed (data ships in git; only `.next/`/`node_modules` are ignored).

**Data-access seam (ports-and-adapters — the important part):**
- `web/src/lib/repository.ts` — the `Repository` interface (`getScoredCalls`, `getCallMeta`,
  `getOutcomes`, `upsertOutcome`). UI and pages ONLY touch this interface, never `fs`.
- `web/src/lib/json-repository.ts` — the one impl today, `JsonFileRepository` (`server-only`).
  Reads scored calls from `web/data/scored-calls/*.json` (seed) plus the CLI's real
  `output/*.score.json` (local only); reads/writes outcomes to `web/data/outcomes.json`
  (best-effort write, so a read-only serverless fs never breaks the demo).
- A future `SupabaseRepository` implements the same interface and swaps in with **zero UI
  changes** — that is the whole point of the seam.

**Data model:**
- `ScoredCall` (`web/src/lib/schema.ts`) is the EXISTING `.score.json` — a lenient Zod
  passthrough schema. Do NOT redesign it; real scored calls must drop in unchanged.
- `Outcome` is a sibling record keyed by `call_id` (8-value `outcome_code` enum,
  `callback_made`, timing, `realized_fee_recovered`, `outcome_version`++ with an `edits[]`
  audit trail). Missing outcome → default `"unknown"`.
- `CallMeta` is a sidecar (`web/data/call-meta.json`) holding call date/rep/source, which the
  score.json deliberately does NOT carry — keeps score files pristine.

**Pure logic** lives in `web/src/lib/reconcile.ts` (verdict table: correct_flag /
false_alarm / missed_catch / correct_pass / excluded) and `web/src/lib/metrics.ts` (flag
precision, catch rate, recovered fees, sign-rate-by-band, etc.) — no I/O, identical for JSON
now and Supabase later. Every formula is surfaced in a methodology tooltip.

**Seed generator** (`web/scripts/generate-seed.mjs`) uses a fixed `MASTER_SEED` + mulberry32
PRNG, so reruns are bit-identical. ~200 calls, 8 reps, ~90 days, with sign rate correlated to
score band and deliberate scorer mistakes so the calibration story is honest.

Screens: `/` Executive Summary, `/calibration` (incl. "Our Misses"), `/funnel`, `/triage`
(single-key outcome entry), `/statement` (printable reconciliation statement). This is a
DEMO: no auth/CRM/realtime/DB, no tests beyond a smoke check, no changes to the CLI.

## Hard rules

- **Secrets** (API keys) live ONLY in `.env.local` and Vercel env vars. NEVER in code, NEVER committed to git.
- For the local CLI, secrets live in `.env` (git-ignored). Same rule: never printed, never committed.
- **Row Level Security:** every table containing firm data MUST have RLS enabled with a policy. This is a hard requirement, not optional.
- **Confidentiality & retention:** recordings and transcripts are confidential. Recordings must auto-delete after 30 days.
- Enable Anthropic **prompt caching** on scoring calls.
