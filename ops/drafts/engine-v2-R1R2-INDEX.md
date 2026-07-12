# Engine v2 — Triage Research Rounds 1–2: START HERE (2026-07-12)

> **What this is.** A two-round deep-research pass (2026-07-12, ~47 subagents, web-grounded +
> adversarially verified) that upgrades the *frozen* `scoring-v2/` triage engine from
> "calibrated-from-literature" toward "implementation-ready," and — critically — re-baselines
> every statutory constant to **current 2026 law**. The engine was **left frozen** the entire
> time (CLAUDE.md contract). Everything here is a **staged proposal** for Ali + a PI attorney +
> Yang, not a code change. Read this page first, then the six docs below.

## The one-paragraph verdict

The prior engine-v2 package (LLM extracts ~30 cited facts + grades 7 anchored dimensions; code
does 4 gates, the sign/develop/refer/decline table, tiers, posture, abstention) is **structurally
right and does not need re-architecting.** What it needed was (1) **statutory currency** — several
value constants are keyed to obsolete numbers and would mis-tier every relevant case; (2) **more
extraction facts** the funded competitors already capture (defendant-type, the full coverage
stack, objective-injury/permanency, treatment-gap, lien-type); (3) **a net-recovery lien model**
so "underwater" fires on projected net, not gross bills (our biggest structural edge, nobody else
models it); (4) **case-type coverage** for the ~6 types the rubric didn't yet route; and (5) a
**DEVELOP action conveyor** that turns the develop disposition from a shrug into a ranked workup
list. **All additive, all inside the existing compliance rails.** The research ceiling is now
reached: the remaining gains (the strong/adequate/thin cut-points, the real value-tier dollar
bands, hours-per-case) **cannot come from research — only from real transcripts + attorney-ratified
labels + the firm's own resolved-case flywheel.** The correct next move is **execution, not more
research**: ship the config/schema deltas on the branch, run v2 in shadow mode, and start labeling.

## The load-bearing legal corrections (verified against primary sources this round)

Every one is a **date-indexed config constant**, never a dollar/date shown at intake.

| Was (frozen engine / obsolete) | Correct 2026 law | Source bill/case |
|---|---|---|
| Auto minimums 15/30/5 | **30/60/15** (policies issued/renewed ≥ 1/1/2025; → 50/100/25 in 2035) | SB 1107 (Ch. 717, 2022); Veh. Code 16056 |
| MICRA flat $250k ceiling | **$470k injury / $650k death (2026)**, year-of-resolution, economic uncapped, 3 caps stack | AB 35 (Ch. 17, 2022); Civ. 3333.2 |
| Limited-civil $25k | **$35k** (eff. 1/1/2024, single step, no $50k phase-in) | **SB 71 (Ch. 861, 2023)** — *not AB 2347* |
| Rideshare "= $1M" | branch: $1M liability only if **driver** at fault; passenger UM/UIM **cut to $60k/$300k** for crashes ≥ 1/1/2026 | SB 371 (2025); PUC 5433 |
| Survival p&s recoverable | **sunset — economic-only for filings ≥ 1/1/2026** (elder-abuse WIC 15657 excepted) | SB 447; CCP 377.34 — **LIVE now** |
| Freight-broker liability "contested" | **settled nationwide** — negligent-selection survives FAAAA preemption | *Montgomery v. Caribe Transport II*, 24-1238 (SCOTUS 5/14/2026) |
| (missing) future-medical discount | *Audish* — Medicare rates admissible for future care (published, review denied) | *Audish v. Macias* (2024) 102 Cal.App.5th 740 |
| Prop 213 "+ soft tissue" | bars **noneconomic only**; owner/operator + uninsured + no DUI-defendant; **passengers exempt** | Civ. 3333.4 |

Verification result: **7 CONFIRMED, 3 precision-fixed, 0 fabricated.** No claim had to be reverted.

## The six documents

1. **`engine-v2-delta-and-open-questions.md`** — the "what we actually change" master diff:
   ranked A→F change list, competitive feature-coverage matrix, methodology upgrades, and the
   explicit execution ceiling. **Read this second.**
2. **`engine-v2-legal-currency-audit.md`** — every CA doctrine the gates depend on, marked
   CORRECT / STALE / MISSING with the exact fix (Prop 213, Howell/Corenbaum/Pebley/Audish,
   AB 35 MICRA, CCP 998, lien law, SOL table, Gov. 911.2, SB 1107, rideshare, survival, punitive).
3. **`engine-v2-casetype-signal-library.md`** — per-case-type disposition-flipping signals wired
   to extraction fields / gates / tiers, with thresholds (auto, rideshare, trucking, premises +
   subtypes, dog-bite, product, med-mal, government, WC-third-party, elder-abuse, wrongful-death).
4. **`engine-v2-base-rate-priors.md`** — the seed "boring prior" table (published, labeled
   not-firm-data) with honest nulls where no CA settlement distribution exists.
5. **`engine-v2-dimension-anchors-v2.md`** — per-level (strong/adequate/thin/unknown/fatal)
   behavioral anchors for all 7 dimensions + the fairness/multilingual guardrails.
6. **`engine-v2-r2-corrections-and-additions.md`** — Round-2 patch: the legal corrections ledger
   (above), the practitioner threshold seeds, the per-field on-call observability map + must-ask
   checklist floor, and the Spanish/bilingual fact-capture guardrails + seed lay-term lexicon.

## The top implementation priorities (from the delta doc, condensed)

- **A. Ship first (config + schema, low effort, high accuracy lift):** re-baseline every statutory
  constant to date-indexed config; promote `defendant_type` to a required first-class field; split
  the coverage stack into cited facts with client UM/UIM as the decisive fallback; public-entity →
  tightest urgency flag; rideshare branch on period + at-fault party; objective-findings/permanency
  damages backbone; fairness-gated treatment-gap.
- **B. Gate work (medium effort):** re-spec **G1 Underwater** to fire on projected net after
  statutory lien reduction (the biggest structural edge); Prop-213 precise fact conjunction;
  G4 trial-capital + carry keyed to a track cost curve; **REFER-OUT as a first-class ROI-positive
  disposition**; rebuild Dimension 6 as strictly behavioral with hard exclusions; split apology
  from factual admission.
- **C–F:** new case-type routing (premises subtypes, dog-bite, product-refer, med-mal/government,
  WC-third-party, elder-abuse, wrongful-death); Howell/Audish payment-posture coupling; DUI/punitive
  liability-vs-value split; DEVELOP action conveyor; seed prior library; venue field with null
  multiplier.

## What research cannot improve (the honest ceiling — do not spend more research here)

1. The actual strong/adequate/thin **cut-points** — need attorney-labeled calls.
2. Every **value-tier dollar band** except statutory anchors — need the firm's resolved-case flywheel
   or a licensed verdict feed; no free CA *settlement* distribution exists.
3. **Hours-per-case** (the objective-function denominator) — unpublished for 1–5-attorney firms.
4. The **on-call base rate** at which each conditional fact is actually stated vs must be developed.
5. **ASR error / language-parity magnitudes** on this firm's own audio.

The recommended path is unchanged from the Activation-Decision memo: **merge the branch inactive +
run v2 in shadow mode** so the validation corpus and the flywheel feature vector accrue with calendar
time, while these deltas are implemented on the branch and the open questions go to Yang.

*Provenance: statutory constants are date-indexed config (operator-visible, not flywheel-overwritable);
published thresholds/priors are labeled published-heuristic and decay under firm data. Nothing here
emits a dollar or a computed date at intake; every disposition remains attorney-ratified.*
