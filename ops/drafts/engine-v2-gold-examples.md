# Engine v2 — Triage-First Calibration Gold Set (DRAFT, staged for review)

> **STATUS: DESIGN DRAFT. NOT installed in `scoring/`.** The engine is FROZEN per
> CLAUDE.md; `scoring/gold-example-{1,2,3}.md` are calibrated and fixed. This is the
> proposed v2 calibration set — promote into the engine only as part of a reviewed
> "engine v2" ship (Ali + PI-attorney + Yang, §VII). Companion to
> `engine-v2-triage-design.md`. Written against the same Meridian Injury Law config
> and evidence-quote discipline as the v1 golds.

**Firm config (all six):** `case_types_accepted: mva_standard, mva_commercial,
motorcycle, premises, dog_bite` · `case_types_declined: med_mal, workers_comp,
government_entity` · `esign_on_call_enabled: true` · `same_call_sign_policy:
encouraged` · fees: mva_standard $12k / mva_commercial $45k / premises $18k /
dog_bite $10k.

**v2 schema:** `disposition ∈ {sign_now, develop, refer_out, decline}`; seven
case-quality dimensions each read ∈ {strong, adequate, thin, unknown, fatal}; binary
**hard gates** can force a disposition; `confidence_tier ∈ {high, medium, low}`
(tracks intake-verified vs caller-volunteered/unknown); two behavioral alerts —
`questionable_sign` and `lost_signable_case`. **Core principle: the "did the rep
behave well?" judgment is made AGAINST the disposition the case actually deserved —
closing is neither automatically good nor automatically required. `value_at_stake` is
a BAND, and per the compliance review it surfaces to the firm as a value TIER, not a
dollar figure, at intake.**

---

### GOLD 1 — The Clean Sign (fast e-sign = CORRECT; no alert)
Rear-ended stopped at a metering light by a **Roto-Rooter commercial van**, CHP cited
the other driver (21703 CVC), report #; same-night ER + CT, MRI-confirmed **C5-6
herniation**, ortho scheduled epidural → possible fusion; 3 weeks out of work; caller
insured. Rep confirms commercial logo + citation + MD-directed care + caller's own
coverage, explains fee/costs, e-signs on call.
→ `disposition: sign_now`. coverage **strong** (commercial policy $750k–$1M),
liability **strong**, damages **strong** (imaging + surgical), causation **strong**
(no gap), treatment **strong**, headroom **strong**, client **adequate**. Gates: none.
confidence **high**. `questionable_sign: false`, `lost_signable_case: false`.
**Anchor:** fast e-sign is right *when the quality reads justify it*.

### GOLD 2 — The Signed Dog / Over-Conversion (`questionable_sign` FIRES)
"Just a tap" leaving Safeway ~2 months ago, **~$900 bumper scuff**, no police, "he had
State Farm, just the basic insurance," neck "a little sore," **no treatment (8-week
gap)**, "I'm not even sure I'm hurt?" Rep pulls no report, does not verify limits,
ignores the gap, hard-pushes: "textbook whiplash… sign while we're on the line," routes
to a solicited chiropractor. Caller signs hesitantly.
→ rep scored `sign_now`; **should have been `develop`/`decline`.** coverage **thin**
(unverified, likely 15/30 min-limits), liability **adequate** (rear-end, no report),
damages **thin** (low PD, subjective, no imaging), causation **thin** (8-wk gap),
treatment **unknown** (being manufactured), headroom **thin/negative**, client **thin**
(twice disclaims injury on a recorded line). confidence **low**. **`questionable_sign:
true`** — cites "it was just a tap … maybe nine hundred bucks," "just the basic
insurance," "I'm not even sure I'm hurt?", the unaddressed gap, the absent limits/report
gates. **Anchor:** identical aggressive-close behavior to GOLD 1, opposite verdict —
because the reads are thin. This is over-conversion.

### GOLD 3 — The Correct Develop (scored EQUAL to a clean sign; no alert)
T-boned, "I had the green, she ran the red," **independent witness** gave info, CHP
came (report ready in ~10 days, has the number), other driver insured (Mercury) **but
limits unknown**, knee wrenched + swelling, **MRI scheduled Tuesday** (possible meniscus
tear). Rep captures exact DOL, logs witness, notes report pending, flags limits
unknown-to-verify, notes MRI pending, routes to **development queue** with a specific
owned time-boxed plan: "I'll pull the CHP report the day it's ready, confirm Mercury's
limits, and call you Wednesday at 11 after your MRI — if it reads the way it sounds, we
sign that call."
→ `disposition: develop`. coverage **unknown** (appropriately — limits pending),
liability **adequate** (witness + pending report), damages **unknown→promising** (MRI
pending), causation **strong**, treatment **strong**, headroom **unknown** (gated on
limits), client **adequate**. Gates: none. confidence **high** — *in the routing, not
yet the case; unknowns are named, not papered over.* No alerts. **Anchor: a correct
`develop` is a WIN, scored every bit as high as GOLD 1's clean sign.**

### GOLD 4 — The Correct Decline, Prop 213 (hard gate; NOT lost_signable_case)
Clear-liability rear-end, other driver admitted fault, real lower-back pain, chiro 3×/wk
— **but the caller was the UNINSURED owner-operator** ("I let it lapse"). Rep confirms
uninsured status and declines gracefully with the accurate law and a legal-aid referral.
→ `disposition: decline`. liability **strong**, damages **adequate on paper** BUT
**headroom FATAL** — **`prop_213_uninsured_plaintiff` GATE FIRES** (Civ. §3333.4):
**non-economic damages barred; economic-only** (a few thousand in chiro + minimal wage
loss). confidence **high**. `questionable_sign: false`. **`lost_signable_case: false`**
— after the gate there is no signable case to lose. **Anchor:** strong liability cannot
rescue a statutorily-gutted case; v2 must NOT punish the rep with a false lost-case
alert for the correct decline. *(Law precision to encode: §3333.4 bars non-economic
ONLY; §3333.4(c) DUI-restoration + §3333.3 felony bar are separate; passengers/
non-owners excepted — per Wave-2 CA-law verification.)*

### GOLD 5 — The Refer-Out (CRPC 1.5.1; positive outcome)
4-year-old with cerebral palsy from a **birth-injury/HIE med-mal** (fetal-strip distress,
delayed emergency C-section, lifetime care) — **outside** Meridian's accepted types
(med_mal declined; expert-heavy MICRA litigation). Rep neither declines nor signs:
connects the family to a specialist med-mal firm today, warns of the child's special
deadlines, captures details for the hand-off.
→ `disposition: refer_out`. damages **strong** (lifetime-care model), headroom **strong
for a specialist / negative for a generalist** — the read that drives *refer, not
decline*. **Hard gate `case_type_not_accepted (med_mal)` FIRES → correct response is
refer, not decline** (declining would forfeit a legitimate CRPC 1.5.1 referral fee and
abandon a meritorious case). No alerts. **Anchor:** a high-value case outside firm
competence is a refer-out with a fee-division agreement + SOL caution — a positive
outcome the disposition set exists to reward.

### GOLD 6 — The Genuine Lost Signable Case (`lost_signable_case` FIRES; spoliation missed)
**Commercial semi jackknifed** across I-5 lanes (DOT # + "…Logistics" on the door), CHP
worked the scene hours, caller has had **two surgeries** (pelvic hardware + femoral rod),
still hospitalized. Rep: "let me take your name and number and someone will call you
about whether we can help." **No ask, no attorney escalation, no owned next step, and
critically no evidence-preservation** (never mentions ELD/black-box, driver logs,
spoliation letter). Caller walks.
→ rep scored `none/deferred`; **should have been `sign_now`.** coverage **strong**
(interstate carrier, $750k federal min, commonly $1M+ excess), liability
**strong→promising** (jackknife + CHP), damages **strong** (two surgeries), causation
**strong**, treatment **strong**, headroom **strong**. confidence **high**.
**`lost_signable_case: true`** — `value_at_stake` a **BAND** (~$150k–$400k fee on a
plausible $500k–$1.2M+ recovery), corrected disposition `sign_now`. **Second alert
`missed_urgency: evidence_preservation`** — trucking turns on ELD/HOS/telematics
carriers can lawfully overwrite on short cycles; the missed spoliation letter is a
value-destroying omission independent of the failed sign. **Anchor:** the single
highest-value PI call type met with "someone will call you back."

---

## Re-scoring the v1 golds under v2 (internal consistency)

- **v1 gold-2 (dog-bite, e-sign-on-call = 94):** its FACTS survive v2 cleanly (homeowner's
  coverage acknowledged, CA strict-liability §3342 broken-gate public-sidewalk bite, 14
  stitches + infection + wage loss) → v2 also lands `sign_now`, `questionable_sign:
  false`, rewards the close. The fix is that the reward is now **conditional and legible**:
  run the *same aggressive push* against GOLD 2's facts (min-limits, $900 PD, 8-wk gap,
  "not sure I'm hurt") and it trips `questionable_sign`. v2 removes the perverse lesson a
  naive reader takes from a 94 ("always push the on-call e-sign") → "push it when, and
  only when, the reads are strong."
- **v1 gold-1 ("$45,000 lost, the ask never came"):** v2 KEEPS the alert (the commercial
  box-truck case genuinely clears the sign bar) but (1) **value → a BAND/tier** (~$25k–$60k
  fee, not a false-precision point), and (2) **trigger is disposition-gated, not
  ask-gated** — no-ask is necessary-but-not-sufficient; the alert fires only when the
  reads actually cleared `sign_now`/`develop`. That is why GOLD 2 (thin reads), had the
  rep *failed* to ask, would NOT fire `lost_signable_case` — no signable case to lose.

**Net:** neither alert is mechanical. `questionable_sign` and `lost_signable_case` are
both **context-dependent on the deserved disposition** — a signature is praised or
flagged by the reads behind it; a missed sign is mourned only when a signable case
actually existed. The calibration set now contains the four cases v1 never tested: a
correct **decline** (4), a correct **develop** (3), a correct **refer-out** (5), and an
**over-conversion** (2).
