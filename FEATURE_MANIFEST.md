# FEATURE_MANIFEST — Intake QA Beta Program + Product Modules

Every feature maps to (a) a top willingness-to-pay driver or (b) a specific
attorney objection neutralized at the product level — and every module emits
beta learning signals (UX friction / utility / trust / WTP). Nothing else ships.

Phases: **P1** = beta-testable MVP (built/scaffolded now, on `beta/program-layer`) ·
**P2** = post-first-testers · **P3** = scale/proof analytics.

| # | Module | Maps to (objection ⊘ / WTP driver $) | Phase | Beta learning it emits | Where |
|---|---|---|---|---|---|
| 0a | Beta applicant intake + ICP qualification | ⊘ "is this for firms like mine?" — CA PI only, everyone else tagged-waitlisted | P1 ✅ | funnel conversion, ICP fit of demand, waitlist demand by practice area | `web/beta/applicants.mjs`, `/api/beta/apply`, `beta_applicants`, `waitlist_entries` |
| 0b | NDA gate (Dropbox Sign, hard) | ⊘ "my call data is confidential / privileged" | P1 ✅ | NDA-step drop-off = trust friction measurement | `web/beta/nda.mjs`, `nda_records`, shared Dropbox Sign webhook |
| 0c | Structured per-artifact feedback + founder view | the beta's purpose — turns testers into a learning instrument | P1 ✅ | UX / utility / trust / WTP, per audit and per packet | `web/beta/feedback.mjs`, `/api/beta/feedback`, `/api/admin/beta`, `beta_feedback` |
| 1 | Free Intake Audit → Lost Case Report | $ "show me the money I'm losing" (the wedge, the aha artifact) | P1 ✅ (pre-existing pipeline, beta-routed) | report clarity + "is the dollar figure credible" feedback | audit sessions + `lib/leak-report/` + citation guard + confidence tiers |
| 2 | PI case-quality scoring engine, pluggable ruleset | $ core value; ⊘ "generic AI doesn't know PI" — CA-PI ruleset ships, nothing hardcodes PI | P1 ✅ (ruleset + tunables; handling persistence P2-wired) | flag accuracy vs tester judgment; per-firm criteria drift | `web/rulesets/{index,california-pi}.mjs`, frozen `scoring/` engine, `practice_area_rulesets`, `firm_ruleset_overrides`, `handling_scores` |
| 3 | Human-in-the-loop review + reject-retunes-criteria | ⊘ "AI false positives will waste my staff's time" | P1 ✅ | false-positive rate, confidence calibration, criteria feedback volume | `web/rescue/review.mjs`, `review_queue_items` (RLS: invisible to firm until confirmed) |
| 4 | Done-for-you daily rescue packet (top 3, zero-login push) | $ "recovered cases delivered to my phone"; ⊘ "not another dashboard/login" | P1 ✅ (delivery TEST_MODE-simulated) | script usability, delivery-channel preference, packet-size fit | `web/rescue/{packet,delivery}.mjs`, `rescue_packets`, `rescue_packet_items`, Clio task push |
| 5 | Recovered-revenue ledger + would-have-lost proof | $ retention core; ⊘ "prove it wasn't a case we'd have gotten anyway" | P1 ✅ (CSV; ROI PDF = TODO) | recovered-count credibility, stage-sync friction with CRM | `web/rescue/ledger.mjs`, `rescue_ledger_entries` (holdout supported) |
| 6 | Spanish English-window module | $ CA differentiator: monolingual owner sees English outputs from Spanish calls; ⊘ accuracy on Spanglish → mandatory human review | P2 (routing rule + interface ship now) | Spanish call share, review-queue load, accuracy on ES calls | `web/rescue/spanish-routing.mjs`, `firm_features['spanish_module']` |
| 7 | Staff coaching (private, wins-first) | ⊘ "my staff will revolt / this is surveillance" | P2 (visibility rules + note composer ship now) | staff acceptance, note usefulness | `web/rescue/coaching.mjs`, `handling_scores` |
| 8 | Compliance guardrails: flat-fee-only enforcement, callback-actor audit, consent gate + bilingual greetings, BAA/memo | ⊘ B&P §6151–52 runner/capper, CRPC 5.4, AB 931, CIPA §632/632.7 — objections killed structurally, not by promises | P1 ✅ (BAA/memo text = human gate) | consent-setup friction (the biggest predicted onboarding blocker) | `billing/packaging.mjs` + `billing/invoice.mjs`, `callback_audit_entries`, `web/beta/consent-gate.mjs`, `compliance_config` |
| 9 | Security & trust layer (posture as config) | ⊘ "where does my data live, who sees it, do you train on it" | P1 ✅ (SOC 2 labeled roadmap-only; escrow TODO) | which trust items testers actually probe | `web/beta/security-posture.mjs` (+ existing RLS/retention/access logs) |
| 10 | Low-friction ingest + CRM write-back (one CRM in P1) | ⊘ "my staff won't adopt new software" — hours not weeks | P1 ✅ CallRail/manual + Clio; P2 RingCentral, CasePeer, Filevine, Litify, Law Ruler, Lead Docket | setup time-to-first-report (the headline UX metric) | `ingest/`, `integrations/connector.mjs` + `clio.mjs` (`rescue_packet.created`) |
| 11 | Guarantee + packaging as config (beta → audit → pilot → flat monthly) | $ risk reversal "find-cases-or-free"; ⊘ "another SaaS subscription" — flat, month-to-month, no overages | P1 ✅ (dollar amounts = founder decision, conflict flagged) | WTP data validates/invalidates tiering | `billing/packaging.mjs` (`assertFlatFeeConfig`, `guaranteeVerdict`), `billing/guarantee.mjs` |
| 12 | Speed-to-lead & SOL alerts | $ urgency that makes packets get actioned today, not someday | P1 ✅ (SOL deadline wiring to `analysis/sol.mjs` = marked TODO) | whether urgency flags change callback behavior | `web/rescue/sol-alerts.mjs` (deterministic SOL math stays in `analysis/sol.mjs`) |

## Explicitly not built (by design)
Standalone empathy/sentiment scores · vanity call-volume analytics as a primary
deliverable · generic coaching libraries · login-first dashboard · any real-time /
in-call guidance (post-call only: ASR fragility + CIPA exposure) · any AI that
contacts prospects, gives legal advice, or signs cases · any non-PI ruleset
(interface only, non-PI firms waitlisted).

## Test coverage of the invariants
`web/tests/beta-program.test.mjs` (ICP gate, NDA hard gate, state machine,
feedback, consent gate) · `web/tests/rescue-desk.test.mjs` (human sign-off,
top-3 cap, ranking, ledger gating, callback actor, SOL/speed-to-lead, Spanish
routing, ruleset merge) · `web/tests/packaging.test.mjs` (flat-fee hard-fail,
beta NDA-gating, guarantee verdict). Full suite: 301/301 passing.
