# scoring-v2.2 additive build spec (2026-07-12)

Implements the R1/R2 research deltas into the v2 code layer. **Additive + backward-compatible +
dark-by-default.** Non-negotiables:

- **v1 `scoring/` untouched.** Only `scoring-v2/`.
- **New extraction facts are OPTIONAL.** Absent → treated as `unknown` → abstain/develop. Existing
  golds must still validate and produce sane verdicts with zero new facts present.
- **Compliance rails unchanged:** tiers not dollars; urgency FLAGS not computed dates; no terminal
  auto-decisions; fairness (unobserved != negative; lay-vocab parity; deferential speech != fault
  admission); "no citation, no claim"; abstain rather than guess. No new statutory dollar/date is
  ever emitted at intake — constants drive TIER reasoning only.
- **Pure modules, `node:test`, zero network.** Every new module ships its own `test/<x>.test.mjs`.
- **Prompt/gold changes = calibration state.** Extending `system-prompt.md` requires gold
  regeneration + revalidation before ACTIVATION (already gated on Ali's freeze-lift). Building is fine.

## New OPTIONAL extraction facts (v2.2) — emit when present; absence → unknown

Each fact keeps the standard envelope `{ value, evidence, observability, confidence }`. `value`
shapes (downstream code keys off these exact keys):

- `defendant_type.value`: `"individual" | "commercial" | "rideshare" | "trucking" | "government" | "uninsured" | "unknown"`
- `coverage_stack.value`: `{ def_bi_limits_stated: string|null, client_um_uim: "present"|"absent"|"unknown", medpay_pip: bool, umbrella: bool, multi_policy: bool }`
- `objective_findings.value`: `{ present: bool, kind: "none_subjective"|"imaging"|"fracture"|"surgical"|"neuro_deficit"|"unknown", permanency_indicator: bool, surgery_recommended: bool }`
- `treatment_latency.value`: `{ days_to_first_treatment_stated: number|null, gap_over_30d: bool, gap_explained: bool }`
- `lien_sources.value`: `{ sources: string[] (any of "medi_cal","medicare","erisa_selffunded","erisa_insured","private_health","hospital_lien","medpay","lop","unknown"), erisa_funding_status: "self_funded"|"insured"|"unknown" }`
- `rideshare_period.value`: `{ period: "off"|"on_waiting"|"enroute_or_passenger"|"unknown", at_fault_party: "rideshare_driver"|"third_party"|"disputed"|"unknown", crash_date_stated: string|null }`
- `public_entity_defendant.value`: `{ present: bool, kind: string|null, claim_already_filed: bool, rejection_letter: bool, claimant_is_minor: bool }`
- `commercial_truck.value`: `{ present: bool, cargo_type: "general"|"hazmat"|"passenger"|"unknown", employer_carrier_identified: bool, broker_or_shipper_mentioned: bool, evidence_present: bool }`
- `defendant_dui.value`: `{ status: "convicted"|"charged"|"alleged"|"unknown", aggravating_conduct: bool }`
- `prior_claims_same_region.value`: `{ present: bool }`  (routes to damages-credibility, NEVER G3)
- `wrongful_death_survival.value`: `{ victim_died: bool, posture: "wd_only"|"survival_only"|"both"|"unknown", elder_or_dependent_adult: bool, recklessness_indicators: bool, known_additional_heirs: bool }`
- `medicare_status.value`: `{ eligible_now_or_near_65: bool }`  (Audish future-medical discount)

`observability` semantics identical to v2: code ACTS on a value only when `observed_on_call`
(else confidence.mjs abstains). All new facts are optional in `validate.mjs` (shape-checked IF
present, never required).

## New TIER vocab

- `lien_load_tier`: `"none" | "light" | "moderate" | "heavy" | "unknown"` (projected NET after
  statutory reduction; NOT gross).

## Module interfaces (pure, no I/O)

### lib/statutes.mjs  (Ali-owned)
- `STATUTES` — frozen dated constants (all verified R2).
- `autoMinLimits({ policyOrLossDateISO })` → `{ per_person, per_accident, pd, basis }`
- `micraNoneconomicCap({ resolutionYear, kind: "injury"|"death" })` → `{ amount, basis }`
- `rideshareCoverage({ period, atFaultParty, crashDateISO })` → `{ layer, per_person, per_accident, basis }`
- `survivalNoneconomicAllowed({ filingDateISO, elderAbuse })` → `{ allowed: bool, basis }`
- `limitedCivilCeiling()` → `{ amount: 35000, bill: "SB 71 (Stats. 2023 ch. 861)" }`
- `solTable` — case_type → SOL descriptor (flags only, never computes a date).
- `PRACTITIONER_SEEDS` — labeled published-heuristic thresholds (MIST PD, specials floor, prior-atty walk, sign-rate band, cost-to-value).

### lib/liens.mjs  (Ali-owned)
- `LIEN_REDUCIBILITY` — source → rank 1..5 (1 most reducible … 5 ERISA self-funded).
- `projectedNetLienTier({ lien_sources, grossLoadHint })` → `lien_load_tier` (+ `reducibility_unknown` bool → routes DEVELOP)

### lib/casetypes.mjs  (delegated)
- `CASE_TYPE_ROUTING` — caseType → `{ refer_default: bool, urgency: bool, coverage_floor_source: string, notes }`
- `caseTypeRouting(caseType)` → row (safe default for unknown types).
Covers: mva_standard, mva_commercial, motorcycle, pedestrian_bicycle, rideshare, trucking(=mva_commercial truck), premises, dog_bite, product, med_mal, wrongful_death, government_entity, workers_comp(third-party vs comp-only), elder_abuse, other_pi. med_mal/product/elder-abuse-heightened default refer_default=true.

### lib/develop-actions.mjs  (delegated)
- `DEVELOP_ACTIONS` — table rows `{ trigger, action_id, label, resolves, obtainability: "client_immediate"|"pre_suit"|"discovery_only", latency_criticality: "routine"|"time_critical"|"critical", ethics_tags: string[] }`
- `rankDevelopActions({ facts, unknownDims, gateFlags })` → ranked action list (critical latency first, then dim-lift, then effort). Ethics tags from {recorded_statement_all_party_consent, no_contact_if_represented, no_solicitation_of_prospect}.

### lib/observability.mjs  (delegated)
- `OBSERVABILITY_DEFAULTS` — factId → `"caller_stateable"|"sometimes"|"develop_only"`
- `MUST_ASK_FLOOR` — the checklist floor (ids).
- `classifyCallQuality({ facts, question_capture })` → `{ floor_missing: string[], call_quality_flag: bool }` (FLOOR unknown → call-quality; develop-only unknown → benign, never a penalty).

### lib/priors.mjs  (delegated)
- `SEED_PRIORS` — `(case_type -> { value_tier_seed, dog_rate, settle_prob, source, confidence, is_firm_data:false })`
- `boringPrior({ caseType, valueTier })` → tier-only labeled sentence string ("Cases like this here typically ...; published prior, not this firm's data."). NEVER a dollar.

## Integration edits (Ali-owned)
- `gates.mjs` G1: augment with lien projected-net (liens.mjs) + rideshare-compression underwater; keep existing gross/Prop-213 behavior as fallback. All new triggers observed-only.
- `decision-table.mjs`: case-type routing overlay (casetypes.mjs); refer-out first-class; attach `develop_actions` to develop payload; attach `prior_context`, `statutory_context`, `lien_context` (tier/flag only).
- `validate.mjs`: OPTIONAL_FACT_SHAPES validated-if-present.
- `score-v2.js`: surface new verdict fields (develop_actions, statutory_context, lien_context, prior_context, call_quality).
- `system-prompt.md`: additive v2.2 extended fact catalog + Spanish lay-term lexicon + false-friend guard + refined anchors (D2 objective/permanency; D6 behavioral exclusions). Bump schema_version note; flag gold-regen gate.
- `firm-config-template.md`: new PART B knobs (capital_ceiling_tier, referral_split_default).
- `CALIBRATION-NOTES.md` / new `CHANGELOG-v2.2.md`: what changed + the revalidation gate.
