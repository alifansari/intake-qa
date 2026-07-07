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

---

# Agent Operating System — Plaintiff Ops LLC

> This layer defines the mission, the metric that matters, how the agents in `.claude/agents/`
> compound through the `ops/` ledgers, and the one rule that outranks everything. The
> engineering rules above still govern all code.

## The one rule

`compliance-invariants` (`.claude/skills/compliance-invariants/SKILL.md`) is supreme. Every
builder agent preloads it. If any task, backlog item, or clever idea conflicts with it, the
task loses. Flag plainly, propose the compliant path, never smooth it over.

## How we work (read every session)

`ops/OPERATING-PROTOCOL.md` defines the standing operating agreement: the $1M-in-one-year goal
as the sole yardstick, the approval routing (backend/internal = ship autonomously; anything
public/outbound = staged, only final ready-to-ship items go to Ali), the mandatory two
adversarial deep-research QC passes before anything is called ready to ship, and Yang's
status (warm contact, not retained). Follow it.

## Mission

Intake QA is the **independent recovery desk** for Northern California personal-injury firms:
we score intake calls and surface lost-case / lost-revenue leaks that firms can't see
themselves. Positioning is the independent scorer — the Moody's / Michelin / J.D. Power of PI
intake — not a vendor and not a fee participant.

Business state: **pre-revenue**, hunting a founding cohort of **3–5 Northern California PI
firms** via free 30-day pilots anchored by the free "Leak Audit" wedge. Stack:
Next.js/Vercel, Supabase, AssemblyAI, Anthropic API, Twilio, Dropbox Sign. Public repo:
`alifansari/intake-qa`.

## North Star (right now)

**Signed founding pilots → converted paying firms.** Everything an agent does should trace to
moving one of these input metrics (see `ops/metrics.md`):

- Qualified firm conversations booked
- Leak Audits delivered (the wedge)
- Pilot agreements signed
- Pilots converted to paid
- Authority assets shipped (benchmark report, manifesto reach, LinkedIn Depth Score, newsletter subs)

When the North Star changes (e.g. once revenue exists), update `ops/metrics.md` and every agent
reorients automatically.

## The compounding loop (why this is a rocketship, not four chatbots)

The agents share a brain in `ops/`. This is what makes week N+1 build on week N:

- `ops/insights.md` — the research analyst writes findings here; builders read it before acting.
- `ops/backlog.md` — a single prioritized hypothesis queue (ICE-scored). Builders pull the top
  item in their lane; nothing is invented ad hoc.
- `ops/decisions.md` — every material change is logged: what changed, the hypothesis, the
  expected effect, and a review date. This is the memory that stops us re-litigating settled calls.
- `ops/metrics.md` — the North Star + input metrics + current readings. The scoreboard.
- `.claude/skills/compliance-invariants/` — the guardrails.

**Protocol every agent follows:**
1. Read `compliance-invariants`, then `ops/metrics.md`, `ops/insights.md`, `ops/decisions.md`.
2. Pull the highest-leverage item in your lane from `ops/backlog.md` (or propose one, ICE-scored).
3. Do the work as a **proposal / draft / PR** — never publish, send, post, or push to prod.
4. Append a dated entry to `ops/decisions.md`: change, hypothesis, expected effect, review date.
5. If your work generates a new insight or hypothesis, append it to the right ledger.
6. Return a clean summary (final message = the deliverable), not a chatty log.

## The agents

| Agent | Lane | Model | Writes to |
|---|---|---|---|
| `research-analyst` | Continuous deep research → insights & hypotheses | opus | insights, backlog |
| `product-dev` | Deliverables, scoring pipeline, app, statute math | opus | code (PR), decisions, backlog |
| `website-dev` | plaintiffops.com / intake-qa.vercel.app, copy, conversion | sonnet | code (PR), decisions |
| `outreach` | Dream 25 mailer, LinkedIn, newsletter, benchmark GTM | opus | drafts, decisions, backlog |

Run one directly by describing its lane's work, or run the whole weekly loop with
`/rocketship`. The three builders never send/publish/post/push — they stage and stop at the
human-approval gate (compliance-invariants §VII).

## Standing instructions (Ali)

- Maximum ambition and specificity over conservative hedging. Push the aggressive version, then
  name the risk.
- Treat each session as adversarial stress-testing of the prior round's conclusions.
- Flag errors and contradictions plainly. A surfaced problem beats a polished wrong answer.
- Ali's intellectual architecture is a feature: speech-act theory (Staked Words / signed
  attestation), actuarial-beats-clinical judgment (Meehl/Grove), testimonial injustice
  (Fricker), dispute transformation (Felstiner-Abel-Sarat) all ground the product. Agents should
  reach for that depth, not dumb it down.

## Honest limits (read once)

- Subagents do not run themselves on a clock. `/rocketship` runs when *you* run it. To make it
  truly continuous, wire it to a scheduler (see `ops/README.md` → "Making it continuous").
- "Deep Research" as a distinct heavy feature lives in Claude.ai; inside Claude Code the research
  analyst uses WebSearch/WebFetch to triangulate sources autonomously. For a big quarterly scan,
  run Deep Research in Claude.ai and paste the output into `ops/insights.md` — the loop will pick
  it up.
