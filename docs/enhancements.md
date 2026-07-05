# Intake QA — strategic enhancements (operator guide)

Each enhancement ships **behind a per-firm feature flag, default OFF**. Roll them
out firm-by-firm from the operator **Feature flags** console (`/admin/features`).
Everything below is built against the existing seams (facade, send chokepoint,
migrations) and stays in test/simulated mode until you complete the go-live steps.

Migrations to apply (both engines): SQLite auto-applies via `npm --prefix web run
db:migrate`; the Postgres twins in `web/supabase/migrations/0008–0012` must be run
on Supabase before these work in production.

---

## Phase 0 — Feature flags (foundation)
- **What:** per-firm on/off switches for every enhancement (`firm_features`).
- **Where:** `web/features.mjs` (registry), facade `getFirmFeatures/isFeatureEnabled/
  setFirmFeature`, UI `/admin/features`.
- **Flag on:** toggle per firm on `/admin/features`.
- **Go-live:** run migration `0008` on Supabase.

## Phase 1 — Leak Audit funnel
- **What:** multi-call (≤10) shareable audit that quantifies monthly leakage; the
  demo turned into a sales weapon.
- **Where:** `ingest/audit.mjs`, routes `/api/audit/*`, pages `/audit`,
  `/audit/[token]`, operator `/admin/audits`.
- **Flag on:** public prospect tool — no firm flag; gate later via `FEATURES.LEAK_AUDIT`
  for firm-side surfacing.
- **Go-live:** set `AUDIT_CALENDAR_URL` (Cal.com/Calendly) for the CTA; migration `0009`;
  Supabase Storage bucket `demo-audio` (already used by the demo).

## Phase 2 — Per-recovered-case billing (FLAT fee)
- **What:** base subscription + a **flat fee per recovered case** (never a % of the
  attorney's fee — Rule 5.4). Recovered-fee amounts are never a billing input.
- **Where:** `billing/invoice.mjs` (compute/generate/closePeriod), `billing/guarantee.mjs`,
  `billing/stripe.mjs` (sim), accrual hook in `messaging/outcome.mjs`, CLI
  `billing close-period <firm> <YYYY-MM>`, pages `/billing`, `/admin/billing`.
- **Flag on:** set a firm's plan via `upsertFirmBilling` (facade) or seed; plans are
  rows in `billing_plans` (pilot/core/pro seeded) — edit pricing there, no deploy.
- **Go-live:** run migration `0010`; set `STRIPE_SECRET_KEY` and turn TEST_MODE off ONLY
  when you intend real charges (until then, calls are written to `stripe_sim_log`).

## Phase 3 — Peer benchmarking
- **What:** anonymized cross-firm benchmarks; **k-anonymity ≥ 5 consenting firms**.
- **Where:** `analytics/benchmarks.mjs`, CLI `benchmarks compute`, shown on the audit report.
- **Flag on:** set each participating firm's `benchmark_data_sharing` (facade
  `setBenchmarkConsent`); run `npm --prefix web run queue benchmarks compute` (or
  `node messaging/cli.mjs benchmarks compute`) to build a snapshot.
- **Go-live:** run migration `0011`; schedule the compute (cron) — none is built (last-mile).

## Phase 4 — Spanish-language intake
- **What:** Spanish opt-out keywords + bilingual drafting (Spanish drafts carry BOTH
  the Spanish ALTO and English STOP opt-outs).
- **Where:** `messaging/compliance.mjs` (detectOptOut), `messaging/draft.mjs` (`language`).
- **Flag on:** pass `language: "es"` when drafting; opt-out detection is always on.
- **Go-live (remaining):** wire AssemblyAI language detection through the frozen engine and
  thread `language` from transcript → draft; add Spanish templates.

## Phase 5 — CRM integrations
- **What:** push flags/outcomes/audits to Lead Docket, Filevine, or a signed webhook.
- **Where:** `integrations/{connector,leaddocket,filevine,webhooks,crypto}.mjs`,
  `/settings/integrations`, `docs/webhooks.md`.
- **Flag on:** configure per firm on `/settings/integrations`; enable the integration.
- **Go-live:** run migration `0012`; set `INTEGRATIONS_ENC_KEY` (required to store
  credentials); confirm the real Lead Docket / Filevine API field names (adapters use
  clearly-marked placeholders, HTTP isolated to one function each).

## Phase 6 — Speed-to-lead
- **What:** callback-SLA engine (15-min default, staff-facing only — never sends) and a
  rep scoreboard.
- **Where:** `messaging/sla.mjs` (callbackSla/bucketBySla), `metrics.ts repScoreboard`,
  page `/reps`.
- **Flag on:** always-on staff tooling; no sends involved.
- **Go-live (remaining):** wire the Triage live countdown + breach escalation and the
  weekly-report rep ranking.

## Phase 7 — Trust assets
- **What:** static `/compliance` one-pager (7 gates + Rule 5.4 pricing); SOL multi-state
  groundwork (California verified, TX/FL/GA/NY placeholders that say "not yet verified").
- **Where:** `src/app/compliance/page.tsx`, `analysis/sol-rules.mjs`.
- **Go-live (remaining):** have counsel verify each new state's SOL rules before flipping
  `verified: true` in `sol-rules.mjs`; optional calibration trendline + ROI share card.

---

## Compliance invariants (unchanged, enforced)
Human approval before send · opt-out honored · global + per-firm kill switches · quiet
hours · TEST_MODE simulation · SMS content rules in `draft.mjs` · **only signed cases
count as recovered revenue, and recovered fees never affect billing.** Every new outbound
path (webhooks, emails) is either signed/export-only or renders-to-file in test mode; none
bypass the send chokepoint.
