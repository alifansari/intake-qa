# scoring-v2 — Engine v2 triage package (STAGED — not activated)

Parallel to the frozen v1 engine (`scoring/`, untouched, still serving the
beta). Built against `ops/drafts/engine-v2-objective-spec.md` (the build
contract). **Status: staged on branch `feature/scoring-v2`. Not wired into
any product surface. Activation is gated — see below.**

## What it is

A triage decision-SUPPORT pipeline aligned to the attorney's real objective —
risk-adjusted net fee per attorney-HOUR under capital/capacity/cash-flow
constraints — expressed entirely in TIERS. It recommends one of four option
exercises (`sign_now | develop | refer_out | decline_with_grace`), every one
of which a licensed attorney must ratify or override. It is a pipeline, not
an oracle: the LLM is trusted with exactly two narrow jobs and everything
downstream is deterministic, versioned, unit-tested code.

## Architecture (text diagram)

```
                 transcript (diarized, timestamped)
                              │
        ┌─────────────────────▼──────────────────────┐
        │  STAGE 1+3 · ONE LLM CALL                  │   LLM does ONLY this:
        │  model claude-sonnet-4-6 (pinned) · temp 0 │   · <analysis> free text FIRST,
        │  prompt caching on stable prefix:          │     JSON last (no premature
        │    system-prompt.md + PART A + 6 golds     │     serialization)
        │    in PINNED order (golds/ORDER.md)        │   · 30 cited facts (verbatim span,
        │  ── the LLM NEVER sees posture (PART B) ── │     speaker, observed/inferred,
        └─────────────────────┬──────────────────────┘     per-fact confidence)
                              │                            · 10-question capture checklist
                              │  JSON                      · 7 anchored dimension reads,
                              ▼                              EVIDENCE FIELD BEFORE LEVEL
        ┌────────────────────────────────────────────┐     · effort/carry/capital tier reads
        │  validate.mjs — structural validation       │    NO disposition · NO value tier
        │  (schema, enums, no-citation-no-claim,      │    NO aggregation · NO dollars
        │   forbidden-field scan)                     │    NO computed dates
        └─────────────────────┬──────────────────────┘
                              ▼
        ┌────────────────────────────────────────────┐
        │  STAGE 2 · gates.mjs (CODE)                 │  fire on observed_on_call only:
        │  G1 underwater (Prop-213 / lien≈limits)     │  → caps {refer, decline}
        │  G2 deadline-adjacent / perishable evidence │  → caps out develop + urgency flags
        │  G3 client-risk markers                     │  → attorney-review flag, NEVER
        │  G4 trial-capital vs firm config            │    auto-decline (uncapped)
        └─────────────────────┬──────────────────────┘  → caps {refer, decline}
                              ▼
        ┌────────────────────────────────────────────┐
        │  STAGE 4 · decision-table.mjs (CODE)        │  R1–R9 + MIST/capital/urgency
        │  reads + gates + PART B posture →           │  overlays; posture ONLY here
        │  recommendation + value tier + develop      │  (volume vs selective divergence
        │  payload (resolving facts, info-cost class, │  on borderline profiles is an
        │  pre-registered exit condition) + refer-out │  auditable code diff, zero LLM
        │  tier comparison                            │  re-validation)
        └─────────────────────┬──────────────────────┘
                              ▼
        ┌────────────────────────────────────────────┐
        │  STAGE 5 · confidence.mjs (CODE)            │  from observability metadata,
        │  tier + ABSTENTION:                         │  never LLM self-report. Abstained
        │  unscoreable / >2 dims unknown / inferred-  │  calls WITHHOLD the disposition →
        │  only gate trigger                          │  route to attorney review
        └─────────────────────┬──────────────────────┘
                              ▼
              v2 verdict JSON (output/<id>.v2-verdict.json)
   { facts, dimension_reads, gates, recommendation, tiers, confidence,
     abstained, citations } — every read cited, every output a recommendation
```

## What is LLM vs what is code

| Concern | Where | Why |
|---|---|---|
| Fact extraction w/ verbatim citations | LLM | only thing a language model is trusted with |
| 7 anchored dimension reads (cite-then-claim) | LLM | behavioral anchors + evidence-before-level |
| Catastrophe gates G1–G4 | code | a gate must fire identically on call 1 and 10,000 |
| Disposition + posture + thresholds | code | auditable, diffable, per-firm without prompt change |
| Value/effort/carry/capital tiers | code lookup / LLM anchored reads | tiers only, never dollars |
| Confidence + abstention | code | LLM self-reported confidence is not a signal |
| Urgency flags | code, from extracted facts | flags only, never computed dates |

## Compliance rails (structural, not configurable)

No dollar figures anywhere at intake (tiers only) · no computed deadline
dates (flags only) · no terminal dispositions (every output is a
recommendation a licensed attorney ratifies; abstained calls withhold even
the recommendation) · citations on every read ("no citation, no claim" is
enforced by the validator) · fairness rules in the prompt are load-bearing
(unobserved ≠ negative; lay-vocab parity; deferential speech ≠ fault
admission; language/demographics never facts) · the per-call over-conversion
alert of v1 has NO v2 equivalent by design — rep-action divergence is
aggregate/privileged analytics, deferred.

## How to run

```
npm run test:v2          # 46 unit + gold-integration tests, zero network
npm run smoke:v2         # fixture transcript → live API → verdict JSON
node scoring-v2/score-v2.js <transcript.txt | x.transcript.json | audio | --fixture> [--config <firm-v2.md>]
node scoring-v2/compare-v1-v2.js <transcript | --fixture>   # v1 vs v2 side-by-side
```

- Needs `ANTHROPIC_API_KEY` in root `.env` (harness/compare only; tests don't).
- Verdicts land in `output/<call_id>.v2-verdict.json` (git-ignored).
- Firm onboarding: copy `firm-config-template.md` to `config/<firm>-v2.md`,
  edit PART A (facts, prompt-visible) and PART B (posture YAML, code-side).
  PART B never enters the prompt; the tests assert the wall.

## Calibration state (pinned — changing any of these = full revalidation)

1. `system-prompt.md` (verbatim), 2. the six golds **in ORDER.md order**
(contrastive pair adjacent, never ends on a decline), 3. model id
`claude-sonnet-4-6`, 4. temperature 0. Any change → rerun the gold set +
v1-vs-v2 comparisons + canaries; block on QWK regression > 0.05.

## Activation gate (this package does NOT go live by merge)

Per the standing STOPs and objective-spec §5, activation into any product
surface requires ALL of:

1. **Ali's deliberate decision** to lift the v1 freeze for triage (a
   decisions-log entry, not a silent wiring change).
2. **PI-attorney review + Yang §VII compliance review** of the prompt, the
   gates, the decline/refer language, and the fairness rails.
3. **Validation protocol, phase 1 (buildable now):** regenerated gold set
   scored by this harness; v1-vs-v2 on the same transcripts
   (`compare-v1-v2.js`); canary transcripts for the named failure modes
   (over-conversion, Prop-213, Spanish-language, borderline develop/sign).
4. **Validation protocol, phase 2 (needs attorneys):** 100–150 dual-labeled
   transcripts, human–human QWK ceiling measured FIRST; targets: disposition
   QWK ≥ 0.70, tier QWK ≥ 0.65, catastrophic-indicator recall ≥ 0.95,
   direction-weighted confusion matrix with wrongful-decline errors
   10x-weighted; abstention coverage ≥ 85% with abstained calls routed to
   human review.
5. **Spanish gate:** v2 does not score Spanish calls in production until
   per-language reliability is audited equal (four-fifths tripwire wired in).

Drift discipline once live: pinned model; full gold rerun on ANY change;
5–10 canaries scored weekly even with no changes; every production failure
becomes a regression gold.

## Files

```
scoring-v2/
├── system-prompt.md          # LLM contract: extraction + anchored reads ONLY
├── firm-config-template.md   # PART A (prompt facts) / PART B (code YAML)
├── golds/                    # 6 golds + ORDER.md (pinned calibration state)
├── lib/
│   ├── gates.mjs             # G1–G4, pure, observed-only triggers
│   ├── decision-table.mjs    # R1–R9 + overlays, posture lives HERE
│   ├── confidence.mjs        # tier + abstention from observability metadata
│   ├── config.mjs            # PART A/B split + mini-YAML + posture lookup
│   ├── golds.mjs             # pinned-order loader, strips harness-only blocks
│   ├── validate.mjs          # structural validation of LLM JSON
│   └── parse.mjs             # <analysis>/JSON splitting, balanced-brace parse
├── score-v2.js               # harness (LLM call + code pipeline → verdict)
├── compare-v1-v2.js          # A/B against frozen v1 (reused by import)
└── test/                     # 46 tests: gates, every table row, confidence,
                              #   six-gold end-to-end reproduction
```

v1 (`scoring/`, `lib/score-call.js`) is read and imported, never modified.
