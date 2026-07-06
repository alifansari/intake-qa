# IMPLEMENTATION_PLAN.md — Independent Recovery Desk product round (Step 0)

Additive-only build against a frozen scoring/flagging/gate core. **No feature code is written
until this plan is committed** (per the round's Step 0 rule). This document maps the current
system, locates the frozen core + tests, and maps each of the 16 report items to the exact files
it will add or (additively) touch.

## ⚠️ Baseline-test-count correction (must read)
The round assumes **132 passing tests, unmodified**. The actual current baseline is **130** (`npm
--prefix web test` → `pass 130`). The delta is not a regression: earlier this session the billing
engine was intentionally migrated from per-case to flat-monthly (an approved product change), which
rewrote `web/tests/billing.test.mjs` (~−2 tests). **The frozen scoring/flagging/gate tests were not
touched.** So the real, honored constraint is: *the frozen-core tests below stay green and unmodified;
130 is the true baseline; each new item adds its own tests.* Acknowledged by Ali (July 2026): 130
is the accepted baseline (the two migrated billing tests are not reconstructed). The suite has since
grown well past it as new items added their own tests.

---

## 1. Current system map

### Frozen core (DO NOT change behavior — additive fields only)
| Concern | File(s) | Guarded by tests |
|---|---|---|
| Scoring (Claude request assembly) | `lib/score-call.js`, `scoring/system-prompt.md`, `scoring/gold-example-{1,2,3}.md`, `scoring/firm-config-template.md`, `web/ingest/score-worker.mjs` | `web/tests/pipeline.test.mjs` |
| Flagging (leaked-signable) | `web/ingest/flag-logic.mjs` | `pipeline.test.mjs`, `reconcile.test.mjs` |
| Compliance gates + send chokepoint | `web/messaging/compliance.mjs`, `web/messaging/send.mjs` | `send.test.mjs`, `draft.test.mjs` |
| Draft generation | `web/messaging/draft.mjs`, `web/messaging/templates.mjs` | `draft.test.mjs`, `spanish.test.mjs` |
| Statute (SOL) logic | `web/messaging/sol.mjs`, `web/ingest/sol-rules.mjs` | `sol.test.mjs` |
| Transcription | `web/ingest/transcribe.mjs`, `lib/transcribe.js` | `pipeline.test.mjs` |
| Outcome/reconcile | `web/messaging/outcome.mjs`, `web/ingest/reconcile.mjs` | `reconcile.test.mjs`, `handoff.test.mjs` |

### Data access seam
- `web/src/lib/repository.ts` (interface) · `json-repository.ts` (JSON impl) · `pilot-repository.ts`.
- DB layer: `web/ingest/db.mjs` (SQLite via `node:sqlite`) + `web/ingest/db-postgres.mjs` (Supabase);
  surfaced async through `web/ingest/store.mjs` (backend-selecting facade). **All new DB functions
  must be added to BOTH dialects + the store facade** (established pattern).

### Migrations (dual-track lockstep)
`web/db/migrations/0001…0013_*.sql` (SQLite) and `web/supabase/migrations/0001…0013_*.sql`
(Postgres). Runner `web/db/connection.mjs` tracks applied files in `_migrations` (each runs once).
Next migration number = **0014**. New tables go in BOTH tracks.

### API routes (`web/src/app/api/*`)
`admin/billing`, `admin/features`, `audit/{report,session,status}`, `demo/{lead,process,status,upload,upload-url}`,
`onboard`, `outcomes`, `settings/integrations`.

### App screens today (to be consolidated to four — item 3)
`dashboard`, `queue`, `triage`, `reps`, `calibration`, `funnel`, `statement`, `getting-started`,
`billing`, `admin/{audits,billing,features,status}`, `audit`, `audit/[token]`, `audit/sample`,
`demo`, `onboard`, `login`, `settings/integrations`.

### Jobs today
No durable job runner. `web/ingest/score-worker.mjs` + the demo pipeline run via awaited requests /
fire-and-forget. **Item 9 introduces Inngest** as the durable runner (new dependency + new routes).

### Data models
`web/src/lib/schema.ts` (lenient Zod `ScoredCall` — DO NOT redesign; extend via sibling records),
`web/src/lib/audit-types.ts`, `web/src/lib/metrics.ts`, `web/src/lib/reconcile.ts`.

---

## 2. Report item → files (all additive)

**Item 2 — Additive schema** (migration `0014_*` both tracks; new fns in `db.mjs`+`db-postgres.mjs`+`store.mjs`):
`transcript_citations`, `flag_confidence` (adds `confidence_tier` to a NEW sibling row, not the frozen flag row), `analysis_versions`, `artifact_access_log`, `citation_failures`, `v_call_reconciliation` view. NEW `web/tests/schema-additive.test.mjs`.

**Item 3 — Citation Guard** — NEW `web/analysis/citation-guard.mjs` (RapidFuzz-equivalent; JS uses `fastest-levenshtein`/a partial-ratio impl — TODO confirm lib, RapidFuzz is Python), validator + bands (≥90 pass / 80–90 review / <80 fail), drop+log failures. NEW `citation-guard.test.mjs`. Consumed by output assembly only — never alters flag decisions.

**Item 4 — Confidence tiers** — NEW `web/analysis/confidence-tier.mjs` (versioned rubric prompt file `web/analysis/prompts/confidence-rubric.v1.md`), structured output, writes to the new sibling row + `analysis_versions`. Drift job under item 9. NEW `confidence-tier.test.mjs`. Additive field only.

**Item 5 — Transcription abstraction** — NEW `web/ingest/engines/transcription-engine.mjs` (interface), `assemblyai-engine.mjs` (wraps existing `transcribe.mjs` logic — no behavior change), `deepgram-engine.mjs` (stub). Forced-language routing config on firm/channel. QA sampling → internal queue. Role-ID hardening (heuristic + LLM fallback) as a NEW module `speaker-roles.mjs`. NEW `transcription-engine.test.mjs`, `speaker-roles.test.mjs`.

**Item 6/9 — Inngest pipeline + reconciliation** — NEW `web/inngest/{client,functions}.mjs`, route `web/src/app/api/inngest/route.ts`. Steps ingest→transcribe→analyze→assemble. Idempotency key = call file hash. Dead-letter row + reason feeds `v_call_reconciliation`. NEW `reconciliation-invariant.test.mjs`, `inngest-idempotency.test.mjs`.

**Item 7/10 — Security** — RLS policies on all tenant tables (migration `0014`), signed-URL TTL 300s helper in `web/src/lib/supabase/`, `artifact_access_log`, deletion cascade as an Inngest function + `web/src/app/api/settings/delete/route.ts`, `SECURITY.md`, `INCIDENT_RESPONSE.md`. NEW `deletion-cascade.test.mjs`, `rls-policy.test.mjs`.

**Item 8 — PDF engine** — new dep `@react-pdf/renderer`; NEW `web/src/pdf/{fonts,statement,readout,shared}.tsx`; routes `web/src/app/api/documents/{statement,readout}/route.ts`. NEW `pdf-render.test.mjs` (renders without throw, contains fixed verbatim strings, real selectable text).

**Item 3-app — Four screens** — NEW `web/src/app/(app)/{queue,documents,reconciliation,settings}/page.tsx`; old tab routes REDIRECT via `next.config` redirects or route-level `redirect()`. NEW `route-redirects.test.mjs` (each old route → new). No data loss.

**Item 4-workflow — Follow-up queue + digest** — extend queue screen; NEW `web/src/app/api/drafts/*`; digest via Resend + Inngest cron; instrumentation events table. NEW `draft-workflow.test.mjs` (gate NEEDS REVIEW disables copy).

**Item 5-coaching — Clips + scorecards** — NEW `web/src/app/(app)` sub-view + `web/analysis/coaching-clip.mjs`; anti-shame RLS/role tests `coaching-rls.test.mjs`.

**Item 11 — Outcome reconciliation** — CSV upload route + fuzzy matcher `web/analysis/matter-match.mjs`; `MatterSource` interface + `Clio/Filevine/LeadDocket` stubs (`throw NotImplemented`); save-status state machine `web/messaging/save-status.mjs`. NEW `matter-match.test.mjs`, `save-status-machine.test.mjs`.

**Item 12 — Fee methodology** — NEW `web/analysis/fee-value.mjs` + `fee_value_ranges` seed (migration `0014`), `METHODOLOGY.md` (verbatim Appendix A). NEW `fee-value.test.mjs` (ranges only, never point).

**Item 13 — Instrumentation** — events table + internal metrics view + labeling UI in queue. NEW `metrics-view.test.mjs`.

**Item 15 — Demo mode** — NEW `web/scripts/seed-demo.mjs` (`npm run seed:demo`), `is_demo` column (migration `0014`), excluded from real metrics. NEW `demo-seed.test.mjs`.

---

## 3. Recommended sequencing (see "Scope reality" note to Ali)
The report's execution order is 1→16. For a **pre-pilot, zero-customer** stage, the highest-leverage
subset that lets Ali *show* the product and *run a first pilot* is: **schema (2) → PDF artifacts (8)
→ four screens (9) → demo mode (15) → citation guard (3) → confidence tiers (4).** The heavy
infra (Inngest pipeline, RLS hardening, deletion cascade, drift jobs, integrations) is essential
before a real firm's confidential calls flow through production, but not before the first demo. I
recommend we gate in that order unless you say otherwise. Each step is a separate PR with its own
green test run.

## 4. Additive-only guardrails (enforced every step)
- Never edit `scoring/*`, `lib/score-call.js`, `flag-logic.mjs`, `compliance.mjs`, `send.mjs`,
  `sol*.mjs` behavior. New fields ride on NEW sibling rows/tables, never by mutating `ScoredCall`.
- New DB fns added to `db.mjs` + `db-postgres.mjs` + `store.mjs` together; new tables in both
  migration tracks.
- Full `npm --prefix web test` after each item; if any frozen-core test goes red, STOP and revert.
- Every real-world unknown → literal `TODO(Ali):` (collected in `TODO_ALI.md`).
