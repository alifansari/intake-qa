# Engine v2 — Activation Decision Memo for Ali (2026-07-11)

> One page. What exists, what's proven, what you're deciding, and the recommendation.

## What exists

`feature/scoring-v2` (pushed) carries the complete v2 triage engine, built to the Wave-12
research: **the LLM extracts ~30 cited facts + grades 7 anchored dimensions; deterministic
code does everything else** — the four catastrophe gates, the sign-now/develop/refer/decline
decision table, value/effort/carry/capital tiers (fee-per-attorney-hour framing, no dollars),
volume-vs-selective posture thresholds, confidence + abstention. Every disposition is a
recommendation for lawyer ratification. v1 `scoring/` is byte-identical and still serves the
beta; merging the branch activates nothing.

## What's proven (as of 2026-07-11)

- **57/57 unit tests** (gates, every decision-table row incl. posture divergence, abstention,
  compliance scans: no dollars / no computed dates / no terminal outputs reachable).
- **Adversarial QC pass run and closed:** 3 blockers found and fixed same day (Prop-213 gate
  now routes possible §3333.4(c) DUI-exception cases to attorney review instead of declining;
  unknown-driven marginality under a deadline refers/escalates, never declines; MIST overlay
  acts only on observed triggers). The walls held under attack: no path penalizes language,
  distress, or apology speech; G3 structurally cannot auto-decline.
- **Two live smokes + the v1-vs-v2 comparison** on the same fixture call: v1 says "overall 42,
  needs_coaching, revenue_at_risk $12,000"; v2 says "sign_now, value tier standard, 7 cited
  reads, no gates." Same call — conversion-grading vs case-underwriting, on screen.
- **Known calibration item (honest):** v2 confidence flipped medium↔high across two runs of
  the same fixture — the question-capture read sits exactly at the 4-of-10 downgrade
  threshold and is the noisiest extraction. This is the documented temp-0-variance point;
  the gold-regeneration + canary protocol is the designed fix and is REQUIRED anyway because
  the QC fix pass touched the prompt and golds (calibration state changed).

## What you are deciding (and NOT deciding)

You are NOT yet deciding to replace v1 or show v2 output to firms. The realistic options:

1. **Merge inactive** (recommended floor): merge the branch so the package stops drifting
   from main; the product pipeline still runs v1; nothing user-visible changes.
2. **Shadow mode** (recommended): after merging, run v2 DARK on beta calls alongside v1 —
   verdicts written to internal storage only (pairs with conveyor Increment 0's
   `intake_feature_snapshot`; the shadow verdicts become the validation corpus and the
   flywheel's feature vector). Cost ≈ one extra Claude call per scored call (~$0.10–0.40,
   cached). No UI, no firm-visible output, no freeze lift — v1 remains the product.
3. **Full activation** (not now): replace v1 in the pipeline. Gated on the §5 validation
   protocol — regenerated golds, then 100–150 dual-attorney-labeled transcripts, disposition
   QWK ≥ 0.70, catastrophic-indicator recall ≥ 0.95, wrongful-declines 10x-weighted — plus
   PI-attorney + Yang review (standing §VII STOPs: this is the freeze-lift).

**Recommendation: 1 + 2.** Shadow mode is how the validation corpus accrues with calendar
time (same logic as the flywheel: the model can wait, the data cannot). Every week of beta
calls scored dark by v2 is a week of v1-vs-v2 disagreement data you can put in front of the
reviewing attorney — turning the eventual freeze-lift from an opinion into a measurement.

## Your review path (10 minutes)

```
git checkout feature/scoring-v2
npm run test:v2                              # free, 57 tests
node scoring-v2/compare-v1-v2.js --fixture   # the side-by-side above (~$0.50)
```
Then `scoring-v2/README.md` (architecture + activation-gate section).

## Bookkeeping

Decisions-ledger entries for the v2 build, QC descope note, and this memo's options live on
the branch (they merge with it). Shadow mode, if chosen, is a small build item: one parallel
Inngest/pipeline step calling `score-v2.js`'s pipeline on the existing transcript + writing
to an internal table — natural companion to conveyor Increment 0 (`feature/increment-0-flywheel`,
also awaiting your review/merge).
