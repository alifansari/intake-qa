# SESSION INDEX — 2026-07-12 (beta gate + growth) · the navigable map

One-screen index of everything produced this session, by OWNER. Nothing here was sent,
posted, priced live, pushed, or deployed (§VII). Two branches:
- **`beta/integration`** — the certified-green Monday launch artifact. FROZEN except Ali items.
- **`growth/wave-1`** (off beta/integration) — verified growth builds, staged for POST-launch merge.

---

## A. DONE + VERIFIED BY CLAUDE (no action needed except review)

### Beta hardening (on `beta/integration`, in the Monday launch)
- Independent verification: **519/519 tests (confirmed 3×), e2e all-PASS, build clean, live dev-drive clean.**
- `ef61cd6` — fail-loud reliability: CallRail no-secret now logs (was silent 500); founder "stuck-unscored" alert (scoring was 100% Inngest with no real fallback); alerts/sweep CRON_SECRET fail-loud; migration-floor doc 0037→**0038**.
- `55b4d04`+`660365a` — **letter v1.4**: corrected the false "I publish my error rate" claim (6 instances) to the truthful commitment posture. **← needs your re-sign before deploy (§VII).**
- Docs: `beta-gate-CLEARED.md`, `beta-gate-verdict.md`, `ali-monday-packet.md`, `live-drive-findings.md`.

### Growth builds (on `growth/wave-1`, MERGE AFTER launch)
- `60ec2fc` — **CR-A/CR-B funnel instrumentation** on /studio/beta (the two numbers the $1M model turns on). No schema change. 525/525.
- `213e375` — **outcome-corpus spine** (B-016), DARK + sibling-only: migration **0039 (PG) / 0031 (SQLite)** STAGED, capture wired best-effort AFTER the result commits, ScoredCall untouched, inert until you apply the migration. 536/536.
- `d1e43de` — **clio.mjs silent-401 fix** (same class as the CallRail bug).

## B. NEEDS ALI (the Monday critical path — full detail in `ali-monday-packet.md`)
1. Re-read + re-sign the v1.4 letter. 2. Vercel env (CRON_SECRET, DIGEST_LINK_SECRET, INTEGRATIONS_ENC_KEY, rotate INNGEST_*, KILL_SWITCH=false, DATA_RETENTION_DAYS=90, FOUNDER_PHONE, + provider keys). 3. Migrate hosted Supabase → **0038** (NOT 0039 — that's the post-launch corpus spine). 4. Decisions: **lock Table C pricing into §I** (the master unblock), kill per-signed-case mode, English-only Spanish framing. 5. Monday merge (one trivial `ops/decisions.md` union conflict) → deploy. 6. Post-launch: merge `growth/wave-1`, then apply migration 0039 to start the corpus clock.
- Flaky-test note: if `npm test` ever shows 1 failure, re-run once (rare heisenbug; a failure surviving 2 runs is real).

## C. NEEDS YANG (13-item list in `MASTER-GROWTH-PLAN.md` §4)
Top: §I pricing-edit text; the B-005 regulatory-clearance memo (drafted, `regulatory-clearance-memo.md`); guarantee construction menu; NDA/DPA/BAA/MOU packet; the CIPA-safe benchmark protocol (before any dialing). ‡ retained (not warm): SMS re-engagement gate, any outcome-tied pricing, Lead Docket direct.

## D. STRATEGY (staged, `MASTER-GROWTH-PLAN.md` + 4 objective plans + 16 sub-drafts)
Through-line: North Star pilots→paid; binding constraint founder-hours→attestation ceiling (~13-20 solo firms < 28 for $1M); moat = independence ⊕ outcome-corpus; two clocks (independence salience ~6-12mo vs the ceiling) collide invisibly → risk of "structurally unique but commercially worthless." Plan = unblock → measure → retain+corpus → acquire → defend. Bootstrap; any raise covenant-bound for authority, never pricing.

## E. READY NEXT CLAUDE-SAFE BUILDS (not yet done — pick or I proceed by ICE)
- Mirror the clio silent-401 fix into `leaddocket.mjs` + `filevine.mjs` (same real bug, connector plumbing already added; low urgency — post-beta integrations).
- The phone-free benchmark instrument (sampling frame + 4-min rubric + tiers + false-alarm methodology) — starts the authority moat; design mostly in `authority-engine-plan.md`.
- D-021 next-due queue sort (week-3 enhancement, not urgent).
- B-018 language-tag telemetry; B-019 tripwire monitor (+ tripwire #8).
