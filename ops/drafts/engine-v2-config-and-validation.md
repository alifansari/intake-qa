# Engine v2 — Outcome-Validation Loop + Firm-Config Schema (DRAFT, staged)

> **STATUS: DESIGN DRAFT.** Companion to `engine-v2-triage-design.md`. Not built.
> The validation loop is what makes the engine *actuarial* rather than an opinion
> generator; the config makes posture per-case-type and encodes the compliance
> boundaries structurally. Two dollar-worlds stay separate: Intake QA's flat fee
> (never outcome-tied, §I) vs the firm's contingency economics (internal ranking
> sort key only, NEVER surfaced as a quote).

## PART 1 — OUTCOME-VALIDATION LOOP

**Why it's the product (Meehl/Grove):** mechanical prediction beats clinical judgment
ONLY when validated against realized outcomes. **Target = realized NET FEE per case,
never sign-rate** (sign-rate is the Goodhart proxy that destroys the book).

**Two records per case (joined by firm's `case_id`):**
- **Disposition (T0, at intake):** score band, raw score, model+config version,
  disposition {sign/develop/refer/decline}, `attorney_override` + reason, and an
  **immutable feature snapshot** (validate against what the model SAW, not what was
  later learned).
- **Outcome (T1, at resolution — months/years later, the hard part):** end_state
  {settled/tried/dropped/withdrew/referred-resolved/open}, gross, costs_advanced,
  lien_load, net_to_client, **net_fee_to_firm**, referral_fee, time_to_resolution.
  Declines are **censored, not zero**.

**Data source:** the firm's CMS (Filevine/Litify/CASEpeer/Clio) is the system of
record. Three ingestion tiers: (1) **monthly 15-min manual reconciliation — MVP
default**; (2) read-only API pull (scale); (3) redacted disbursement sheets (financial
ground truth). **Intake QA keeps a thin SHADOW LEDGER keyed to the firm's case_id;
if we and the CMS disagree, the CMS wins.** Never the system of record (keeps us out
of malpractice/SOL-docketing liability).

**Target metric — Profitable-Inventory Yield (PIY):**
`net_fee_i = gross × contingency − attributable_costs`; portfolio
`PIY = Σ net_fee − Σ cost_to_develop(worked-but-unpaid)`; the real KPI is
**net fee per unit of intake+development CAPACITY consumed.** A case that signs, eats
40 paralegal hours + $6k costs, then drops for a $2k nuisance settlement is a LOSS
that counts as a "sign" — PIY makes it visible, sign-rate hides it.

**Validation mechanics:** predictions are **probabilities per band** (not labels).
**Brier score** (headline; beat the base-rate reference Brier or you're a coin);
**QWK** (model-vs-attorney agreement + temporal drift — ordinal, so one band off <
three); **calibration curves per band, refit quarterly** (isotonic/Platt on
accumulated closed cases); **temporal cross-validation** (train before date D,
validate after — never random k-fold; PI outcomes are time-ordered and the population
shifts).

**Workflow — RETRODICT FIRST:** Phase 0 (wks 1–4): score the firm's last 12–24 months
of ALREADY-CLOSED cases (immutable snapshot, no leakage) → an honest backtest +
first band→outcome map BEFORE scoring any live case (the single highest-leverage 30
minutes). Phase 1 (mo 1–3): score live, LOGGED-not-shown. Phase 2 (mo 3–9): surface
as a confidence-tiered decision aid, log overrides. Phase 3 (mo 9+): first cohort
resolves → prospective Brier/calibration; compare engine-rec vs override realized PIY;
recalibrate quarterly. Only NOW is it "actuarial" for that firm.

**Cold start (no history):** seed band→P from **published base rates** (labeled
plausible-but-unverified §VIII — ~95% civil settlement rate [BJS tort studies];
IRC auto-injury severity/limits distributions — pull current pubs + cite exactly, no
guaranteed recovery); **widen posteriors** (Beta prior, low pseudo-counts → a few real
outcomes move it); **Bayesian update** per outcome; **promote a band from
external_prior → firm_calibrated only at ≥~30 resolved cases**; optional hierarchical
partial-pooling across consenting firms (aggregated, never leaking one firm's data).

**Anti-Goodhart controls:** NO staff metric attached to engine output until ≥1 real
outcome cycle closes; optimize PIY never sign-rate (sign-rate is a diagnostic only);
log every override + realized outcome (a systematically-overruled-and-humans-right
region = mis-specified model, fix it don't suppress); **book-degradation detector**
(sign-rate flat/up while PIY-per-capacity falls, drop rate rises, or score↔net-fee
rank-correlation decays QoQ = the engine losing validity regardless of sign-rate);
decline-side censoring honesty (wrongful declines are the most expensive, most
invisible failure).

**MVP for the 5-firm beta:** one monthly 15-min reconciliation (required fields:
case_id, end_state, gross, net_fee; wanted: costs, liens, time; missing = censored
not zero) + a retrodiction bulk export at onboarding + monthly Brier/calibration/rank-
correlation + a monthly one-pager (every number confidence-tiered + cited). Buildable
as a Supabase shadow-ledger table + a reconciliation form + a stats job — NO CMS
integration required to start. **Deferred:** live APIs, per-rep scorecards, any
engine-tied incentive.

## PART 2 — FIRM-CONFIG SCHEMA v2 (key fields; full YAML in session record)

Extends v1 (state, case_types_accepted, avg fee, esign, same_call_sign_policy,
min_criteria). Safe defaults = conservative (no e-sign, selective, no auto-refer).

- **Per-case-type `posture ∈ {selective | volume | off}`** (REPLACES the global
  toggle — real firms are selective on soft-tissue auto, volume on
  dog-bite-with-homeowners, off on med-mal). `off` still routes to decline/refer,
  never a silent drop. No safe default → **required per listed type** (unconfigured =
  off, the safest state).
- Per-type `minimum_criteria`: min_policy_limits signal, injury_floor (ordinal),
  **`mist_low_pd_handling: develop_only`**, `esign_first_call_blocked`,
  `sol_min_runway_days`. `esign_on_call_enabled` / `same_call_sign_policy` default
  **false/never** (turn on only by explicit firm instruction).
- **`develop_queue`**: `owner_role` REQUIRED whenever any type uses `develop` (a
  develop queue with no named human owner is a dropped-case factory); advisory tickle
  rules.
- **`sol_docketing.mode ∈ {advisory_mirror | off}`** (default off): cannot enable SOL
  display without a required `disclaimer_ack: true` + a named `authoritative_system`
  (the firm's CMS owns the calendar; we show a SHADOW warning only). Keeps us out of
  the docketing system-of-record role + its malpractice liability.
- **`referral`** (default `enabled: false`): stores the firm's OWN referral
  destinations for refer_out, each with a CRPC-1.5.1 `basis` +
  `client_written_consent_required: true` (display gate). **`monetized_through_intakeqa:
  false` is a HARD INVARIANT, not a knob** — flipping it is the B&P §6152/§6155 anti-
  capping tripwire → STOP → Yang. Intake QA records destinations the firm already uses;
  it never brokers, networks, or takes payment for a referral, and is NOT a §6155
  certified referral service.
- **`value_ordering.surfaceable: false` (HARD INVARIANT)** — the internal
  fee/contingency + cost-to-develop-tier numbers rank cases (ordinal `rank_key =
  P(good|band) × E[net_fee|band] − cost_to_develop`) but are NEVER rendered as a dollar
  quote to staff or claimant (§I/§IV). This is what lets PIY subtract carrying cost.
- **`calibration`**: the band→outcome map WRITTEN BY the loop, READ BY the scorer.
  Per-band {p_good, e_net_fee, eff_n, credible_interval, source ∈
  external_prior|firm_realized|pooled}; `min_effective_n_to_promote: ~30`. Bands stay
  external_prior (wide CI, "low confidence" UI tier) until they earn promotion — honest
  mixed confidence, never false uniformity; no score shown without its CI.

**Two §VIII flags:** (1) the cold-start base rates are external priors from named
source families, not current-methodology-verified — pull + cite exact BJS/IRC pubs
before shipping, label "modeled, low confidence," never a guarantee. (2) The referral
config is the single highest ethics risk — inert by default, structurally unable to
monetize through us; ANY "network/match firms for a fee" pressure crosses §6152/§6155
→ Yang before design, not after.
