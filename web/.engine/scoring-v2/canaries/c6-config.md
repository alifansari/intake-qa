# CANARY FIRM CONFIG — c6 only (government-entity work ACCEPTED)

c6 exists to monitor the R8 unknown-driven refer path (QC blocker 3.1:
deadline pressure + unknown load-bearing reads with zero cited adverse
evidence must REFER with attorney review, never decline). Under the default
Meridian template, any clearly-government-defendant case reads
case_type_fit=fatal (government_entity is on Meridian's declined list) and
routes refer_out via R1 before R8 is ever reached — the first live run
confirmed exactly that. So this canary scores against a firm that ACCEPTS
government-entity matters: with fit non-fatal, the only path to refer_out is
the R8 branch this canary guards. PART B is identical to the template.

<!-- PART A: BEGIN — facts for the LLM (this block is sent in the prompt) -->
FIRM CONFIG — PART A (facts only)
firm_name: Sierra Valley Injury Law
state: CA
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite, government_entity
case_types_declined: med_mal, workers_comp
languages_supported: en, es (bilingual staff)
END FIRM CONFIG — PART A
<!-- PART A: END -->

<!-- PART B: BEGIN — code-side config. NEVER sent to the LLM. -->
```yaml
posture_default: selective
posture_by_case_type:
  mva_commercial: selective
  mva_standard: volume
develop_thin_threshold: 2
thin_threshold_by_case_type:
  dog_bite: 1
esign_on_call_enabled: true
trial_capital: false
capital_budget_tier: moderate
mist_handling: develop
```
<!-- PART B: END -->
