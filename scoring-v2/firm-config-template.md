# FIRM CONFIG TEMPLATE v2.0 — Engine v2 (scoring-v2)

Two parts, one wall:

- **PART A** is plain-text FACTS the LLM needs (accepted case types, state,
  languages). It is prepended to the user message on every scoring request.
- **PART B** is CODE-SIDE configuration (posture, thresholds, capital). It is
  parsed by `scoring-v2/lib/config.mjs` and consumed by the decision table.
  **PART B NEVER ENTERS THE PROMPT.** The LLM never sees posture — its
  dimension reads are firm-independent, so the same call gets the same reads
  at every firm, and posture differences live in an auditable code diff.

To onboard a real firm: copy this file into `config/` (e.g.
`config/<firm>-v2.md`), edit the values, never edit this template. The values
below are the working example defaults (Meridian Injury Law — the same config
the six gold examples were calibrated against).

<!-- PART A: BEGIN — facts for the LLM (this block is sent in the prompt) -->
FIRM CONFIG — PART A (facts only)
firm_name: Meridian Injury Law
state: CA
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp, government_entity
languages_supported: en, es (bilingual staff)
END FIRM CONFIG — PART A
<!-- PART A: END -->

<!-- PART B: BEGIN — code-side config. NEVER sent to the LLM. -->
```yaml
# Selectivity posture: how the decision table resolves BORDERLINE profiles.
#   selective — borderline files lean decline_with_grace / refer_out
#   volume    — borderline files lean develop / sign_now
posture_default: selective

# Per-case-type posture overrides (a firm can be volume on clear-liability
# rear-enders and selective on soft-tissue premises). Keys = case_type ids.
posture_by_case_type:
  mva_commercial: selective
  mva_standard: volume

# Per-case-type disposition thresholds: how many THIN reads on load-bearing
# dimensions (liability, damages, coverage, collectability) a profile absorbs
# before it becomes "borderline" and posture decides it. Default 2.
develop_thin_threshold: 2
thin_threshold_by_case_type:
  dog_bite: 1

# Can the rep send e-sign on the call? Operational posture, not a fact the
# LLM needs — the extraction schema records what the rep DID regardless.
# Consumed by product surfaces downstream of the verdict, never the prompt.
esign_on_call_enabled: true

# Will this firm carry a case that can only resolve at trial?
# false => gate G4 caps trial-only profiles to refer_out / decline_with_grace.
trial_capital: false

# Costs-to-develop appetite. The decision table surfaces refer_out as the
# likely per-hour winner sooner when heavy capital meets a small budget.
#   minimal | moderate | deep
capital_budget_tier: moderate

# MIST handling (minor-impact soft-tissue profiles): what the decision table
# does with a MIST-flagged borderline file.
#   develop — route to the develop queue (default)
#   decline — decline_with_grace
#   sign    — map to sign_now (volume shops that sign MIST files and settle
#             them fast; the MIST flag still rides on the verdict)
mist_handling: develop
```
<!-- PART B: END -->

Notes
- Only PART A text between the `PART A: BEGIN/END` markers is prompt-visible;
  the harness strips everything else, including these notes.
- Posture changes are a PART B edit + decision-table rerun — they require
  zero re-validation of the LLM layer (same prompt, same golds, same reads).
- Compliance rails are structural and not configurable: no dollar figures at
  intake, no computed deadline dates, no terminal dispositions. No PART B key
  can switch those off.
