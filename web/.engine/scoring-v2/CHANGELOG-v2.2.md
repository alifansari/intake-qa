# scoring-v2.2 — Triage Deltas (2026-07-12)

Implements the R1/R2 deep-research deltas (`ops/drafts/engine-v2-*`) into the v2 engine.
**Additive, backward-compatible, dark-by-default. v1 `scoring/` untouched. Nothing activated.**
Branch: `feature/scoring-v2.1-triage-deltas` (off `feature/scoring-v2`).

## The five additive areas (+ gaps) — all shipped in code

### 1. Statutory currency → `lib/statutes.mjs` (new, tested)
Date-indexed constants, all verified against primary sources this round:
- Auto minimums **30/60/15** for policies ≥ 1/1/2025 (SB 1107); 15/30/5 before; 50/100/25 at 2035.
- MICRA **$470k injury / $650k death for 2026**, keyed to **year of resolution**, escalating schedule; economic uncapped (AB 35).
- Limited-civil **$35k via SB 71 (Stats. 2023 ch. 861)** — corrected from the earlier "AB 2347" misattribution.
- Rideshare coverage branch: **$1M liability only when the rideshare driver is at fault**; passenger UM/UIM **cut to $60k/$300k** for crashes ≥ 1/1/2026 (SB 371, PUC 5433).
- Survival non-economic **sunset — economic-only for filings ≥ 1/1/2026** (SB 447/CCP 377.34), elder-abuse excepted.
- FMCSA coverage floors; SOL descriptor table (flags only); labeled practitioner threshold seeds.
- **Compliance:** amounts drive TIER reasoning only; never emitted at intake.

### 2. New extraction facts (competitor parity) → `system-prompt.md` STEP 1B + `validate.mjs`
12 OPTIONAL facts (defendant_type, coverage_stack, objective_findings, treatment_latency,
lien_sources, rideshare_period, public_entity_defendant, commercial_truck, defendant_dui,
prior_claims_same_region, wrongful_death_survival, medicare_status). Shape-checked IF present,
never required → existing golds still validate; absent → unknown → develop (never a wrongful decline).

### 3. Net-recovery lien model → `lib/liens.mjs` (new, tested) + G1 re-spec
G1 "Underwater" now fires on **projected NET after statutory lien reduction**, not gross:
ERISA self-funded (claws ~100%) sinks a file Medi-Cal (highly reducible) would not. Unknown
reducibility (esp. ERISA funding status) **withholds the cap and routes to DEVELOP** ("obtain SPD").
Rideshare coverage compression raises a G1 review flag. All new triggers observed-only.

### 4. Case-type coverage → `lib/casetypes.mjs` (new, tested) + decision-table routing overlay
Per-case-type routing (med-mal/product/elder-abuse/comp-only → refer-default; government/trucking →
urgency; trucking → spoliation). Richer public-entity fact fires the §911.2 window with the minor
late-claim-relief backstop; commercial-truck raises the spoliation-letter urgency flag (G2).
Refer-out is now first-class: a refer-default type on a heavy-effort file routes to refer-out
(per-hour winner) and always surfaces the refer comparison.

### 5. DEVELOP action conveyor → `lib/develop-actions.mjs` (new, tested)
DEVELOP now emits a **ranked CA-PI-workup action list** (pull CHP report; spoliation letter
24–48h; client's own dec page; obtain SPD; …) tagged pre-suit / discovery-only with latency
criticality and ethics rails (all-party recording consent, no-contact-if-represented, no
solicitation). Critical latency ranks first. No "ISO ClaimSearch" action (ISO discloses to insurers only).

### Gaps also shipped
- **Base-rate prior** → `lib/priors.mjs` (new, tested): tier-only "boring prior" sentence, labeled
  published-not-firm-data, stands next to the vivid call (anti-base-rate-neglect).
- **On-call observability** → `lib/observability.mjs` (new, tested): per-field caller-stateable /
  sometimes / develop-only classes + must-ask FLOOR; a missing FLOOR item is a call-quality signal
  (re-contact), a missing develop-only item is benign (never a penalty). Surfaced as `call_quality`.
- **Spanish/bilingual fact-capture** → prompt: lay-term lexicon, false-friend guard (`intoxicado`
  ≠ intoxicated — the Willie Ramirez rule), deferential-speech neutralization.
- **Refer-out economics config** → PART B knobs `capital_ceiling_tier`, `referral_split_default`.

## Legal corrections folded in (R2 verification: 7 CONFIRMED / 3 fixed / 0 fabricated)
- Limited-civil bill: **SB 71**, not AB 2347; single step, no $50k phase-in.
- SB 1107 codification: Veh. Code 16056 (policy-date, not loss-date, keying).
- Elder-abuse survival cap = current **Civ. 3333.2(b) ($470k, 2026)**, not $250k.
- Montgomery v. Caribe Transport II (SCOTUS 5/14/2026) confirmed real → broker liability settled.

## Tests
`node --test scoring-v2/test/*.tests.mjs` → **145 pass / 0 fail**
(68 pre-existing, unchanged in behavior + 77 new/added across statutes, liens, casetypes,
develop-actions, observability, priors, and the v2.2 integration suite).

## ACTIVATION GATE (unchanged, still Ali's decision)
- The prompt (`system-prompt.md`) gained STEP 1B → this is a **calibration-state change**.
  **Full gold regeneration + v1-vs-v2 rerun + the QWK/recall validation protocol are REQUIRED
  before activation** (README + CALIBRATION-NOTES). Building here does not activate anything.
- v1 `scoring/` remains byte-identical and still serves the beta.
- Open questions for the PI attorney / Yang: see `ops/drafts/engine-v2-delta-and-open-questions.md`
  §4 and `engine-v2-r2-corrections-and-additions.md` §3.
