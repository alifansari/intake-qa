# Compliant copy for the Engine-V2 firm-visible flip (STAGED — apply AT flip, not before)

> **Why this exists.** The live product publishes a **v1-derived false-alarm rate** and calls the
> scorer a **"frozen, calibrated, validated PI rubric."** Those claims are TRUE for v1 and must stay
> live while v1 is the firm-visible engine (shadow mode). The moment v2 becomes firm-visible, those
> claims describe an engine that (a) is a different methodology and (b) has **no measured false-alarm
> rate yet** — which would violate compliance-invariants §IV ("publish the false-alarm rate; no
> citation, no claim") and §V (no false/misleading). This file is the exact reword to apply **in the
> same commit that flips v2 firm-visible** — never earlier.
>
> **Scope of the reword (narrow):** only the *validated / published-error-rate* language changes.
> What stays TRUE for v2 and needs NO change: five plain-English signability tiers, version-locked /
> deterministic rubric, "no citation, no claim," tiered confidence, abstains rather than guesses,
> Spanish reviewed personally. v2 actually strengthens most of these.

## The controlling rule for v2 copy
Until v2's own false-alarm rate is measured on attorney-labeled calls (the shadow corpus feeds this),
v2 copy MAY say: five signability tiers, version-locked rubric, every read cited to a transcript span,
confidence tiered, abstains rather than guesses, attorney ratifies every recommendation. v2 copy MUST
NOT say: "validated," "published false-alarm rate," a numeric precision/error rate, or "calibrated
against outcomes" — until the measured v2 rate exists and `/honesty` renders it.

## Exact edits (before → after)

### 1. `web/src/lib/site-constants.ts` — the "published false-alarm rate" block
- **Before:** renders a live false-alarm-rate number sourced from v1 calibration counts (`calibrationCounts`), labeled "Published false-alarm rate … §IV."
- **After (at flip):** gate the published number on the ENGINE. While v2 is firm-visible and unmeasured,
  render the honest placeholder instead of a v1 number:
  > "We publish our reliability as we measure it. Engine v2 (triage) is new; we are measuring its
  > false-alarm rate against attorney-reviewed outcomes and will publish it here the moment the corpus
  > supports it. Until then: every read is cited to a transcript span, confidence is tiered, and the
  > engine abstains rather than guess."
  Implementation note: do NOT delete the v1 calibration machinery — keep it; branch the rendered claim
  on which engine is firm-visible so the number returns automatically once v2's counts exist.

### 2. `web/src/lib/site-constants.ts:133`
- **Before:** `"A per-call score on our frozen, calibrated PI rubric."`
- **After:** `"A per-call triage read on our version-locked PI rubric — five plain-English signability tiers, every read cited, confidence tiered."`
  (Drops "calibrated" — an outcomes-validated claim v2 hasn't earned; keeps version-locked, which is true.)

### 3. `web/src/lib/site-constants.ts:128` (leak-audit blurb)
- **Before:** `"… scores every one against our calibrated PI rubric …"`
- **After:** `"… scores every one against our version-locked PI rubric …"`

### 4. `web/src/app/(marketing)/honesty` page :23 (the "how it works" tier line)
- **Before:** `"Each call is scored against a frozen, calibrated rubric and placed in one of five plain-English signability tiers. The rubric is version-locked, so a Tier 4 means the same thing every month."`
- **After:** `"Each call is scored against a version-locked rubric and placed in one of five plain-English signability tiers. The code that turns the read into a tier is deterministic, so a Tier 4 means the same thing every month."`
  (Removes "calibrated"; replaces the implied outcomes-calibration with the true determinism claim.)

### 5. `web/src/app/(marketing)/honesty` page :78 (Spanish validation line)
- **No change needed** — it already says the compliant thing ("we won't claim validated Spanish-language
  scoring until we can show the test corpus"). At flip, extend the SAME frame to the whole v2 engine
  (see edit #1), which is why this line is the model for the reword.

## Do NOT touch (compliance-clean already, or v1-owned)
- Any live false-alarm-rate number stays as-is WHILE v1 is firm-visible (shadow mode) — it is true for v1.
- Fee/pricing copy (§I) — untouched; unrelated to the engine swap.
- The `/honesty` epistemic posture — it is the template, not the problem.

## Apply-order checklist (at flip)
1. Confirm v2's measured false-alarm rate exists (from the shadow corpus) OR keep edit #1's placeholder.
2. Apply edits 1–4 in the SAME commit that repoints the pipeline to v2 firm-visible.
3. Re-run the compliance-invariants pre-ship checklist — items 4 and 5 must now answer "yes."
4. Build green → deploy.
