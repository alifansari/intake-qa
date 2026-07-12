# scoring-v2 — Calibration Notes (2026-07-11)

Empirical calibration record for the pinned state (schema 2.1, model
`claude-sonnet-4-6`, temp 0, six golds in ORDER.md order, canary baseline
`canaries/expected.json`). Regenerate on any calibration change.

## 1. Reliability study — does confidence stay stable across runs?

Motivation: post-QC live runs had flipped the fixture's confidence tier
medium↔high because the question-capture read (the noisiest extraction) landed
on the old raw-count downgrade cliff. Schema 2.1 replaced the raw count with an
N/A-aware asked-ratio plus hysteresis. This study re-scores the same transcripts
multiple times to check the fix held.

Design: each transcript scored independently N times, live API, temp 0.
c4 (borderline develop/sign) ×4, c7 (capture boundary) ×3, fixture ×3 — 10 calls.

| transcript | n | disposition | value_tier | **confidence** | questions_asked | capture_ratio | 7 dimension reads |
|---|---|---|---|---|---|---|---|
| c4      | 4 | sign_now ×4 | standard ×4 | **high ×4** | 6,6,6,6 | 0.667 ×4 | all 7 stable |
| c7      | 3 | sign_now ×3 | standard ×3 | **high ×3** | 5,5,4 | 0.556,0.556,0.444 | all 7 stable |
| fixture | 3 | sign_now ×3 | standard ×3 | **medium ×3** | 1,2,2 | 0.111,0.222,0.222 | 2 of 7 wobbled* |

\* fixture dimension wobble: `liability_comparative_fault` strong→adequate→adequate;
`coverage_path` adequate→adequate→thin. Single-step read wobble that the code-layer
aggregation absorbed — disposition, value tier, and confidence all held stable anyway.

### Verdict: the confidence flip is ELIMINATED.

Confidence tier was **100% stable per transcript across all 10 runs** (0/10 flips).
The mechanism is doing exactly its job on the fixture: the underlying question-capture
still wobbles (asked 1 vs 2; ratio 0.111 vs 0.222) — but both values sit far below the
40% stepdown threshold with ≥3 applicable questions unasked, so both step down to
`medium`. The ±1 extraction noise no longer reaches the tier. On c7 the ratio moved
across the old cliff (0.556 → 0.444) yet confidence stayed `high`, because 0.444 is
still above 0.40 — the hysteresis boundary is placed where the observed noise cannot
cross it.

Secondary finding (architecture validation): on the fixture, two of seven dimension
reads flipped one level between runs, yet every code-layer output (disposition, value
tier, confidence, gates) was identical across all three runs. This is direct evidence
for the central design bet — the deterministic aggregation layer is robust to the
LLM's read-level noise.

## 2. Gold regeneration check — does the live model still reproduce the authored golds?

Each of the 6 gold transcripts scored live once; live output diffed against the
authored LLM-output section on (a) the 7 dimension levels, (b) gate-trigger fact
values + observability, (c) question-capture states.

| gold | dimension-level divergences | gate-decision-field divergences | verdict |
|---|---|---|---|
| gold-1 | 0 | 0 | reproduces (2 cosmetic description rewordings) |
| gold-2 | 0 | 0 | exact reproduce |
| gold-3 | 0 | 0 | exact reproduce |
| gold-4 | 0 | 0 | exact reproduce |
| gold-5 | 0 | 0 | reproduces (4 cosmetic description rewordings) |
| gold-6 | 0 | 0 | reproduces (3 cosmetic description rewordings) |

**Zero dimension-level divergences and zero divergences in any field the code acts on**
(`dui_indicator`, `minimal_impact_signal`, the `present` booleans, observability tags,
question-capture states) across all six golds. Every flagged item is a reworded free-text
`description` string inside a gate fact — e.g. gold-5 authored *"birth-injury claim, child
now four"* vs live *"birth-injury claim with the child now four"* — which the strict JSON
diff trips on but which changes no decision. The diff tool compares the whole value object
including prose; the structured fields match.

### Gold divergences needing attorney adjudication: NONE.

No authored dimension level was contradicted by the live model, so there is nothing to
adjudicate from this pass. (The attorney-adjudication channel remains open for phase-2
validation against real dual-labeled transcripts; it simply produced no items here.) No
authored gold levels were rewritten.

## 3. Spend

This pass: ~10 reliability calls + 6 gold calls = 16 live calls, prompt-cached stable
prefix. Estimated well under the $4 top-up budget (the reliability partials were reused
from the pre-interruption run, not re-billed). Cumulative calibration-pass spend across
both attempts remains within the ~$8 envelope.

## 4. What this does and does not establish

Establishes: run-to-run **stability** of the pinned configuration (a scorer that returns
different answers on the same call is unusable), and faithful reproduction of the authored
calibration targets. This is necessary, not sufficient.

Does NOT establish **accuracy** — whether the dispositions are *correct* is the phase-2
question and requires 100–150 dual-attorney-labeled transcripts, human–human QWK ceiling
first, then disposition QWK ≥ 0.70 / catastrophic-recall ≥ 0.95 / wrongful-declines
10×-weighted (see README activation gate). Stability is the floor that makes accuracy
measurement meaningful.
