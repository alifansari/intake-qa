# CLAUDE.md

This file guides Claude Code when working in this repository. Instructions here
OVERRIDE default behavior — follow them exactly.

## Working with the founder

The owner is a non-coder founder. Before making changes, explain in plain English what
you're about to do and why. After a set of changes, run the build and then tell them
exactly what to click to verify it works.

**NEVER run destructive commands** (`rm -rf`, `DROP TABLE`, force push, resetting the
database) without stopping first and asking for confirmation in **bold**.

## What this is

**Intake QA** — a SaaS for solo / small California plaintiff personal-injury firms that
scores intake calls AND recovers leaked signable cases via compliant, human-approved SMS
re-engagement.

One line: *catch the signable calls your intake team let slip, then win them back — with a
human approving every text.*

End users are non-technical law-firm staff, so UX and copy assume no technical knowledge.

## v1 scope

1. **Ingestion** — CallRail webhook + manual MP3 upload fallback.
2. **Scoring pass** — reuse the existing calibrated engine (AssemblyAI transcribe → Claude
   score against `scoring/system-prompt.md` + firm config + 3 gold examples; prompt caching).
3. **Flag logic** — leaked-signable = `alerts.lost_signable_case === true`.
4. **SMS re-engagement (Twilio)** — PILOT MODE: every outbound message requires human
   approval before send. Claude drafts messages from attorney-approved templates. Approval
   happens in an in-app queue (Approve / Edit / Reject per message).
5. **E-sign handoff** — Dropbox Sign (test mode) signature link + booked-callback option.
6. **Weekly reconciliation email** — recovered fees, sends, opt-outs, still-open.

v1 runs inside `web/` (Next.js App Router, TypeScript, Tailwind), persisted via the
Repository seam backed by LOCAL JSON for the pilot (Supabase later, with **zero UI change**).
The 5 existing dashboard views are the reporting layer. The root CLI + scoring engine stay
usable.

## COMPLIANCE GUARDRAILS (non-negotiable, enforce in code)

These are legal requirements, not preferences. Enforce them in a **single send chokepoint**
(`web/src/lib/messaging/send.ts`) — no code path may send around it.

(a) **PILOT MODE** — no autonomous sends. A human must approve every outbound message before
    it can be sent.
(b) **Quiet hours** — no sends 8:00pm–8:00am in the recipient's local time.
(c) **Opt-out** — inbound `STOP / UNSUBSCRIBE / CANCEL / QUIT / END / REVOKE / OPT OUT`
    triggers auto opt-out, honored immediately and logged, processed within 10 business days
    per the FCC rule. Once opted out, that number is never texted again.
(d) **Consent logging** — every message is logged with its consent basis.
(e) **Kill switch** — a global `KILL_SWITCH` env flag halts ALL sends instantly.
(f) **No real numbers until compliant** — never text a real number until A2P 10DLC is
    approved AND `TEST_MODE` is off. While `TEST_MODE=true`, sends are simulated / logged
    only.
(g) **Secrets** — only in env vars, never in code, never committed.
(h) **Data retention** — purge transcripts and messages after `DATA_RETENTION_DAYS`
    (configurable). Recordings/transcripts are confidential.

## Scoring pipeline contract (fixed — do NOT edit)

`scoring/` is a calibrated scoring engine. Assemble the Anthropic request exactly this way:

- Load `scoring/system-prompt.md` **verbatim** as the system prompt.
- **Prepend the firm's config** to it.
- Include the **three gold examples** (order 2, 1, 3) as few-shot anchors.
- Model `claude-sonnet-4-6`, temperature 0, **prompt caching ON** for the stable parts.

**Treat the prompt text as fixed.** Do NOT rewrite, reword, or "improve" `system-prompt.md`,
`firm-config-template.md`, or the gold examples — they are calibrated, and changing them
changes scoring behavior. Never edit the template; make a real firm's config by copying
`scoring/firm-config-template.md` into `config/` and filling it in.

## The three tracks in this repo

Do not confuse their rules:

1. **Concierge CLI (root)** — the current engine: MP3 → AssemblyAI (diarized, **polling**) →
   Claude scoring → JSON → one-page HTML report. Plain Node, local files, no build step.
   Run: `node score.js calls/x.mp3` | `node score.js calls/` | `npm run fake-test` (no audio,
   needs only `ANTHROPIC_API_KEY`) | `node lib/report.js <score.json> <out.html> "Firm"`.
   Layout: `score.js` (orchestrator), `lib/transcribe.js` (AssemblyAI + INTAKE/CALLER
   heuristic), `lib/score-call.js` (Claude request), `lib/report.js` (HTML), `lib/examples.js`
   (few-shot parser). `output/` and `calls/` are git-ignored.
2. **Intake QA v1 SaaS (`web/`)** — the product described under "v1 scope", built on the demo
   foundation. JSON-backed via the Repository seam for the pilot.
3. **Outcome Reconciliation Dashboard (`web/` demo views)** — the 5 shareable views that prove
   the scorer's flags match real outcomes; now v1's reporting layer.

## Data access seam (ports-and-adapters — the important part)

- `web/src/lib/repository.ts` — the `Repository` interface. UI and pages ONLY touch this
  interface, never `fs` or SQL.
- `web/src/lib/json-repository.ts` — the one impl today, `JsonFileRepository` (`server-only`).
  Reads scored calls from `web/data/scored-calls/*.json` (seed) plus the CLI's real
  `output/*.score.json` (local only); reads/writes sibling records to `web/data/*.json`
  (best-effort writes so a read-only serverless fs never breaks the demo).
- A future `SupabaseRepository` implements the same interface and swaps in with **zero UI
  changes** — that is the whole point of the seam.

## Data model

- `ScoredCall` (`web/src/lib/schema.ts`) is the EXISTING `.score.json` — a lenient Zod
  passthrough schema. **Do NOT redesign it**; real scored calls must drop in unchanged.
  Extend the model with *sibling* records (`Outcome`, `Contact`, `Message`, `ConsentEvent`),
  never by editing `ScoredCall`.
- `Outcome` — reconciliation record keyed by `call_id` (8-value `outcome_code` enum,
  `callback_made`, timing, `realized_fee_recovered`, `outcome_version`++ with an `edits[]`
  audit trail). Missing outcome → default `"unknown"`.
- `CallMeta` — sidecar (`web/data/call-meta.json`) holding call date/rep/source, kept separate
  so score files stay pristine.

## Future SaaS stack (do not introduce alternatives)

When the pilot graduates to the hosted product: Next.js 16 (App Router), TypeScript, Tailwind;
Supabase (Postgres + Auth magic links + Storage + Row Level Security); Vercel; AssemblyAI
(webhooks, not polling); Anthropic (Claude Sonnet 4.6, prompt caching ON); Twilio (SMS);
Dropbox Sign (e-sign); Resend (email). **Do NOT introduce** Redux, Prisma, a different DB, or
a different auth system. When Supabase lands, **every table with firm data MUST have RLS
enabled with a policy** — this is a hard requirement, not optional.

## Coding conventions

- All business logic in `lib/` (root engine) or `web/src/lib/` — never in UI components.
- Data access ONLY through the `Repository` interface; UI/pages never touch `fs`/SQL directly.
- Pure logic (reconcile, metrics, compliance helpers) has no I/O so it is testable and
  storage-agnostic (identical for JSON now and Supabase later).
- Zod-validate at every boundary (webhooks, uploads, API bodies).
- TypeScript strict; secrets from `process.env` only.

## Hard rules

- **Secrets** live ONLY in `.env` / `.env.local` and host env vars — NEVER in code, NEVER
  committed. Root CLI uses `.env` (git-ignored); `web/` uses `.env.local` (git-ignored).
- **Compliance guardrails above are non-negotiable** and enforced in the single send
  chokepoint.
- **Prompt caching** is always ON for scoring calls.
- **Confidentiality & retention:** recordings and transcripts are confidential; purge after
  `DATA_RETENTION_DAYS` (recordings within 30 days).

## Commands / how to run tests

- CLI engine smoke test (no audio, needs `ANTHROPIC_API_KEY`): `npm run fake-test`
- CLI on a call / folder: `node score.js calls/test1.mp3` | `node score.js calls/`
- Web app dev: `npm --prefix web run dev` (http://localhost:3000)
- Web build / lint: `npm --prefix web run build` | `npm --prefix web run lint`
- Regenerate demo data: `node web/scripts/generate-seed.mjs`
- Compliance / reconcile unit checks (added under `web/`): `npm --prefix web test`
