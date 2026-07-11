# Engine v2 — Triage-First Intake Scoring: Design Spec (LIVING DOCUMENT)

> **STATUS: RESEARCH + DESIGN IN PROGRESS. NOT A BUILD. NOT SHIPPED.**
> The scoring engine (`scoring/system-prompt.md`) is FROZEN per CLAUDE.md. This
> document is the reviewed **engine v2** specification — a deliberate, staged
> rubric change with real legal/economic stakes. It ships only after (a) Ali's
> approval, (b) a PI-attorney review of the rubric philosophy, and (c) Yang / a
> retained CA legal-ethics review (compliance-invariants §VII — anything novel in
> a regulated area routes to review before it ships). v1 stays intact for
> comparison and re-validation.
>
> Started 2026-07-10. Author: research synthesis across iterative waves (see
> `ops/insights.md` and the session transcript for the raw briefs + citations).

---

## 0. The thesis (why v2 exists)

**v1 scores intake as a CONVERSION funnel. The selective trial-lawyer firms we
sell to run it as a TRIAGE operation.** The single most important intake decision
for a selective firm is *which cases NOT to take*. v1 has no concept of a
correctly-declined case, no coverage-**adequacy** screen, no net-of-cost value
math, and it enshrines "e-sign on the first call" as the 100-point best practice —
which trains firms to manufacture *signed dogs*. v2 re-centers the engine on
case-selection accuracy while preserving what v1 gets right (the six critical-fail
scans, the empathy rubric, the speed emphasis, the evidence-or-it-didn't-happen
discipline).

**Segment truth:** high-volume/turnkey firms legitimately optimize conversion;
selective/trial firms optimize inventory quality. v2 must honor BOTH via a firm
`case_selection_posture` config, not impose one worldview. We are currently
selling Group A's rubric to Group B — v2 fixes that.

---

## 1. The nine defects in v1 (the fix list)

| # | v1 defect | Where (system-prompt.md) | v2 fix (summary) |
|---|---|---|---|
| D1 | Conversion is 25% of score; no triage dimension | §4 Cat B (line 75) | Add case-economic viability dimension; reweight |
| D2 | One-directional alert: only `lost_signable_case` | §3D (55-64) | Add two-sided over-conversion / questionable-sign alert |
| D3 | Signability = "plausible recovery source" — existence not adequacy | §3B (46) | Add coverage-**adequacy** screen (limits, min-limits, Prop 213) |
| D4 | `revenue_at_risk` = flat GROSS avg fee per case type | §3D (61-62) | Net of file cost, capped by likely limits; conservative band |
| D5 | No MIST / impact-severity / causation-defensibility factor | §3A (F1-F4) | Add MIST-risk + causation-defensibility factor |
| D6 | B1=100 rewards e-sign-on-call universally; penalizes disciplined vetting | §4 B1 (76) | Context-appropriate ask: reward disciplined develop-then-sign equally |
| D7 | No firm-segment posture | FIRM CONFIG | Add `case_selection_posture: high_volume \| selective` |
| D8 | Gold set has no marginal-decline case; calibrated on a high-volume firm | golds | Add 4th gold: marginal case correctly developed/declined, scored WELL |
| D9 | E2 scores "how did you hear about us" as a client-quality behavior; deliverable is one-directional "leak" | §4 E2 (93); framing | Reframe E2 as ops-only; two-sided "mis-triage" deliverable |

---

## 2. Research waves (index)

- **Wave 1 (2026-07-10):** foundational facets — case-selection frameworks;
  liability & causation defensibility; damages & medical credibility; coverage &
  collectability adequacy; case economics / EV; actuarial-vs-clinical; practice-area
  criteria; over-conversion / signed-dog detection. [SYNTHESIS BELOW — filling in
  as agents return.]
- **Wave 2 (planned):** adversarial critique (defense-lawyer + settlement-mill
  lenses), the corrected value math with worked examples, the rubric skeleton,
  the transcript-signal extraction spec, calibration/validation plan.
- **Wave 3+ (planned):** gold-example authoring, prompt-diff drafting, QWK
  re-validation design, firm-config schema, deliverable/UI reframe.

---

## 3. WAVE 1 SYNTHESIS

_(Populated as the eight facet briefs return. Each subsection: the decision rules,
the transcript-observable signals, the proposed v2 dimension, the CA law, and the
v1 defect it corrects. Full cited briefs live in the session record + ops/insights.md.)_

### 3.1 Case-selection decision framework (take / decline / refer / develop) ✅ Wave 1

**The model is UNDERWRITING, not conversion:** a contingency practice is a portfolio
of bets funded with the firm's own advanced capital (Rule 1.5(c)/1.8(e)) + time +
finite trial capacity. The managing partner's real question: *"would I put my own
money on this file, knowing I only get paid if I win and I front the costs either
way?"* Authoritative CA artifact: **Daniel Pierson's CAALA *Advocate* intake
checklist** (Oct 2024) — case value/damages ("expect ~10% of case value in costs"),
the client ("what would a jury think of them?"), liability + comparative fault,
coverage/collectability ("policy limits determine case viability"), prior-claims
history, pre-existing conditions. The three pillars are evaluated in REVERSE:
"only after sufficient money/damages will a PI attorney even consider liability."

**TWO structural insights that reshape the whole engine:**

1. **Four-valued outcome space: `sign` / `develop` / `refer-out` / `decline`** — NOT
   sign-vs-lost. *Develop* = a promising file with 1–2 named, resolvable unknowns
   (unconfirmed limits, report unavailable, injuries still evolving) and no
   disqualifier — investigate before deciding. *Refer-out* = a positive revenue
   outcome (CRPC 1.5.1). v1 has NONE of these states.
2. **Latency: most decisive underwriting variables are LATENT at intake.** The call
   *can* establish mechanism/liability story, treatment timeline, defendant type,
   whether coverage is *believed* to exist, incident date (→ SOL). It *cannot*
   reliably establish actual limits, report fault findings, imaging, true specials,
   liens, assets. **A rubric that scores the transcript as if it were the file will
   systematically mis-rank.** → separate `call_observable_confidence` from
   `requires_development` facts.

**Sign-now vs develop vs decline triggers:** SIGN NOW when facts clear AND a hard
deadline forces it (imminent SOL, six-month gov claim, perishable evidence).
DEVELOP when promising but a *resolvable* unknown controls. DECLINE when a *known,
unfixable* disqualifier exists (no coverage, client primarily at fault, Prop 213
bar, dead credibility).

**Reward the DISQUALIFYING questions** — the highest-value transcript data is the
credibility/red-flag signal (prior claims, treatment gaps, insured status, DUI),
which a conversion script never asks because every honest "yes" lowers sign rate.
Client credibility ("what would the jury think?") is almost entirely wasted by v1.

**Firm posture (Engstrom's "settlement mill" vs selective/trial):** BOTH legitimate
and symbiotic (volume firms refer catastrophic outliers to trial firms for a 1.5.1
fee). Posture is a **config that re-weights dimensions AND shifts action
thresholds** — Selective routes borderline files to develop/refer; Volume routes
them to sign.

**Corrects:** D2 (outcome space), D6, D7 (posture), D9. The central error named
plainly: **an unsigned signable case is frequently the correct, profitable decision**
— a develop, a refer-out, or a cost-saving decline.
_Full cited brief (Pierson/CAALA checklist, Engstrom, Howell, Prop 213, 1.5.1) in
session record._

### 3.2 Liability & causation defensibility (MIST, pure comparative fault) ✅ Wave 1

**Order of operations:** a selective firm filters on **liability probability ×
comparative-fault discount** BEFORE it prices damages, because those are
multipliers on the entire recovery and compound with every downstream weakness.
`expected_case_value ≈ P(liability) × (1 − comparative_fault) × collectible_damages`.

**Proposed dimensions:**
- **`liability_clarity` (~25–30%, GATING not additive).** Good: rear-end / DUI /
  cited defendant / independent witness / video; defendant clearly majority at
  fault. Mixed: shared-fault, no citation but corroborated, lane-change/left-turn
  dispute. Poor: pure he-said/she-said, unwitnessed fall with no notice evidence,
  caller admits significant fault. A great injury on a losing-liability case is
  still a losing case — hence a gate.
- **`causation_integrity` (~20–25%).** Good: acute traumatic dx, immediate care,
  no prior claims/imaging, meaningful property damage, objective findings. Mixed:
  soft tissue w/ prompt treatment but modest impact, or documented aggravation.
  Poor: MIST profile, degenerative-only imaging, >2wk or mid-treatment gap, prior
  same-body-part claim.
- **`property_damage_impact` (sub-signal, directly askable).** Visible damage /
  repair estimate / airbag deployment — the master switch for MIST.
- **`plaintiff_insured_status` (~8–10%, near-binary Prop 213 gate).** Uninsured
  driver/owner → barred from NON-economic damages (Civ. Code §3333.4) → a $60k
  soft-tissue case collapses to ~$8k economic. Exceptions: passengers, non-owners,
  DUI-defendant cases.

**MIST (the headline v1 error):** Minor-Impact Soft-Tissue is a carrier
*designation* triggered by a property-damage dollar threshold (~$1,000–1,500),
then worked scorched-earth behind a biomechanist (Sargon/Kelly-Frye fight) and
Colossus valuation. Respected plaintiff lawyers DECLINE/refer MIST: small fee,
huge work, carrier wants trial. **"Treated soft-tissue injury" does NOT rescue a
MIST case** — treatment is *damages* evidence; MIST is a *causation/impact* attack.
Piling on chiro visits feeds the "build-up" narrative and raises liens.

**CA law:** Li v. Yellow Cab (pure comparative — 99%-at-fault plaintiff still
recovers 1%, but the discount is linear on every dollar and the fee/costs/liens
come out of the *reduced* number); CACI 3927/3928 (eggshell/aggravation, but with
apportionment → discounted delta); Prop 213 / Civ. Code §3333.4; Sargon/Kelly-Frye
(biomechanics admissibility).

**Corrects:** D3, D5. v1 scores the *existence* of a defendant + *treated injury*
as `likely_signable`, which is precisely the MIST/disputed-liability fingerprint a
selective firm declines — and mislabels the correct decline as "lost revenue."
_Full cited brief (Li, MIST/Colossus, Prop 213, CACI) in session record._

### 3.3 Damages, injury severity & medical credibility (Howell, liens, net recovery) ✅ Wave 1

**Core reframe:** intake is UNDERWRITING, not "injured: yes/no." The question is
whether the file — net of Howell, liens, and costs — nets the client money and a
fee that justifies the risk capital. v1 gates on "injured + treated" then pays a
flat gross fee; that overvalues insured soft-tissue by 2–3× and is blind to the
underwater case.

**Three graded value axes this brief proposes (replace v1's binary qualification checkboxes):**

- **`injury_objectivity_severity` (~25%).** 5 = surgery / displaced fracture /
  positive imaging + permanency; 3 = herniation / positive MRI, non-surgical;
  1 = pure soft tissue, clear imaging, resolving. Objective, imageable injury is
  what a defense radiologist can't wave away; MRI moves the multiplier from ~1.5
  toward 4–5. Non-economic damages are UNcapped in ordinary PI (MICRA cap is
  med-mal only), so severity/permanency drive value directly.
- **`treatment_credibility` (~20%).** 5 = same-day ER + MD-directed + continuous;
  3 = short delay, mixed care; 1 = weeks-long delay, chiro-only, gaps, or
  lawyer-referred **lien-mill / over-treatment**. Delay and gaps hand the defense
  causation; lien-mill treatment invites a build-up/IME attack and (post-2023 LOP
  disclosure) bias impeachment. KEY INVERSION: v1 reads *more treatment* as *more
  damages*; a selective firm reads lien-mill over-treatment as a *screen-out*.
- **`net_recovery_headroom` (~20%).** 5 = low liens, adequate coverage, clean
  insured treatment; 1 = billed Pebley-lien specials or ERISA/Medi-Cal lien
  approaching available limits → the **underwater case** (client nets ~$0 → a bar
  complaint waiting to happen → correct decision is DECLINE).

**CA law that resets the numbers (load-bearing):**
- **Howell v. Hamilton Meats (2011) 52 Cal.4th 541** — insured plaintiff recovers
  only amounts *actually paid/accepted*, not billed (~68% haircut in the case).
- **Hanif/Nishihama** lineage — same principle, Medi-Cal → private insurance.
- **Corenbaum v. Lampkin (2013)** — billed amount is *inadmissible*, incl. as an
  anchor for future-care AND non-economic damages.
- **Pebley v. Santa Clara Organics (2018)** — uninsured, or insured-treating-on-liens,
  plaintiff may put full billed/reasonable value to the jury (escapes Howell) —
  BUT subject to a "reasonable value" expert fight, LOP bias impeachment, and
  lien-payback. This is *why* firms route to lien treatment; it's double-edged.
- **Lien load:** Medi-Cal (Ahlborn / W&I §14124.76, capped at ≤50% of net);
  Medicare MSP (super-priority, structurally non-negotiable); **ERISA self-funded
  (worst — often no made-whole/common-fund reduction, dollar-for-dollar)**;
  provider/LOP liens. Negotiation yields 20–50% reductions but ERISA/Medicare
  resist.

**Corrected value formula (feeds D4 fix):**
`revenue_at_risk = [ (Howell/Pebley-adjusted recoverable specials + graded general
damages) × P(collect) − liens − advanced costs ] × fee_rate`, capped by likely
policy limits, conservative band, never a flat gross average.

**Transcript signals:** objective-injury vocabulary (fracture/herniation/surgery/
injections/MRI/"permanent"); immediate MD-directed continuous treatment; insurance-
paid (not lien-clinic) care; documentable wage loss; adequate coverage. Red flags:
delayed first visit, chiro-only, gaps, lawyer-referred lien mill, over-treatment vs
mechanism, low-property-damage collision, min-limits/uninsured defendant, big billed
specials on liens against a thin policy.

**Corrects:** D3 (adequacy), D4 (net value), D5 (severity as graded axis).
_Full cited brief (Howell/Corenbaum/Pebley/Ahlborn + treatment-credibility sources)
in session record._

### 3.4 Coverage & collectability ADEQUACY (limits, min-limits, Prop 213) ✅ Wave 1 — TOP WEIGHT

**Thesis:** "Liability wins the argument; coverage pays the mortgage." Coverage must
be **adequate**, not merely *exist*. This is the single highest-weight dimension
and functions as a **near-gate**: a 0–1 here caps overall signability regardless of
how clean liability is.

**Proposed dimension: `coverage_adequacy` (~30–35%, with hard overrides).** Anchors:
4 = commercial/gov/$1M+ or strong UIM stack; 3 = standard personal policy likely
≥100k or confirmed UIM; 2 = minimum-limits personal policy, injury justifies limits;
1 = min-limits + soft-tissue (net-to-client ~$0); 0 = uninsured/judgment-proof/
Prop-213-barred. Score to the **highest adequate collectable layer** indicated;
treat **unknown limits + minor injury as presumptively minimum**.

**CA minimums:** 15/30/5 → **30/60/15 (SB 1107, eff. 2025)** → 50/100/25 (2035);
huge installed base of 15/30 persists. The min-limits + soft-tissue file is the
highest-volume, lowest-value archetype and is usually a **decline or fee-limited
referral** (see worked math in 3.5).

**The recovery waterfall (score to the top rung found):** (1) defendant limits;
(2) **client's own UM/UIM + stacking** (Ins. Code §11580.2 — the offset/gap model
that RESCUES a min-limits case: $30k defendant + $100k UIM = $100k exposure — "do
YOU have full coverage?" is one of the most valuable questions on the call);
(3) umbrella/excess; (4) med-pay; (5) **commercial/employer (respondeat superior)** —
company truck ($1M fleet), **rideshare (period-1 ~$50/100/30 vs periods 2–3 $1M;
SB 371 reshaped on-trip UM/UIM eff. 2026)**, delivery; (6) **dram shop = near-dead
end in CA** (B&P §25602 immunity; exceptions only for obviously-intoxicated minors);
(7) self-insured corporates; (8) **government = deep pocket + claim-presentation
trap** (Gov. Code §911.2 six-month claim clock, §945.4 condition precedent — a "city
bus" case is simultaneously the most valuable AND most time-urgent intake); (9)
uninsured/judgment-proof.

**Two hard gates:** (a) **client-uninsured → Prop 213** (Civ. Code §3333.4, non-econ
barred) drop to 0–1 unless economic damages large or exception; (b) **min-limits +
soft-tissue** → cap. **Prop 213 is v1's most dangerous blind spot** because the
liability facts look *perfect* ("rear-ended, clear fault → sign!") while true EV
after §3333.4 is near zero — v1 never asks whether the *client* was insured.

**Verification (post-sign):** AB 1234 policy-limits disclosure (~20 days on written
request, eff. 2025); CCP §2017.210 (limits discoverable in litigation); CCP §§999/
999.5 (time-limited limits demands). At intake you *estimate* from caller knowledge +
commercial-defendant indicators + injury-severity-as-tender-proxy.

**Corrects:** D3 (the central adequacy fix), D4. v1 stops at rung 1 on hearing
"insurance," treats every rung as equivalent, counts unknown limits as adequate,
counts the dram-shop dead end as a source, and flattens a $1M rideshare case and a
$15k judgment-proof case into the same "likely_signable → $12k."
_Full cited brief (SB 1107, §11580.2, Prop 213, §25602, Gov Code 911.2/945.4, AB
1234, rideshare tiers) in session record._

### 3.5 Case economics / expected value (net-of-cost, referral-out, the dog) ✅ Wave 1

**Core model:** `Firm EV = P(liability) × min(case value, collectable limits) ×
P(collect) × fee% − cost-to-develop − carry`. `Net-to-client = recovery − fee −
costs − liens`. Intake is UNDERWRITING, not converting.

**Worked examples (the heart of the D4 fix):**
- **A — clean $100k policy case (SIGN):** ~$30.3k firm net, ~$28.8k EV, 30–40 hrs.
- **B — min-limits soft-tissue "dog" (DECLINE/REFER):** $15k gross → ~$1,250 margin,
  break-even after overhead, NEGATIVE if it litigates ($8k+ costs, 18–24mo carry).
  Client nets ~$2,500. This looks like revenue at intake and bleeds cash at
  disbursement.
- **C — catastrophic trucking (SIGN, underwrite the carry):** ~$254k EV but on $250k
  of the firm's own advanced capital over 3–4 yrs with real variance (defense
  verdict = total loss).

**Proposed dimensions:** `net_collectable_value` (the corrected value-at-stake),
`cost_to_develop_tier` (low / medium / expert-heavy), `expected_carry_months`,
`client_net_floor` (flag when projected net-to-client < ~40% of gross).

**Referral-out is a POSITIVE outcome v1 can't see.** CRPC 1.5.1 permits a **pure
referral fee** in CA (no proportional work / joint responsibility required) with
written fee-division + client's written consent + total fee not increased. The
min-limits dog worked in-house ≈ $1,250 break-even over 18 months; **referred out
at 25% ≈ $1,250 for one phone call, zero cost/carry/risk.** → add **`refer`** as a
first-class third outcome (sign / decline / **refer**) with an expected referral-fee
value.

**Portfolio/capacity:** a finite number of slots; a dog in a slot has an opportunity
cost ≈ the EV of the good case it displaced (~$27,500 in the worked math). Add a
**slot opportunity-cost discount** when inventory is full — the same marginal case
is a *sign* in a slow month and a *refer* when full.

**CA specifics:** contingency 33⅓% pre-suit / 40% litigated; **CCP 998** (a beaten
plaintiff 998 shifts post-offer expert costs + 10% interest — improves EV on strong
cases; *Madrigal v. Hyundai* 2025 raised the downside of marginal litigated cases);
**MICRA/AB 35** (25%/33% fee cap + $100k+ experts + $350k non-econ cap → most
med-mal is a decline unless economic damages are large).

**The v1 indictment, quantified:** if firm avg auto fee = $12k, v1 assigns $12k to
*every* auto inquiry and books declining the dog as a **−$12k "lost" outcome** — a
~$12k FAKE LOSS on a case it should decline; **~$13.25k error** vs the refer outcome;
**~$2.4M/yr hallucinated** across 200 marginal inquiries. This *inverts the firm's
economics* and pressures signing dogs. **Corrects:** D1, D2, D4.
_Full cited brief (worked EV math, CRPC 1.5.1, CCP 998, AB 35, Howell) in session record._

### 3.6 Actuarial vs clinical case selection (Meehl/Grove; base rates; Goodhart) ✅ Wave 1 — THE BACKBONE

**Case selection IS a prediction problem, and 70 years of evidence says a
consistently-applied mechanical rule beats an expert's gut — IF you validate
against realized outcomes and refuse to let sign-rate become the target.**

**1. Mechanical beats clinical.** Grove et al. (2000) meta-analysis, 136 studies:
mechanical ~10% more accurate on average; substantially beat the clinician in
33–47% of studies, clinician won in only 6–16%; held *regardless of judge
experience*. The edge is **consistency** — the model scores case #500 exactly like
case #1. An intake attorney on a phone is the paradigm noisy clinical predictor.
→ **Encode intake as a fixed set of scored variables with pre-registered weights;
force EVERY case through the same rubric (don't let "obvious" cases skip it); log
every attorney override + its realized outcome** (the model's advantage only exists
if the model actually decides).

**2. Base rates.** ~95–97% of PI cases settle; case *value* is long-tailed (a
minority of files carry the book). The intuitive selector reasoning from the vivid
phone story ignores the prior. → **Anchor scores to the firm's OWN realized base
rates**: "70/100" should mean "cases like this were profitable at rate X here,"
computed from closed-case data (profitable / settled-at-EV / became-a-dog). Cold
start: seed with published distributions, widen the uncertainty band. Track the
long tail — the discriminating target is **profitable settlement NET of carry**,
where the variance lives.

**3. "Just add them up" (Dawes 1979, improper linear models).** Once you pick the
right variables and get their *sign* right, exact weights barely matter; unit
weighting rivals regression and doesn't overfit. → **Don't fit fragile weights on a
thin case history. Get the variable LIST and DIRECTION right, standardize, add.**
Use coarse tiers (3×/2×/1×) only where domain logic is overwhelming (limits,
liability as heavier because they're hard ceilings). Prefer objective checkable
inputs. Treat coverage as a **gate, not a term**.

**4. Validation + the Goodhart trap (the most important warning).** Need an
**outcome-validation loop** as a first-class component: every scored case followed
to disposition (settled amount, costs, lien, net, dropped) and back-tested (Brier
score headline; QWK for model-vs-attorney drift; calibration curves per band,
recalibrated quarterly). Without it you have an *opinion generator*, not an
actuarial instrument. **v1 makes SIGNING the flagship metric and has no outcome
loop** — a textbook Goodhart/Campbell trap: optimize the cheap immediate proxy
(sign rate) and it becomes *negatively* correlated with the true target (profitable
inventory), because the easiest way to sign more is to sign worse. Metric glows
green while the book rots. → **Demote sign-rate to a monitored diagnostic; promote
realized net-per-case to the objective; grade the model on cases it selected months
later.**

**5. Confidence layer (ICD-203).** Forcing a binary take/decline on thin data
manufactures false precision. → Compute **two separate quantities: `score`
(predicted value/quality) AND `confidence` (data completeness × factor agreement)**.
Any low-confidence → route to **"develop / attorney judgment,"** never a hard call.
Communicate in a fixed likelihood ladder ("likely profitable, moderate confidence —
pending limits"). **Wall case-quality scoring off from rep-behavior scoring** — two
ledgers, one wall (fusing them re-Goodharts the system; a rep could juice case
scores via behavior).

**Corrects:** the epistemic spine of D1/D2/D8 and the whole validation gap.
_Full cited brief (Grove 2000, Dawes-Faust-Meehl 1989, Dawes 1979, ICD-203,
Goodhart/Campbell) in session record._

### 3.7 Practice-area-specific selection criteria ✅ Wave 1

**Case selection is a DIFFERENT calculus per case type — each has a pivotal
sub-question the engine must ask, and the same injury profile flips take↔decline
across types.** → **case-type-aware rubric** keyed to firm `case_types_accepted`.

| Case type | Take/decline logic | Pivotal intake sub-question | Rubric treatment |
|---|---|---|---|
| **Auto/MVA (std)** | Baseline; min-limits + soft-tissue + low PD = decline/refer | "did the other driver get a ticket / have more than minimum?" | limits × liability × injury-objectivity; MIST depressor + hard floor |
| **Trucking/commercial** | **Highest-value take** — accept even on marginal facts (FMCSA $750k min, MCS-90, $1M–$50M; regs manufacture liability; ELD evidence perishable) | "company truck / 18-wheeler / DOT # / on the clock?" | **case-type multiplier UP** + time-sensitive **spoliation-letter flag** |
| **Rideshare** | Value swings ~20× on app period (P1 ~$50/100/30 gap vs P2–3 **$1M**; SB 371 cut on-trip UM/UIM eff 2026) | **mandatory app-status sub-question** before scoring | branch: passenger-onboard → high; P1 → treat like min-limits auto |
| **Premises** | Harder than it looks; **notice** is the ballgame; trivial-defect + open-and-obvious; commercial vs residential decides coverage | "did they know about the hazard / how long was it there / commercial or a home?" | notice-evidence sub-score + trivial-defect depressor |
| **Dog bite** | CA strict liability (Civ §3342) but **collectability decides** — uninsured owner = decline despite certain liability; watch breed exclusions | "did it happen at their house / do they own their home / renter's insurance?" | gate on **coverage sub-question, not liability** |
| **Med-mal** | Textbook **high-injury/bad-economics → decline/refer** unless catastrophic (AB 35 non-econ cap $350k→$750k; $100k+ experts; CCP 340.5 short SOL; B&P 6146 fee cap) | "is there large ECONOMIC loss (young high earner / lifetime care / death w/ dependents)?" | **economic-damages gate**; high severity can be a DECLINE signal here |
| **Product** | Take on strict liability + solvent mfr + preserved product + serious injury; else decline (high expert cost) | "do you still have the product?" | catastrophic-only; expert-cost tier |
| **Dram shop** | **Decline by default** (B&P §25602 immunity; only hook = §25602.1 obviously-intoxicated minor) | "was the person served a minor?" | near-auto-decline unless minor |
| **Government** | Take **with urgency** — deep pocket BUT **Gov §911.2 six-month claim** = condition precedent | capture incident date immediately | **immediate deadline flag** on any public-entity defendant |
| **Negligent security** | Take on strong foreseeability (prior similar incidents — *Ann M.*, *Delgado*); else decline | "were there prior crimes / was it foreseeable?" | prior-incident sub-score |
| **Wrongful death** | Take on proper heir standing (CCP §377.60) + solvent defendant | "who are the surviving family / dependents?" | standing + collectability |

**v1's case-type-blind error, three ways:** (1) conflates "signable" (eager,
injured caller = high conversion) with "valuable"; (2) ignores the type-specific
pivotal variable that actually sets value (two identical-severity callers differ
20× on one unasked sub-question); (3) mislabels correct declines (min-limits,
uninsured-dog, non-catastrophic med-mal) as "lost revenue," pushing the firm toward
negative-value cases — and for med-mal, higher severity reads as a *take* when
cap+expert economics make it a *decline*. **Corrects:** D3, D5, D7.
_Full cited brief (FMCSA, rideshare tiers/SB 371, premises notice/Huckey, §3342,
AB 35, §25602, Gov §911.2, Delgado) in session record._

### 3.8 Over-conversion / signed-dog detection (the missing second alert) ✅ Wave 1

**v1 has one eye.** It flags the lost signable case and rewards the fastest close
(e-sign on first call = 100-point B1). A firm that only measures under-conversion is
trained to convert everything — which is exactly how you manufacture a book of dogs.

**The signed dog:** min-limits + low PD + disputed/absent liability + thin/pre-existing
causation + a lien stack that eats the recovery. Legible at intake from its FACTS,
not its outcome. Cost isn't the nuisance fee — it's **capacity** (paralegals carry
70–100 files; 52% lawyer burnout; 25–35% acceptance correlates with higher case
values, 60%+ with inventory-quality decay) and the **ethics tail** (sign-then-drop
implicates Rule 1.16 "no hot-potato withdrawal," burns the SOL clock, malpractice
exposure).

**NEW output: `questionable_sign` (the symmetric second alert).**
- **Fires ONLY on:** (1) a **committing action** (e-sign captured OR documented hard
  push to sign on this contact) AND (2) **≥N unresolved material red flags** from a
  defined list (unverified/at-or-below-min limits; liability disputed / report not
  obtained; causation reds — low PD + soft tissue, gap, pre-existing; lien exposure
  plausibly > recovery; **client-hesitation language** in transcript). A single
  yellow flag never fires it.
- **Cites evidence** (receipted, never a vibe): timestamp of the e-sign/push, the
  red-flag utterances, the *absent gate* ("no limits verification logged; no police
  report referenced before signature").

**The five FAIRNESS rules (the whole game — bounds false positives):**
1. **Declining is never flagged** (requires a committing action; turning away a bad
   case is a WIN).
2. **Develop-before-decide is never flagged** (routing to a develop/attorney-review
   queue instead of signing = top score, EQUAL to a fast clean sign).
3. **Resolved flags don't count** (limits verified on-call / report pulled /
   causation developed → cleared).
4. **Clean signs protected** (clear liability + adequate limits + solid causation →
   first-call e-sign is CORRECT, scores 100 — distinguish fast *clean* from fast
   *dirty*).
5. **Attorney override closes it** (a lawyer's deliberate strategic bet moves the
   decision up the chain — the control we want).

**B1 becomes CONDITIONAL (the D6 fix):** e-sign-on-first-call earns 100 *only when
facts are clean*; on a red-flag profile the 100-point behavior becomes
**develop-or-decline**, scored EQUAL to a fast clean sign; a premature sign fires
`questionable_sign`. *"Fast on the good ones, disciplined on the bad ones, scored
equally."* Reward the institutional controls selective firms already run (attorney
sign-off before retainer, limits-verification gates, "no e-sign on first call for
MIST/low-PD/disputed-liability", develop-then-decide queues).

**Corrects:** D2 (the missing half), D6. **This is the single most important
product change — the second eye.**
_Full cited brief (MIST, Rule 1.16 no-hot-potato, acceptance-rate benchmarks,
burnout) in session record._

---

## 4. v2 RUBRIC SKELETON (draft v0.1 from Wave-1 synthesis; hardens in Wave 2+)

### 4.0 Two tracks, one wall (non-negotiable architecture)
The engine produces **two independent scores that never fuse** (Meehl §3.6.5):
- **TRACK A — CASE-QUALITY / TRIAGE** (new; predicts *the case*): should the firm
  sign / develop / refer / decline, and what is the case worth net?
- **TRACK B — REP BEHAVIOR / COACHING** (largely v1's rubric, retained): did the rep
  run a good call — empathy, disclosure, logistics, and the *appropriate* close?

v1's core sin is letting Track-B conversion behavior (B1 e-sign) bleed into the
Track-A quality judgment. v2 keeps them on separate ledgers. **v1's rule at line
131** ("never let case quality bleed into rep behavior scores") is kept AND its
converse is added ("never let conversion bleed into the case-quality alert").

### 4.1 The four-valued OUTCOME SPACE (replaces sign-vs-lost)
`recommended_disposition ∈ { sign_now | develop | refer_out | decline }`, each with
a confidence tier. `develop` and `refer_out` are FIRST-CLASS positive outcomes.
An unsigned signable case is frequently the correct, profitable call.

### 4.2 TRACK A — case-quality dimensions (draft weights; unit-ish per Dawes §3.6.3)
Scored 0–4 (or 0/1/2/3/4), standardized. Coverage & liability are **gates**, not
mere terms — a low score there caps the composite regardless of the rest.

| Dim | Weight* | Gate? | Good (4) → Poor (0) |
|---|---|---|---|
| `coverage_adequacy` | ~30% | **HARD GATE** | commercial/gov/$1M+ or strong UIM stack → uninsured/judgment-proof/Prop-213-barred |
| `liability_clarity` | ~22% | **GATE** | rear-end/DUI/cited/video → he-said-she-said / client mostly at fault |
| `damages_severity_provability` | ~18% | | surgery/fracture/positive-imaging + permanency → pure soft-tissue, no imaging, resolving |
| `causation_integrity` | ~12% | | acute traumatic, immediate care, no priors, real PD → MIST/degenerative/gap/prior-same-body-part |
| `treatment_credibility` | ~8% | | same-day ER + MD-directed + continuous → delayed/chiro-only/lien-mill/gaps |
| `net_recovery_headroom` | ~7% | | low liens + adequate coverage → underwater (liens ≈ limits) |
| `client_reliability` | ~3% | soft-cap | cooperative, clean prior history, realistic → evasive, undisclosed priors, "how much do I get?" first |

*Weights are placeholders (Dawes: get variable list + sign right first; tune coarse
tiers only where domain logic is overwhelming — hence coverage/liability heavier as
hard ceilings). **Firm `case_selection_posture` re-weights these + shifts action
thresholds.**

**Hard-cap gates (cap composite regardless of math):** coverage $0 / Prop 213 bar /
client primarily-at-fault / min-limits + soft-tissue + low-PD / (med-mal w/o large
economic loss) / no-treatment-at-all. **Deadline gates (force `sign_now` urgency or
flag):** imminent SOL, **gov §911.2 six-month clock**, perishable evidence
(trucking ELD/vehicle/video → spoliation-letter flag).

### 4.3 Case-type awareness
Classify case type from intake keywords; apply the **pivotal sub-question** and
type multipliers/floors from §3.7 (trucking↑ + spoliation flag; rideshare app-period
branch; premises notice sub-score; dog-bite coverage gate; med-mal economic-damages
gate; government deadline flag; dram-shop near-auto-decline). Honor firm
`case_types_accepted` (out-of-scope → `refer_out`, not `decline`).

### 4.4 Corrected VALUE math (replaces `revenue_at_risk` flat gross average — D4)
```
value_at_stake = [ P(liability) × (1 − comparative_fault)
                   × min(graded_case_value, likely_policy_limits) × P(collect) ]
                 − advanced_costs − (carry_cost proxy)          # firm side
net_to_client  = recovery − fee − advanced_costs − lien_load     # ethics/decline gate
firm_fee_estimate = value_at_stake × fee_rate                    # 33⅓% / 40%
```
- `graded_case_value` uses **Howell-adjusted** (paid-not-billed) specials for insured
  plaintiffs; **Pebley** billed/reasonable-value for uninsured-treating-on-liens
  (flagged, lien-burdened); severity-graded general damages (UNcapped except MICRA).
- **Capped by likely policy limits.** Never a flat per-case-type average.
- Always a **conservative BAND with stated assumptions + confidence tier**, never a
  point (compliance §IV; ICD-203 §3.6.5). Add `refer_out` → expected **referral-fee
  value** (CRPC 1.5.1). Flag `client_net_floor` when net-to-client < ~40% of gross.

### 4.5 The two-sided ALERTS (replaces one-directional flag — D2)
- **`lost_signable_case`** (retained, but re-gated): fires only when Track-A says
  `sign_now`/`develop` with adequate coverage AND the rep failed the *appropriate*
  action. Value = corrected `value_at_stake`, not gross average.
- **`questionable_sign`** (NEW): fires only on **committing action + ≥N unresolved
  material red flags**, cites transcript evidence + the absent gate, bounded by the
  **five fairness rules** (§3.8): decline-safe, develop-safe, resolved-flags-cleared,
  clean-sign-protected, attorney-override-closes.

### 4.6 TRACK B — rep behavior (retain v1, fix B1 — D6)
Keep the six **critical-fail scans** (SOL/UPL/guaranteed-outcome/represented-caller/
hostile/adverse-statement — all genuinely good), the **empathy rubric** (OARS/
orienting/pacing — evidence-based), the **speed-to-lead** emphasis, and
evidence-or-it-didn't-happen. **Fix B1:** e-sign-on-first-call = 100 ONLY when
Track-A facts are clean; on a red-flag profile the 100-point behavior is
**develop-or-decline with a specific next step**, scored equally. **Reframe E2**
("how did you hear about us") as ops-only, not a client-service behavior (D9).

### 4.7 Confidence + "needs development" lane (ICD-203 — §3.6.5)
Every Track-A output carries a **separate `confidence`** (data-completeness ×
factor-agreement). Any low-confidence → `develop` / attorney-judgment, never a
forced take/decline. Communicate in a fixed likelihood ladder, never a bare point
score. Distinguish `call_observable` facts from `requires_development` facts (§3.1
latency) — never score the transcript as if it were the file.

### 4.8 Validation loop (the actuarial precondition — §3.6.4)
Not shippable as "actuarial" without it: follow every scored case to disposition,
back-test (**Brier** headline, **QWK** for drift, **calibration curves** per band
recalibrated quarterly), anchor bands to the firm's **own realized base rates**,
grade the model on the true target — **realized net-per-case / profitable
inventory** — NOT sign-rate (Goodhart). Log attorney overrides + outcomes.

### 4.9 The GOLD calibration set (D8) — DRAFTED
Full six-example v2 gold set staged in **`ops/drafts/engine-v2-gold-examples.md`**
(not installed in `scoring/` — frozen). Contains the four cases v1 never tested:
correct **decline** (Prop 213), correct **develop**, correct **refer-out** (CRPC
1.5.1 med-mal), **over-conversion** (`questionable_sign`), plus a clean sign and a
genuine lost trucking case — and the re-score of v1's golds showing both alerts are
disposition-gated (context-dependent), not mechanical. Original requirement below:
Add a calibration anchor v1 has never been tested against: **a marginal min-limits
/ low-PD soft-tissue (or uninsured-dog, or non-catastrophic med-mal) case that
intake correctly develops-then-defers or declines/refers — scored WELL.** Re-score
the three existing golds under v2 (esp. gold-2's e-sign-on-call 94 and gold-1's
"$45k lost" → should become a *conditional/appropriate* score, not an automatic
under-conversion penalty).

---

## 4bis. WAVE 2 — ADVERSARIAL REVISIONS (these SUPERSEDE parts of §4 above)

A defense-lawyer + trial-lawyer adversarial pass produced the sharpest finding of
the whole project and it forces real changes. **Central indictment: the engine
outputs its most AUTHORITATIVE signals exactly where its INPUTS are weakest.**
Coverage (30%) + liability (22%) = 52% of the model, and both are the *least*
reliably extractable from a first intake call (defendant limits are unknown pre-suit;
a comparative-fault % from a lay narrative is "astrology"; degenerative-vs-traumatic
is on an MRI that doesn't exist yet). That is v1's false-precision sin with a bigger
multiplier. Meehl only holds when predictors are *reliably measured* (Dawes-Faust-
Meehl 1989) — garbage in, actuarially-laundered garbage out. Four P0 changes:

**P0-1 — KILL the intake dollar output.** Remove `value_at_stake` as a displayed
number/band at intake. Multiplying five soft priors and subtracting two semi-knowns
yields a false decimal tail; a band wide enough to be honest ("$8k–$340k") is an
admission the engine has no idea. Replace with a **coarse tier label**
(gate-clear / needs-records / adverse-signal) + "value not estimable pre-records."
Keep the formula INTERNAL as an ordering heuristic only, never surfaced as dollars.
(This ALSO resolves the compliance risk of a non-lawyer tool emitting case-value —
see §5.) *Supersedes §4.4's dollar output at intake. NOTE: the desk/statement dollar
figures are a SEPARATE, post-outcome product surface and are unaffected.*

**P0-2 — Gate ONLY on legally-determinable facts, never on narrative inferences.**
No dimension the call can't reliably measure may carry a HARD GATE. Legitimate gates
(legally determinable): **Prop 213** (uninsured claimant — a status the caller
states), **med-mal-without-economic-loss** (a MICRA/AB 35 legal cap), **an expired
or imminent deadline** (from a stated incident date + defendant type). ILLEGITIMATE
gates (narrative guesses) → demote to **investigation FLAGS, not gates**: coverage
adequacy / defendant limits (unknown by default → triggers records/limits work),
comparative-fault %, injury severity/objectivity, causation-integrity. *Supersedes
§4.2's hard-cap list: coverage & liability become heavy FLAGS that route to
investigate, not gates that can auto-decline.*

**P0-3 — DELETE the per-staffer `questionable_sign` flag.** Three fatal problems:
(a) surveillance dynamic that kills staff adoption (the intake-staff research);
(b) defamation/employment exposure (a written imputation of incompetence);
(c) **discoverable party-admission** (Evid. Code §1220) — a timestamped business
record of the firm judging its own signed case substandard, usable by a later
malpractice/fee/bad-faith adversary. Replace with an **anonymized, aggregate,
monthly calibration report** ("sign rate on min-limits soft-tissue rose 18% — spot
check"), work-product-framed, retention-limited, never tied to a named person or a
specific signed case. *Supersedes §3.8/§4.5's per-case over-conversion alert — keep
the SIGNAL, move it to aggregate + privilege.*

**P0-4 — Collapse the four-valued output; give every non-decline an OWNER + a
CLOCK.** The unowned "develop" lane is a malpractice generator — the modal outcome
becomes a graveyard where the CCP §335.1 clock runs unwatched. Replace with
**`sign-and-investigate` vs `decline`** (refer_out = a sub-type of decline); anything
not declined gets an owner and an **SOL-anchored tickle date**. This also matches the
trial-lawyer truth: for most viable cases the right call is "sign and investigate,"
not score-then-maybe-sign. *Supersedes §4.1's free-floating develop state.*

**P1 revisions:** (a) every extracted dimension carries an **observability tag**
(observed-on-call / inferred / unknown); any disposition resting on inferred/unknown
must show it (this is the real Meehl discipline — reliability tagging is what makes
the actuarial claim legitimate, not cosmetic). (b) **Posture is per-case-type, not a
global firm toggle** (a firm is selective on soft-tissue MVAs and volume on
clear-liability rear-enders; and most small firms are opportunistic by cash flow).
(c) **Attach NO staff-performance metric to engine outputs** until the outcome loop
has ≥1 real cycle; until then the engine ships as an **investigation/triage
CHECKLIST that coaches better qualification**, not a scorer — which is honestly all
the call data supports.

**The reframe that survives the critique:** v2 is not an actuarial case-*value*
oracle at intake. It is a **triage + investigation-checklist aid** that (1) reliably
classifies case TYPE and its pivotal missing questions, (2) flags legally-determinable
gates (Prop 213, deadlines, out-of-scope), (3) surfaces the disqualifying questions
the rep should have asked (coverage, priors, insured status), (4) recommends
sign-and-investigate vs decline/refer with an honest confidence + observability tag,
and (5) NEVER prints a case-value dollar figure at intake. The actuarial value model
is a BACK-OFFICE, outcome-validated layer that earns its authority only after a real
outcome loop — not a front-line intake pronouncement. "The tool's authority must
never exceed its accuracy."

---

## 4ter. EXTRACTION BACKBONE — what the engine may actually SCORE (Wave 2)

Governing invariant (compliance §IV "no citation, no claim" + §VIII): **a signal's
ABSENCE from the transcript is never evidence of its negative state.** Silence on
priors ≠ "no priors"; silence on fault ≠ clean liability. These map to `unknown`,
which is **visibly distinct from `absent`** in the data model. This single rule is
what stops the engine from committing v1's false-precision sin.

**Every extracted field carries: {value, citation_span, speaker, confidence,
observability ∈ observed_on_call | inferred | unknown | not_on_call}.**

**TIER 1 — the SCORING BACKBONE (decisive AND reliably on the call — score with a
cited span):**
1. **Case type** (reliably volunteered in first 60s) — emit **multi-label**
   (primary+secondary; never force one bucket on hybrids like rideshare=auto+app).
2. **Mechanism / liability ARCHETYPE** — rear-end/red-light are decisive + explicit;
   disputed/unwitnessed variants **demote to develop** (the one-sided call hides the
   dispute).
3. **Incident date** — SOL / gov six-month clock; the single most consequential
   time-sensitive fact; pin exact date via follow-up when vague/near a boundary.
4. **Rep committing action** (e-sign sent / hard push) and **rep verified-or-routed**
   (ordered report / verified coverage / routed to develop) — fully on-call, the
   engine's *coaching* backbone (note: "sent ≠ signed," "promised ≠ performed").
5. **Stated injury severity/objectivity** — claimed fracture/surgery/imaging anchors
   are reliable enough to TIER (verification deferred to records).

**TIER 2 (reliable, lower weight):** property-damage words, treatment
immediacy/provider, police-report existence — captured as *quote-tier* stated value,
not measurements.

**BELOW THE LINE — decisive but UNRELIABLE → route to develop, DO NOT SCORE:**
comparative-fault as an absence, pre-existing/prior injury (the single most
under-disclosed field — never score "no priors" from silence), policy limits
(NOT-ON-CALL — defendant limits unknowable pre-suit), lien exposure (NOT-ON-CALL),
Prop 213 insured-status when unanchored, rideshare-app/gov scope, retained-elsewhere
when ambiguous.

**Client credibility is QUARANTINED entirely — no score.** LLMs manufacture the most
false precision here, and accent/dialect/**ESL/Spanish-intake** speech patterns +
diarization noise get misread as "low credibility" — a bias/fairness hazard
(compliance §VI). At most, flag *specific cited internal contradictions* (span A vs
span B) as neutral observations for human review. (This DROPS `client_reliability`
from §4.2's scored dimensions.)

**THE TOOL'S HIGHER-VALUE MOVE — a FOLLOW-UP-QUESTION COACH, not a guesser.** When a
decisive signal is missing/ambiguous, emit a rep-facing follow-up prompt instead of
inventing the datum — and distinguish "rep asked and got X" from "rep never asked"
(itself a coaching finding). The follow-up set: priors ("ever injured this same body
part / prior claim?"), exact incident date, citation ("ticket, to whom?"),
independent witnesses + contact, **Prop 213** ("were YOU insured that day?"),
defendant scope/rideshare ("working / logged into the app?"), coverage ("did they
have insurance; do you carry UM?"), treatment gap/lien, MIST guard ("drivable? airbags?
towed?"), retained-elsewhere. Comparative fault is NOT a scripted question (don't
coach reps to carelessly elicit self-blame) — flag internally only when an admission
span exists.

**Diarization / short-call guards:** speaker mislabeling inverts fault/rep-action
signals → require a speaker-tagged span, suppress those signals on low diarization
confidence/cross-talk. A <2-min call or voicemail legitimately yields mostly
`unknown` + a big follow-up set — treat **call length as a coverage variable, never
penalize the case for thin data** (that would manufacture false precision). Spanish/
bilingual intake is scored at the SAME reliability bar (fairness).

**Net effect:** the engine grades what was actually said (case type, archetype, date,
rep actions, claimed injury), surfaces what should have been asked, and structurally
CANNOT score what only post-intake investigation can know. This is the honest core
that survives the adversarial critique.

---

## 4quater. COMPLIANCE / ETHICS RISK REGISTER (Wave 2 — routes to YANG, §VII)

A CA legal-ethics pre-review (NOT a sign-off) independently confirms every
adversarial P0 from a legal-risk angle and lands on ONE master guardrail. Anything
novel here is a hard §VII gate → Yang before ship.

**THE THREE NON-NEGOTIABLE GUARDRAILS (all must hold to be shippable):**
1. **NO TERMINAL OUTPUTS — EVER.** Every v2 output (select / decline / value / deadline)
   is a confidence-tiered *signal a licensed lawyer must affirmatively review, ratify,
   or override*, with the human decision LOGGED. The system never auto-declines,
   auto-values, or asserts a controlling deadline. This single rule answers UPL (R1),
   reliance-malpractice (R2), Rule 5.4(c) independence (R5), AND the **May 2026
   proposed CA Rule 1.1 amendment** (a lawyer "must independently review, verify, and
   exercise professional judgment regarding any [AI] output") — so "no terminal
   output" is where CA law is *heading*, not just prudent.
2. **Deadlines are GENERIC REMINDERS, never computed authoritative dates; Intake QA is
   never the system of record.** Category-level "a short pre-suit window may apply —
   confirm the governing clock and docket independently" + mandatory firm-acknowledgment
   UX + disclaimer of reliance. A *computed* date applied to the matter's facts is the
   highest-UPL, highest-consequence output (an SOL miss is per se malpractice). Ship
   only de-specified, or defer.
3. **No conclusory, durable, individually-attributed adverse records; dollars never
   leak past the engine.** The over-conversion signal is evidence-anchored,
   forward-looking coaching with a SHORT TTL — no "signed a dog / over-converted"
   labels, no named-employee blame (→ aggregate, per P0-3). Any case-value output is
   walled off from every client-facing and marketing surface.

**Risk register (severity / hard-STOP→Yang):**
- **R1 UPL** — non-lawyer tool recommending take/decline + flagging deadlines edges
  toward "practice of law" (B&P §6125-6126; *Reynoso*/petition-preparer line; COPRAC
  GenAI Guidance; ABA Op. 512 "no abdication of professional judgment"). *High;
  deadline-flags Critical. STOP.*
- **R2 Reliance-malpractice / Rule 1.18** — firm following an auto-decline on a
  meritorious case; duty to prospective client. *High. STOP (bless the no-auto-decline
  rule).*
- **R3 `questionable_sign` = discoverable party-admission** (Evid. Code §1220; CCP
  §2017.010; work-product §2018.030 DOUBTFUL for a non-lawyer vendor record) usable by
  a later malpractice/fee/bad-faith adversary + employment/defamation. *High. STOP
  (retention schedule + label wording).*
- **R4 Case-VALUE dollars** — (a) discoverable admission of value, (b) reads as vendor
  "valuing a claim" (UPL-adjacent), (c) Rule 7.1 landmine if it migrates to marketing.
  *Critical. STOP.*
- **R5 Rule 5.4(c) independence / capping (SB 37, proposed §6153 PRA up to $100k)** —
  a non-lawyer steering the caseload; today NOT triggered (flat-fee, steers within the
  firm's own book, not to a lawyer for a fee) — **but a MONETIZED refer-out lights up
  §6152/SB 37.** *Medium (High if refer-out monetized). STOP only if monetized.*
- **R6 Deadline flag WRONG** — highest-consequence error mode (SOL miss = per se
  malpractice). *Critical. STOP — ship generic-reminder form only or defer.*
- **R7 Shifting CA AI rules** — proposed Rule 1.1/1.4/5.1/5.3 amendments require
  independent verification + firm AI governance; design so the firm's USE *satisfies*
  the coming rules (never a public compliance claim pre-Yang). *Medium-High.*

**VERDICT ON DOLLARS-AT-INTAKE: do NOT ship dollar figures. Ship a relative
priority/value TIER with driving factors.** A specific band on a specific matter is a
discoverable admission + UPL-adjacent + a 7.1 landmine, for marginal utility over a
tier. (Converges exactly with adversarial P0-1.) **This whole feature is NOT
clear-to-ship; the advisory-only / no-terminal-output / tier-not-dollars /
generic-reminder-not-dates design is the plausibly-shippable path — Yang's call.**

---

## 4quinquies. CA-LAW VERIFICATION — corrections to encode (Wave 2)

An independent CA-law fact-check (primary sources: leginfo, eCFR, State Bar, Justia)
verified the design's law. 8 of 13 claims VERIFIED as-is; 5 PARTLY-RIGHT with the
corrections below. **Three are product-logic-critical:**

1. **PROP 213 (Civ. §3333.4) — get the split EXACTLY right (a genuine mispricing
   risk):** an uninsured owner/operator or DUI-convicted driver loses **NON-economic
   damages ONLY**; **economic damages are ALWAYS recoverable** (so a $60k soft-tissue
   case collapses to ~$8k *economic*, not to $0). Precision: **§3333.4(c) is a DUI
   RESTORATION** exception — it *restores* non-economic damages to the uninsured owner
   injured by a DUI-convicted driver (not "economic where DUI"). **§3333.3 is a
   SEPARATE felony bar** — bars *all* damages where plaintiff's own felony (convicted)
   proximately caused the injury; not the uninsured-motorist rule. Exceptions to the
   §3333.4 bar: passengers, non-owners. (Our §3.2/§3.4 synthesis stated the non-econ
   bar correctly; encode the §3333.4(c)/§3333.3 precision + exceptions in the rubric.)
2. **RIDESHARE / SB 371:** tiers correct (P1 $50k/$100k/$30k contingent; P2–3 **$1M
   primary liability**) but cite is **Pub. Util. Code §5433 ONLY (§5440 is wrong** —
   it's WAV access). **SB 371, eff. Jan 1 2026, cut on-trip UM/UIM from $1M to
   $60k/person / $300k/incident** and made the TNC solely responsible — it did NOT
   change the $1M primary liability. (Fresh change → easy to go stale.)
3. **AUTO MIN LIMITS:** numbers/dates right (15/30/5 → **30/60/15 for policies
   issued/renewed on-or-after Jan 1 2025** → 50/100/25 on-or-after Jan 1 2035, SB 1107)
   but the dollar floor lives in **Veh. Code §16056** (NOT "Ins. Code §11580.1b" which
   doesn't exist); keys off issuance/renewal date, not mid-term.

**Other corrections:** MICRA/AB 35 schedule confirmed ($350k/$500k from 2023, +$40k/
+$50k per year to **$750k/$1M on Jan 1 2033**, then 2% annual from 2034; up to 3 caps;
§6146 fee tiers 25%/33⅓%; §340.5 + §364). Dram shop: **Cory v. Shierloh (1981)
*upheld* the immunity statutes (not "reinstated")**; the social-host minor exception is
**Civ. §1714(d)** (not b/c) and triggers on furnishing to someone **under 21 at one's
residence — the trigger is AGE, not obvious intoxication** (that's the §25602.1
*commercial-licensee* trigger). Trucking: $750k general freight at **49 CFR §387.9**
(hazmat ladder $1M/$5M); MCS-90 form at §387.15. VERIFIED as-written: Howell/Corenbaum/
Pebley trilogy (the medical-damages backbone — lock it down), MICRA, Gov Claims Act,
Li pure-comparative, dog-bite §3342/Uccello, CRPC 1.5.1 pure referral fee, CCP §998 +
**Madrigal v. Hyundai (2025) 17 Cal.5th 480** (§998 shifting applies to pre-trial
settlements), premises (Ortega/Huckey/Ann M./Delgado).

**Action:** the v0.2 consolidated spec + gold examples must carry the corrected Prop
213 split, the SB 371 rideshare numbers, and the Veh §16056 cite. All statute
citations get a "verify-against-current-code" note (law drifts; SB 371 and SB 1107
are live-moving).

---

## 5. OPEN QUESTIONS FOR ALI / YANG (accumulating)

**Hard §VII STOPs (must clear Yang before any ship) — from §4quater:** R1 deadline
flags (generic-reminder form only, or defer); R2 no-terminal-auto-decline rule; R3
over-conversion retention schedule + label wording; R4 dollars-at-intake (verdict:
DON'T — ship a tier); R6 deadline-wrong error mode. R5 (capping) only if refer-out is
ever monetized.

**Decisions for Ali:**
- Confirm v2 is a "lift the freeze deliberately" decision, not a silent edit — AND
  that it ships in the **advisory-only, no-terminal-output, tier-not-dollars** form
  the two Wave-2 reviews converged on (both the adversarial and compliance passes
  independently killed dollars-at-intake and the auto-decline).
- Posture is **per-case-type, not a global firm toggle** (P1 revision) — confirm the
  beta default (selective on soft-tissue MVAs; the config tunes per type from the
  firm's own outcome data once the loop has data).
- Ship gating: **the engine ships first as an investigation/qualification CHECKLIST +
  follow-up-question coach with NO staff-performance metric attached, until the
  outcome-validation loop has ≥1 real cycle** (Goodhart guard). The full actuarial
  value model is a back-office, outcome-validated layer earned later.
- The over-conversion signal moves to **aggregate + short-TTL + work-product framing**
  (never per-named-staffer, never a durable "signed a dog" record).

**Resolved by Wave 2 (no longer open):** the case-VALUE-in-dollars question (answer:
tier, not dollars); the per-staffer alert question (answer: aggregate/privileged);
the "gate on narrative inferences" question (answer: gate only on legally-determinable
facts). Client-credibility scoring is DROPPED (bias/fairness).
