# Engine v2 Objective Spec — the build contract (Wave 12 synthesis, 2026-07-11)

> **Status:** the unified specification the v2 package is built against. Synthesizes
> `engine-v2-goal-model.md` (WHAT attorneys optimize) + `engine-v2-attorney-blindspots.md`
> (WHERE execution fails) + `engine-v2-scoring-architecture.md` (HOW to build it reliably),
> on top of the Wave 1–5 rubric research (`engine-v2-triage-design.md`).
> **Freeze discipline:** `scoring/` (v1) is untouched and keeps serving the beta. v2 is a
> parallel package under `scoring-v2/`, built on a feature branch, activated only by a
> deliberate Ali decision after A/B validation (+ PI-attorney/Yang review per standing STOPs).

## 1. The objective the engine serves (from the goal model)

The engine is aligned to the attorney's real maximand: **risk-adjusted net fee per
attorney-hour, subject to capital, capacity, and cash-flow constraints** — expressed
entirely in TIERS (never dollars at intake). Concretely:

- Every scored case carries: a **value tier** (net-fee band basis: Howell-adjusted, lien-aware,
  limits-capped), an **effort tier** (attorney-hours class: light pre-lit / standard / heavy
  lit), a **carry tier** (expected months to fee: fast / medium / long-tail), and a
  **capital tier** (costs-to-develop class). Fee-per-hour thinking = value tier read AGAINST
  effort tier; the engine never collapses them into one number.
- The output space is the four-way option exercise: **SIGN-NOW / DEVELOP / REFER-OUT /
  DECLINE-WITH-GRACE** — every one a recommendation for lawyer ratification, never terminal.
- DEVELOP recommendations must name: the resolving fact(s), the info-cost class, the
  pre-registered exit condition, and any urgency flag that would force early exercise.
- REFER-OUT competes honestly: where specialist value-tier is high and in-house effort tier
  is heavy, refer-out is surfaced as the likely per-hour winner (tier comparison, no dollars).
- Urgency flags (SOL-adjacent, government-entity §911.2, perishable evidence) are extracted
  FACTS that flip develop→sign-now routing. Flags only; the engine never computes dates.

## 2. The four catastrophe gates (asymmetric, from the goal model §2)

Evaluated in CODE from extracted facts — one confirmed gate can legitimately zero a file:
G1 **Underwater** (lien load ≈/> plausible limits; Prop 213 + soft tissue; min-limits +
   heavy treatment). G2 **Malpractice trap** (deadline-adjacent facts on a marginal case).
G3 **Client risk** (fee-negotiation/prior-attorney-shopping/value-obsession MARKERS —
   subject to the fairness rules: markers are behaviors on the call, never demographics,
   language, or distress; unobserved ≠ negative). G4 **Trial-capital exposure** (case can't
   resolve without trying it + firm posture says no trial capital).
Gate hits produce: the gate name, the verbatim trigger quote, and the disposition it caps
(e.g., G1 → decline/refer recommendation; G3 → attorney-review flag, NEVER auto-decline).

## 3. What the engine corrects vs. defers (from the blind-spots brief)

CORRECTS (informs toward the attorney's own goal, never decides): base-rate context lines
(firm's own priors, once flywheel N exists — until then published base rates, labeled);
recency-contrast diagnostic (signing-mix deviation vs trailing year); pre-registered
develop-exit conditions restated at review with sunk hours deliberately hidden; the
noise-free second read (same facts → same reads, 9am or 6pm); declined-case outcome loop
(via flywheel + referral partner reports); delegation drift (the extraction schema IS the
attorney's criteria, applied identically every call).
DEFERS (structurally, in the prompt and output): client presentation quality =
attorney-supplied input, never engine-generated; local venue/carrier knowledge = config
facts only; broken-leg overrides = logged with reason, graded later; client chemistry =
attorney's decline reason, never laundered into the quality score.

## 4. The architecture (from the mechanics brief — pipeline, not oracle)

- **LLM does exactly two things** (one call, temp 0, pinned model, prompt caching):
  free-text `<analysis>` first, then structured JSON: (a) extracted facts with verbatim
  citation spans, speaker, observed-vs-inferred, per-fact confidence; (b) seven anchored
  dimension reads (strong/adequate/thin/unknown/fatal), evidence field physically BEFORE
  level field (cite-then-claim).
- **Code does everything else**, versioned and unit-tested: catastrophe gates (§2),
  disposition decision table, tier lookups, posture thresholds (`selective|volume`),
  confidence + abstention (from observability metadata, never LLM self-report),
  urgency-flag routing, the two disposition-gated alerts.
- **The LLM never sees posture** — dimension reads are firm-independent (cross-firm
  comparability); posture lives in the decision table as an auditable code diff.
- Seven dimensions (per triage-design §4, as amended): liability/comparative-fault
  exposure · damages credibility (Howell-aware) · coverage-path adequacy · collectability/
  deep-pocket · procedural urgency (facts only) · client-risk markers (fairness-ruled) ·
  case-type fit. Plus effort/carry/capital tier reads with their own anchors.
- Golds: 6, contrastive pair adjacent, fixed order = pinned calibration state, don't end
  on a decline.

## 5. Validation gate (before any activation decision)

Phase 1 (buildable now): regenerated gold set scored by v2 harness; v1-vs-v2 comparison on
the same transcripts; canary transcripts for the named failure modes (over-conversion,
Prop-213, Spanish, borderline develop/sign). Phase 2 (needs attorneys): 100–150
dual-labeled transcripts, human-human QWK ceiling first; targets disposition QWK ≥ 0.70,
tier QWK ≥ 0.65, catastrophic-indicator recall ≥ 0.95, direction-weighted confusion matrix
with wrongful-decline errors 10x-weighted; abstention coverage ≥ 85%. Drift: pinned model,
full-gold rerun on any change, block on QWK regression > 0.05.

## 6. Compliance rails (unchanged, structural)

No dollars at intake (tiers only) · no computed deadlines (flags only) · no terminal
outputs (lawyer ratifies every disposition) · over-conversion signal aggregate + privileged ·
fairness rules (unobserved ≠ negative; lay-vocab parity; deferential-speech ≠ fault
admission; per-language disparate-impact audit) · citations on every read ("no citation,
no claim") · abstain rather than guess. Activation of v2 in the product pipeline = Ali
decision + PI-attorney/Yang review (standing STOPs).

## 7. The build (scoring-v2/ package, feature branch)

`scoring-v2/system-prompt.md` (extraction + dimension reads only) ·
`scoring-v2/firm-config-template.md` (facts the LLM needs + the code-side posture/threshold
config as YAML) · `scoring-v2/golds/` (6 examples, fixed order) ·
`scoring-v2/lib/decision-table.mjs` + `gates.mjs` + `confidence.mjs` (pure, unit-tested) ·
`scoring-v2/score-v2.js` (harness: transcript → LLM → code pipeline → JSON verdict) ·
`scoring-v2/compare-v1-v2.js` (A/B on the same transcripts) · `scoring-v2/README.md`
(activation gate + validation protocol). v1 files: read, never written.
