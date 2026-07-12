# Live dev-server drive — orchestrator findings (2026-07-11 night)

Ran the actual `beta/integration` dev server (Next 16, safe env locks:
TEST_MODE=true KILL_SWITCH=true EMAIL_ENABLED=false, CRON_SECRET deliberately unset).

## PASS
- Independent code layer: 516/516 tests, e2e-synthetic all-green, build clean (80 routes).
- Route health: /, /pricing, /security, /compliance, /honesty, /letter, /audit, /apply,
  /dpa, /msa, /terms, /login all HTTP 200. /desk*, /studio*, /admin/status all 307
  (auth-gated, correct). ZERO 5xx on any page.
- CRON fail-loud (digest): GET /api/digest/run with CRON_SECRET unset -> HTTP 500 (loud). Correct.
- Compliance copy: every "per case / per signed / contingen" hit on rendered public HTML is a
  COMPLIANT NEGATION ("a flat fee ... never a share of a fee, never per case"; "we deliberately
  do not charge per case, per signed client, or per recovered dollar"; /compliance statutory
  analysis). The "avg fee per signed case" on / and /honesty is the ROI-calculator input using
  the FIRM's own fee, not IntakeQA pricing. NO §I/§V violation found on rendered pages.
- Truthfulness anchors present: "your staff make every callback", "we never contact", retention/deletion.

## FINDING (fold into verdict) — LOW/MEDIUM
- **alerts/sweep lacks the digest route's fail-loud CRON_SECRET guard.**
  GET /api/alerts/sweep with CRON_SECRET unset -> HTTP 401 (silent), whereas /api/digest/run
  returns 500 + logs the missing var. Same class of silent-death the Session 0 fail-loud rule
  fixed for digests, not applied to the founder-alert sweep.
  File: web/src/app/api/alerts/sweep/route.ts (authorized() has no unset-secret fail-loud branch).
  Impact: if CRON_SECRET is missing in prod, founder alerts never run and nothing surfaces it
  *from this route* (digest failing loud would still surface the missing var globally, so bounded).
  Fix: mirror digest/run's fail-loud check — if !process.env.CRON_SECRET on a hosted deploy,
  return 500 + logError(source "alerts.sweep", "CRON_SECRET unset"). ~5 lines.
