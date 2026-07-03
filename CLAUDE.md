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

## Two build tracks

There are two implementations of the same product. Do not confuse their rules:

1. **Concierge pipeline (local CLI)** — what currently exists in THIS repo. A plain
   Node.js command-line tool that turns one MP3 into an HTML report on the founder's Mac.
   Deliberately simple: polling (not webhooks), local files (not a database), plain Node
   (not Next.js). See the section below. The "do not introduce alternatives" stack list is
   about the SaaS track and does NOT apply here.
2. **SaaS (30-day track)** — the hosted web app described under "Stack" and "Architecture"
   below. Not built yet.

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

## Hard rules

- **Secrets** (API keys) live ONLY in `.env.local` and Vercel env vars. NEVER in code, NEVER committed to git.
- For the local CLI, secrets live in `.env` (git-ignored). Same rule: never printed, never committed.
- **Row Level Security:** every table containing firm data MUST have RLS enabled with a policy. This is a hard requirement, not optional.
- **Confidentiality & retention:** recordings and transcripts are confidential. Recordings must auto-delete after 30 days.
- Enable Anthropic **prompt caching** on scoring calls.
