# Engine v2 — Per-Case-Type Signal Library

**Purpose.** This is the implementable signal library for the v2 triage engine: for each California plaintiff personal-injury (PI) case type it names the *disposition-flipping* signals, the exact extraction field(s) that carry them, which of the 7 dimensions / 4 gates / value-effort-carry-capital tiers each field feeds, and the threshold that flips **SIGN-NOW / DEVELOP / REFER-OUT / DECLINE-WITH-GRACE**. Every legal number carries its verified citation.

**Compliance rails preserved throughout.** No dollar figures are surfaced at intake (tiers only); no computed SOL/deadline dates (urgency **flags** only); no terminal auto-decisions (lawyer ratifies every disposition); fairness rules (unobserved ≠ negative; lay-vocabulary severity parity; deferential/apologetic speech ≠ fault admission; per-language disparate-impact audit); "no citation, no claim"; abstain rather than guess.

**How to read the wiring column.** `Dim1`=liability/comparative-fault · `Dim2`=damages credibility (Howell-aware) · `Dim3`=coverage-path adequacy · `Dim4`=collectability/deep-pocket · `Dim5`=procedural urgency · `Dim6`=client-risk markers · `Dim7`=case-type fit. Gates: `G1`=Underwater · `G2`=Malpractice-trap · `G3`=Client-risk (flag-only, never auto-declines) · `G4`=Trial-capital exposure. Every extraction field carries {value, verbatim quote span, speaker, observed-on-call vs inferred, per-fact confidence}; "unknown" is a first-class value and routes to **DEVELOP**, never to a penalty.

**Sourcing discipline.** Only confirmed / verifier-corrected claims are used below. Where a verifier overrode a researcher claim (e.g. broker liability, rideshare UM/UIM, Howell dollar figures), the corrected version is what appears here. Items I mark **[inference]** are engineering/modeling choices grounded in sourced law, not themselves sourced facts.

---

## 0. Shared statutory config (date/year-keyed constants)

These are consumed by multiple case types. **Store as dated config, never hard-coded scalars** — several are now year- or policy-date-dependent. The engine emits *tiers*, never these dollars.

| Constant | Value | Keyed on | Citation |
|---|---|---|---|
| Auto minimum liability limits (pre-2025) | 15/30/5 | policy issued/renewed **before** 1/1/2025 | [SB 1107 text (leginfo)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107) |
| Auto minimum liability limits (current) | **30/60/15** | policy issued/renewed **on/after 1/1/2025** | [SB 1107 (leginfo)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107); [FMG](https://www.fmglaw.com/insurance-4/california-increases-auto-insurance-minimums-for-the-first-time-since-1967/) |
| Auto minimum limits (future) | 50/100/25 | 1/1/2035 | [SB 1107 (leginfo)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107) |
| Rideshare 3rd-party liability, Periods 2–3 | $1,000,000 | matched/en-route/passenger-onboard, driver at fault | [AB 2293 / CDI](https://www.insurance.ca.gov/0400-news/0100-press-releases/archives/release067-15.cfm) |
| Rideshare Period-1 contingent (app-on, waiting) | $50k/$100k/$30k **+ $200k excess** | between-rides | [PUC 5433(c) via SB 371](https://jnylaw.com/blog/california-cuts-rideshare-insurance-limits-and-gives-drivers-union-rights-what-that-means-after-an-accident/) |
| Rideshare UM/UIM during active ride (pre-2026) | $1,000,000 | crash **before 1/1/2026** | [HH Law](https://www.hhlawfirm.law/uber-rideshare-insurance-changes-2026/) |
| Rideshare UM/UIM during active ride (current) | **$60k/$300k** | crash **on/after 1/1/2026**, passenger-onboard window | [SB 371 / PUC 5433(b)(2)](https://jnylaw.com/blog/california-cuts-rideshare-insurance-limits-and-gives-drivers-union-rights-what-that-means-after-an-accident/) |
| FMCSA property-carrier minimum | $750k general / $1M oil / $5M hazmat | interstate CMV > 10,001 lb | [49 CFR 387.9 (eCFR)](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387) |
| FMCSA passenger-carrier minimum | $1.5M (≤15 seats) / $5M (≥16) | 49 CFR 387.33 | [eCFR Part 387](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387) |
| MICRA non-economic cap (2026) | **$470k injury / $650k death** | **year of resolution** | [Nolo](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html); [Milliman (AB 35)](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps) |
| MICRA escalation | +$40k/yr injury, +$50k/yr death → $750k/$1M (2033), then +2%/yr | Civ. Code 3333.2 as amended by AB 35 | [gov.ca.gov (AB 35)](https://www.gov.ca.gov/2022/05/23/governor-newsom-signs-legislation-to-modernize-californias-medical-malpractice-system/) |
| Limited-civil jurisdiction ceiling | **$35,000** | eff. 1/1/2024 (AB 2347) | (AB 2347; supersedes the $25k line in the 2019 Advocate MIST article) |
| General PI / product SOL | 2 years | CCP 335.1; minors tolled to 18 (CCP 352) | [CCP 335.1 (leginfo)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=335.1&lawCode=CCP) |
| Med-mal SOL | 1 yr discovery / 3 yr injury; minor <6 → 8th birthday; **90-day notice CCP 364** | CCP 340.5 | [CCP 340.5 (leginfo)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=340.5&lawCode=CCP) |
| Government claim presentation | **6 months** from accrual | Gov. Code 911.2 | [Gov 911.2 (leginfo)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=911.2) |
| Government suit window after rejection | 6 months (or 2 yr if no compliant rejection mailed) | Gov. Code 945.6 | [Gov 945.6 (FindLaw)](https://codes.findlaw.com/ca/government-code/gov-sect-945-6/) |
| Government minor late-claim relief | mandatory to ~1 year | Gov. Code 911.4 / 946.6 | (verifier-added; corrects "hard 6-month bar for minors") |

**Cross-cutting rule (all types):** an insurance-minimum or coverage constant is selected by **policy issue/renewal date**, not calendar-today and not always loss-date — a defendant in a pre-2025 collision still legally carries 15/30. Prefer stated limits when the caller gives them; use date only as fallback proxy.

---

## 1. Auto / MVA (private passenger)

The base case. Disposition is driven by the interaction of liability clarity, objective-injury credibility, and the **coverage/lien net** — not by injury severity alone.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Clear liability (rear-end, ran red, citation, scene admission, independent video/witness) | `liability_clarity` {clear / disputed / unknown}; `police_report_exists` | Dim1 | Clear + objective injury + adequate coverage → **SIGN-NOW**. Disputed with no independent evidence → Dim1 `thin`, **DEVELOP** (pull report/witnesses). |
| Minimum-limits policy + heavy treatment | `policy_bi_per_person`, `at_minimum_limits` (derived), `treatment_intensity` | Dim3, **G1** | Post-2025 min-limits floor is **$30k**, not $15k. Min-limits + heavy treatment/liens → G1 review; only *confirmed* liens ≈/> net limits fires G1, else DEVELOP. |
| At-fault party uninsured/underinsured | `defendant_insured`, `claimant_own_UM_UIM_limit`, `defendant_liability_limit` | Dim3, Dim4, **G1** | Valid liability + real injury + **no defendant coverage + claimant has UM** → **DEVELOP** (UM claim). No UM either → **DECLINE-WITH-GRACE**. UM/UIM is **non-stacking, offset-based** — realistic coverage = max(defendant, UIM) minus offset, never the sum ([Ins. Code 11580.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=11580.2.)). |
| MIST profile (minimal property damage + soft-tissue only) | `property_damage_severity`, `injury_type`, `occupant_body_position`, `symptom_onset_timing`, `prior_condition_same_body_part` | Dim2, value/effort tier, posture | Minimal PD + soft-tissue-only → Dim2 `thin`; low-value/high-effort. Under limited-civil (**<$35k**) → volume posture: DEVELOP; selective posture: DECLINE-WITH-GRACE or REFER-OUT. Never let low PD alone trip a gate — 2.49 mph rear-enders can injure ([Trial Guides](https://www.trialguides.com/blogs/news/important-new-study-clarifies-science-of-minor-impact-or-mist-cases)). |
| Objective findings / surgery | `objective_diagnostic_findings`, `surgery_performed_or_recommended`, `permanency_indicator` | Dim2, value tier | Objective findings present → Dim2 `adequate/strong`, up-tier value. Mirrors Colossus "demonstrable > nondemonstrable" ([Nolo/Colossus](https://www.nolo.com/legal-encyclopedia/how-the-colossus-computer-program-estimates-accident-settlement-values.html)). |
| Treatment gap / delayed first treatment | `days_incident_to_first_treatment`, `any_treatment_gap_over_30_days`, `gap_explained` | Dim2 | First treatment >1 week or >30-day gap → Dim2 toward `thin` **absent a cited explanation**. Unexplained gap = DEVELOP action (capture reason), never a G3/fairness path. |
| Uninsured plaintiff-driver (Prop 213) | see **§12 Prop-213 module** | **G1**, Dim2 | Guts non-economic value → economic-only. Passengers exempt; DUI-conviction exception restores. Flag-only, never auto-decline. |
| DUI defendant | `defendant_intoxicated_or_DUI` | Dim1 (heavy, unconditional); punitive value **only** via §13 gate | Near-certain liability. Punitive *value* is contingent on collectability — do **not** bump value tier against a bare-insurance individual. |

**Key numbers:** BJS-style relative ladder seeds auto default **value tier T1**, `dog_rate ≈ 0.35` for min-limits soft-tissue, settle_prob ≈ 0.95 ([BJS](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005); [IRC](https://insurance-research.org/news/study-finds-more-auto-injury-claimants-are-hiring-attorneys)). All dollar bands are *published priors, not this firm's* — flag for flywheel replacement.

---

## 2. Rideshare (TNC — Uber/Lyft)

**The single most important 2026 recalibration.** Rideshare value must branch on **(a) app period** and **(b) who is at fault**, not on "was it a rideshare."

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| App period (master switch) | `rideshare_period` {off / on_waiting / enroute_or_passenger / unknown} | Dim3, value tier | Period 1 → thin coverage (treat like a min-limits case; candidate G1 on serious injury). Periods 2–3 → **$1M** third-party liability available. **Period unknown → DEVELOP (ask), never tier on assumption.** |
| Who is at fault | `at_fault_party` {rideshare_driver / third_party / disputed} | Dim3, value tier | The $1M liability applies **only when the rideshare driver is at fault**. If an uninsured/underinsured **third party** hit the rideshare, recovery flips to the UM/UIM layer. |
| Crash date (UM/UIM cliff) | `crash_date` | Dim3, **G1** | Passenger + uninsured third-party tortfeasor + **crash on/after 1/1/2026** → UM/UIM capped at **$60k/$300k** ([SB 371 / PUC 5433(b)(2)](https://jnylaw.com/blog/california-cuts-rideshare-insurance-limits-and-gives-drivers-union-rights-what-that-means-after-an-accident/)), a ~94% cut from the legacy $1M — can drop a serious-injury case from high tier to modest and trip G1. Pre-1/1/2026 crashes keep $1M. |
| Between-rides floor | `rideshare_period=on_waiting` | Dim3 | Period-1 floor is modestly higher than legacy min-limits: $50k/$100k/$30k **+ $200k excess layer** ([PUC 5433(c)](https://flexibleworknews.com/stories/675631511-california-passes-sb-371-and-ab-1340-reforming-rideshare-insurance-and-worker-rights)). |

**Net effect:** a rideshare passenger with a serious injury, hit by an uninsured driver, on a post-2026 crash, is now a **DEVELOP/modest-tier** case (UM/UIM $60k/$300k), whereas the same facts pre-2026 were high-tier ($1M). The engine must never carry the stale "rideshare = $1M" prior.

---

## 3. Trucking / commercial motor vehicle

Distinguished by **federal coverage floors, layered corporate defendants, and acute spoliation urgency**. High value, high capital — the classic in-house-vs-refer decision.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Commercial-truck identity | `vehicle_is_commercial_truck`, `cargo_type` {general/hazmat/passenger}, `estimated_gvw_over_10001` | Dim4, Dim7, value tier | Sets coverage-path **floor** at FMCSA minimum: **$750k** general / $1M oil / **$5M hazmat** ([49 CFR 387.9](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387)); passenger carrier $1.5M/$5M (387.33). Dwarfs the $30/60 auto floor → up-tier value, Dim4 `strong`. |
| ELD/dashcam evidence at risk | `commercial_truck_evidence_present` (ELD/dashcam/logs mentioned) | Dim5 **urgency flag**, decision table | Fire **`spoliation-letter-needed`** flag whenever `vehicle_is_commercial_truck`=true. **CRITICAL latency:** looping in-cab dashcam overwrites in **1–3 days**, telematics ~30 days, ELD retained ~6 months ([FMCSA ELD](https://eld.fmcsa.dot.gov/); [LHL Law](https://www.lhllaw.com/insights/trucking-company-spoliation-letters)). This pushes a viable truck case to **SIGN-NOW / immediate in-house action** over slow DEVELOP; refer-out delay risks spoliation. Flag only, no computed date. |
| Layered defendants | `employer_carrier_identified`, `broker_or_shipper_mentioned`, `driver_on_the_job` | Dim4 | Carrier (respondeat superior) + **broker/shipper negligent-selection** → Dim4 `strong`. **Broker liability is now settled law:** *Montgomery v. Caribe Transport II* (U.S. May 14 2026, No. 24-1238) unanimously held the FAAAA safety exception preserves state negligent-hiring/selection claims against freight brokers nationwide — **supersedes** *Miller v. C.H. Robinson* and the CA Superior Court split. Treat broker as a real collectability factor, not a contested upside. |
| Trial-capital load | `expert_load_estimate` [inference], firm posture config | **G4**, carry/capital tier | High limits + corporate defense + reconstruction/biomechanical experts. For a 1–5 attorney firm: high-limit truck case **+ thin firm capital → REFER-OUT-WITH-FEE** (strong-referral note) even though value tier is high. Net-fee-per-attorney-hour must reflect the higher effort denominator, not just gross value. |

**Capital reality (denominator):** trucking/catastrophic expert strategy runs ~$150k–$300k+, individual experts $50k+ ([Block O'Toole](https://www.blockotoole.com/truck-accidents/)) — top capital tier; primary trigger of the REFER-OUT branch when projected advance exceeds the firm's configured `capital_ceiling`.

---

## 4. Premises liability

Liability lives or dies on **notice**, and the subtype changes the proof elements. Branch premises into distinct extraction paths.

### Subtypes & disposition-flipping signals
| Subtype | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| **Transitory hazard** (spill/debris) | `hazard_origin` {self-created / transitory-third-party / structural}, `last_inspection_interval_evidence`, `time_on_floor_evidence` | Dim1 | Transitory + **no notice/inspection-gap evidence** → `thin` (jury needs constructive-notice inference via last-inspection interval, [Ortega v. Kmart (2001) 26 Cal.4th 1200](https://law.justia.com/cases/california/supreme-court/4th/26/1200.html); [CACI 1011](https://www.justia.com/trials-litigation/docs/caci/1000/1011/)). **Absence of inspection records is itself a pro-plaintiff signal.** Employee-created or documented long gap → `adequate/strong`. |
| **Mode-of-operation guardrail** | (derived from venue = self-service retail) | Dim1 | Do **not** auto-upgrade a grocery/self-service slip-fall to `strong` merely for high-traffic model — [*Moore v. Wal-Mart* (2003) 111 Cal.App.4th 472](https://plaintiffmagazine.com/recent-issues/item/notice-in-premises-liability-actions) followed Ortega and kept the notice element. Mode-of-operation shifts one notch at most, never substitutes for notice. |
| **Sidewalk/walkway trip-fall** | `defect_height_estimate`, `aggravating_conditions[]` (grease/water/lighting/obstruction/clustered/distraction) | Dim1, decision table | Height **<~1.5 in.** AND zero aggravators → `thin`, **DEVELOP** (photos/measurements/lighting); if aggravators still absent after development → DECLINE-WITH-GRACE. **Never treat height alone as fatal** — a ~1 in. clustered-defect case survived summary judgment ([*Stathoulis v. Montebello* (2008) 164 Cal.App.4th 559](https://plaintiffmagazine.com/recent-issues/item/get-your-sidewalk-fall-case-to-the-jury-beat-the-trivial-defect-defense)). |
| **Open-and-obvious modifier** | `hazard_open_and_obvious`, `necessity_to_encounter` | Dim1 (modifier, not gate) | Open-obvious + no necessity → `thin`; open-obvious **but** necessity-to-encounter cited → hold anchor ([Rowland v. Christian (1968) 69 Cal.2d 108](https://law.justia.com/cases/california/supreme-court/2d/69/108.html)). |
| **Negligent security** (3rd-party crime) | `prior_similar_incidents_on_property`, `requested_security_measure_burden` {low=call police / high=guards} | Dim1, decision table | High-burden duty (guards) sought + prior-similars **absent** → `thin`, DEVELOP (crime-grid/PD records) or REFER-OUT to specialist ([Ann M. (1993) 6 Cal.4th 666; Delgado (2005) 36 Cal.4th 224](https://plaintiffmagazine.com/recent-issues/item/premises-liability-cases-involving-third-party-criminal-conduct)). **Fairness:** the foreseeability inquiry keys on prior *property* crime history, never the victim's demographics/presence-reason. |
| **Public-entity premises** | `defendant_is_public_entity` | Dim5, **G2**, Dim4 | See **§8**. Collapses SOL to 6 months (Gov 911.2) **and** adds the entity's own notice element ([Gov. Code 835/835.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=835.&lawCode=GOV)). |

**Base rate:** premises seed liability-win prior ≈ **0.39** (BJS) → a premises case with thin notice facts defaults to **DEVELOP, not SIGN-NOW**; value default T1–T2, `dog_rate ≈ 0.40` for premises soft-tissue.

---

## 5. Dog bite

Liability is easy under strict liability; **collectability is the decisive axis.**

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Bite + lawful presence | `injury_mechanism` {bite/knockdown/scratch/other}, `victim_location` {public/lawful-private/trespass}, `provocation_evidence` | Dim1, Dim7 | **Bite + lawful presence + no provocation → `strong`** (strict liability, [Civ. Code 3342](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3342.&lawCode=CIV); [CACI 463](https://www.justia.com/trials-litigation/docs/caci/400/463/)) → SIGN-NOW-eligible on liability. **Knockdown/scratch/trespass** falls out of 3342 → negligence/scienter, `adequate/thin` → DEVELOP at best. |
| Coverage / collectability | `owner_housing_status` {homeowner/renter/neither}, `bite_location_on_owner_premises`, `dog_breed`, `prior_bite_or_aggression_history` | Dim3, Dim4, **G1** | Homeowner/renter policy typically $100k–$300k but watch **breed exclusions, prior-aggression exclusions, ~$25k animal sublimits, on-premises-only limits** ([Arash Law](https://arashlaw.com/homeowners-insurance-and-dog-bite-claims-in-california/)). No identifiable policy OR off-premises renter bite OR excluded breed with no other defendant → Dim4 `thin`; heavy treatment vs judgment-proof owner → **DECLINE-WITH-GRACE / REFER**. |
| Landlord backstop | `landlord_actual_knowledge_evidence` (prior bites/complaints/Animal-Services records) | Dim4 | Landlord counts toward collectability **only if actual pre-attack knowledge + control** is cited ([Uccello (1975) 44 Cal.App.3d 504; Yuzon (2004) 116 Cal.App.4th 149](https://www.helbocklaw.com/landlord-liability-for-tenants-dogs-in-california/)) — no duty to inspect. Absent it → surface as DEVELOP action ("pull Animal Services history"), don't credit the landlord. |

**Value-tier seed:** CA leads the U.S. — **2,830 claims in 2025, avg $81,789** ([III](https://www.iii.org/article/spotlight-on-dog-bite-liability)) → seed a **mid tier (~$80k)**; require cited aggravating-damages facts (reconstructive surgery, child facial scarring, nerve damage) to move above the seed, and cap realistic recovery at any applicable sublimit.

---

## 6. Product liability

**Default REFER-OUT for a 1–5 attorney firm**, with a narrow keep-in-house exception.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Defect theory / product class | `product_defect_theory` {manufacturing/design/warning}, `product_category` {automotive/industrial-machine/everyday-consumer} | Dim7, **G4**, carry/capital tier | Design-defect + automotive/complex-machine → **default REFER-OUT** (or DEVELOP-with-co-counsel); trips G4 (six-figure expert spend, long carry — "more experts than you can imagine," [Plaintiff Mag](https://plaintiffmagazine.com/recent-issues/item/can-a-smaller-firm-handle-a-products-liability-case)). Seed base-rate prior toward REFER-OUT. |
| Keep-in-house override | `consumer_expectation_fit` {yes/no/unknown}, `in_state_seller_in_chain` {present/absent} | decision table, Dim4 | **Consumer-expectation fit = yes AND in-state seller present → allow SIGN-NOW / DEVELOP (keep).** Everyday-product failures (battery, chair, jack, blender) need no liability expert; a local CA retailer/distributor is jointly-and-severally liable for full damages (**Prop 51 does not limit strict-liability recovery**). Absent both → keep REFER-OUT default + G4 flag. |

---

## 7. Medical malpractice

Dominated by a **hard cost floor + capped non-economic recovery + short, trap-laden SOL** → default REFER-OUT for solo/small unless catastrophic + clearly meritorious.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Deviation vs bad outcome | `provider_admitted_error_or_deviation`, `known_complication_language`, `second_provider_flagged_prior_care`, `informed_consent_of_risk_discussed` | Dim1, Dim7 | Grade liability `thin/unknown` when the transcript has **only a bad outcome + distress** and no independent deviation signal — a known complication is not actionable, and CA requires expert testimony on standard of care. **Severity of outcome must not inflate the liability read** (severity-parity rail). No cited deviation → abstain. |
| MICRA cap (non-economic) | `victim_died`, `defendant_is_institution` vs `defendant_is_individual_provider` | value tier | Non-economic component capped at the **year-of-resolution** figure — for a 2026 intake resolving ~2028–2029 use the **projected** cap, not the 2026 $470k/$650k ([Nolo](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html)). **Caps STACK up to 3× (provider / institution / unaffiliated)** — extract institution-vs-individual so a hospital+physician case isn't systematically under-tiered ([Milliman](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps)). **Economic damages are uncapped** → weight economic-loss facts far more than pain/suffering. Do **not** treat the cap as a hard *total* ceiling (economic uncapped + stacking). |
| Capital floor | `expert_review_obtained`, firm posture | **G4**, carry/capital tier | Seed G4 med-mal cost-floor prior ~$30k–$50k advanced, six figures at trial ([Gilman & Bedigian](https://www.gilmanbedigian.com/costs-in-medical-malpractice-cases/)). Decision table: **REFER-OUT default** unless (a) liability/deviation strong AND (b) economic damages catastrophic. |
| SOL / 90-day-notice trap | `date_of_treatment_or_procedure`, `date_symptoms_discovered`, `patient_is_minor`/`minor_under_6`, `notice_of_intent_served` | Dim5, **G2** | CCP 340.5 (1yr discovery / 3yr injury; minor <6 → 8th birthday). A near-SOL med-mal case needs the **CCP 364 90-day notice served immediately and cannot be filed for 90 days** → SOL-adjacent + notice-not-served **escalates urgency + biases REFER-OUT** (specialist executes the mechanics). Flags only, no date math. |
| Documentation merit | `contemporaneous_documentation_supports_negligence` | Dim1, Dim2 | Med-mal `dog_rate` prior ≈ **0.70** (most claims close without payment; payment probability tracks documented merit — [Studdert NEJM 2006](https://www.nejm.org/doi/full/10.1056/NEJMsa054479); CRICO). |

**Elder-abuse carve-out:** if the theory is statutory elder/dependent-adult abuse, med-mal economics **do not** govern — see **§10**.

---

## 8. Government / public-entity

The sharpest **malpractice-trap (G2)**. A public-entity fact silently rewrites deadlines and adds liability elements.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Public-entity defendant | `defendant_is_public_entity` derived from `defendant_vehicle_is_govt` (bus/police/fire/city/school), `injury_location_public_property` (sidewalk/road/park/building), `defendant_is_public_hospital_or_employee`; lexical anchors: *Metro, MTA, city, county, school district, VA/county hospital, "government car"* | Dim5 **tightest urgency flag**, **G2** | Any hit → **6-month claim regime** ([Gov 911.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=911.2)) vs ordinary 2-yr PI. Months-old incident + public entity → **escalate immediately: SIGN-NOW-and-preserve or REFER-OUT-FAST, never slow DEVELOP.** Unknown filing status → flag as verify, not clear. |
| Claim already filed / rejection | `claim_already_filed_with_entity`, `entity_sent_rejection_letter`, `rejection_letter_date` | Dim5 sub-flag, **G2** | After a compliant written rejection, [Gov 945.6](https://codes.findlaw.com/ca/government-code/gov-sect-945-6/) starts a fresh **6-month suit clock** (2 yr if no compliant rejection mailed). Post-rejection + marginal merit = high trap exposure → REFER-OUT to a firm that can file immediately. |
| Minor claimant | `patient_is_minor` | Dim5 modifier | **Mandatory late-claim relief to ~1 year** for a minor who was a minor the entire 6-month period (Gov 911.4/946.6) — model as urgency flag + "minor: 1-yr relief may apply" sub-flag, **not** a bare 6-month CRITICAL. |
| Dangerous condition notice | `condition_duration_or_prior_complaints`, `entity_created_condition`, `condition_triviality` | Dim1 (cap at `thin` absent notice) | [Gov. Code 835/835.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=835.&lawCode=GOV) requires the entity's own actual/constructive notice (or employee-created) + a *substantial* (not trivial) defect. No notice fact → liability capped `thin/unknown` ("no citation, no claim"). |

**All urgency here is FLAG-only** and routes to DEVELOP-with-urgent-review / REFER-OUT-FAST — never an auto-decline.

---

## 9. Workers'-comp third-party (on-the-job civil claim)

A high-frequency type the base engine mis-routes as pure comp. An injured worker may sue a **non-employer tortfeasor** while collecting comp ([Lab. Code 3852](https://impactattorneys.com/labor-code-%C2%A7-3852-employers-right-to-reimbursement-from-third-party-recovery/)).

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| On-the-job + third party | `injury_on_the_job`, `employer_identity`, `third_party_defendant_identity`, `workers_comp_claim_open` | Dim7 | On-the-job + named non-employer tortfeasor → **DEVELOP** (comp-lien workup), not DECLINE. On-the-job with **only** the employer named and no exception fact → out-of-scope civil → **REFER-OUT** to a comp specialist (not DECLINE-as-meritless). |
| Comp lien economics | `comp_benefits_paid_magnitude` {none/low/substantial} | carry/value tier | Net-fee is computed **after** a comp lien, but the lien is **reduced by its pro-rata share of fees/costs** ([Lab. Code 3856/3860](https://law.justia.com/codes/california/code-lab/division-4/part-1/chapter-5/section-3856/)) — don't treat the gross lien as a full offset. |
| Employer fault (lien reducer) | `employer_fault_indicators` (unsafe equipment, missing guard, ignored complaints, no training) | Dim4 (positive net modifier) | Credible employer-fault facts → **Witt v. Jackson** credit can shrink or wipe the lien ([*Witt v. Jackson* (1961) 57 Cal.2d 57](https://www.advocatemagazine.com/article/2019-march/workers-compensation-liens-and-credit-issues)) → raises net reaching client and firm. Surface as develop-action, not a computed offset. |
| Exclusive-remedy exception (sue employer) | `exclusive_remedy_exception_flag` {power_press_guard_removed / employer_manufactured_product / employer_uninsured / fraudulent_concealment / employer_assault} | Dim7 | Any cited exception on an on-the-job injury with no third party → **DEVELOP** (evaluate exception), can create a civil claim against the employer itself ([Lab. Code 4558 / dual-capacity line](https://plaintiffmagazine.com/recent-issues/item/the-5-exceptions-to-the-workers-compensation-exclusive-remedy-2)). |

---

## 10. Elder / dependent-adult abuse (WIC 15657)

**Fee-shifting changes the economics** — this can be a *keep* even where medical specials are modest, and it escapes the med-mal cap.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Statutory-abuse recklessness | `victim_is_elder_or_dependent_adult`, `care_facility_defendant`, `recklessness_indicators` (pressure sores/stage, falls, understaffing, ignored calls, med errors, malnutrition/dehydration) | Dim7, value tier | Elder/dependent-adult + **cited recklessness** (clear-and-convincing bar) → **fee-shift value multiplier** ([WIC 15657(a)](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-15657/) mandates attorney fees + costs) → bias **SIGN-NOW/DEVELOP** even on modest specials. Mere below-standard care with no recklessness → route to the **ordinary nursing-home negligence** anchor (MICRA-capped, no fee shift) → low net, likely REFER-OUT. |
| MICRA-free fork | (gated by `recklessness_indicators`) | value tier | Reckless neglect is **not** professional negligence, so the MICRA non-economic cap does **not** apply to the abuse cause of action ([*Delaney v. Baker* (1999) 20 Cal.4th 23](https://law.justia.com/cases/california/supreme-court/4th/20/23.html)). If the transcript can't distinguish recklessness from ordinary negligence → **abstain** on the elder-abuse anchor, DEVELOP for records. |
| Deceased victim | `victim_deceased` | value tier | [WIC 15657(b)](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-15657/) preserves the decedent's **pre-death pain and suffering** (capped only by Civ. Code 3333.2(b)) and this carve-out **survives the CCP 377.34 sunset** — do **not** down-tier a deceased-victim elder-abuse case the way an ordinary survival case is down-tiered post-2026. |

---

## 11. Wrongful death & survival

Standing and the **2026 survival sunset** create materially different value/urgency profiles.

### Disposition-flipping signals
| Signal | Extraction field(s) | Feeds | Flip logic |
|---|---|---|---|
| Standing class | `claimant_relationship_to_decedent` {spouse/domestic-partner/child/issue-of-deceased-child/parent/stepchild/putative-spouse/financial-dependent/other}, `claimant_financial_dependency` | Dim7 | Standing is a **closed class** ([CCP 377.60](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-60/)). Caller outside the class (sibling, fiancé, friend, non-dependent) → **DEVELOP** ("locate/confirm proper heir"), not DECLINE. |
| One-action joinder | `known_additional_heirs` | carry/effort tier, Dim6 | Wrongful death is a single joint action; never sign assuming the caller is sole heir → DEVELOP ("confirm and join all 377.60 heirs"). **[inference — one-action rule]** |
| Survival posture + sunset | `claim_posture` {wrongful_death_only / survival_only / both}, `victim_deceased`, filing-window flag | value tier, Dim5 | For actions **on/after 1/1/2026**, survival damages revert to **economic-only (no pain/suffering)** ([CCP 377.34](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-34/); SB 447 extension failed) **except** the elder-abuse carve-out (§10). Survival-only + no living 377.60 heirs + no elder abuse → **tier down**. Living wrongful-death heirs OR elder-abuse facts → retains high value. Surface filing-window as urgency flag only. |

---

## 12. Cross-cutting module — Prop 213 (uninsured-plaintiff bar) → G1

Applies to **auto/rideshare/trucking** where the *plaintiff* is a driver/owner. Bars **non-economic** damages only; economic damages survive.

**Extraction fields:** `client_was_insured` {yes/no/unknown}, `client_role` {driver/owner/passenger/pedestrian-cyclist}, `defendant_dui_convicted`, plus carve-out facts (below).

**G1 trigger ([Civ. Code 3333.4](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3333.4.&lawCode=CIV)):** fire the Prop-213 haircut **only when** `client_was_insured`=no AND `client_role` ∈ {driver, owner} AND injury is predominantly non-economic/soft-tissue AND no DUI-conviction path. Effect: value collapses to economic-only → guts a soft-tissue case, leaves a high-medical-bill case viable. **Never auto-decline — flag for attorney ratification;** insured status and DUI conviction are almost never confirmed on-call, so unobserved status stays `unknown` (unobserved ≠ uninsured).

**Statutory precision (verifier-corrected):**
- Bar also reaches a **plaintiff convicted of DUI** in the crash (3333.4(a)(1)) and injuries during commission/flight from a felony later convicted.
- **Passengers are exempt** — guard against false UNDERWATER flags when the caller was a passenger.
- **DUI exception (subd. c)** restoring non-economic damages requires an **actual conviction** of the at-fault driver and is textually anchored to the uninsured-**owner** paragraph; a mere allegation/arrest does not suffice → when DUI is present-but-not-convicted, emit a **contingency flag** and route DEVELOP, don't fire the bar. Operator-scenario DUI-exception = uncertain → attorney review.

**Carve-out suppressors** (any cited fact suppresses the bar for that damage stream, per [Advocate, *Into the weeds of Prop 213*, Oct 2025](https://www.advocatemagazine.com/article/2025-october/into-the-weeds-of-prop-213)): employee in employer's uninsured vehicle (*Montes*); permissive user under another policy, e.g. parent's (*Landeros*); wrongful-death heirs' loss-of-society (*Horwich*); punitive damages (*Nakamura*); product-liability claims (*Hodges*).

---

## 13. Cross-cutting module — Punitive value gating (DUI/malice)

A DUI/malice fact is **two signals the engine must not conflate.**

**Extraction fields:** `defendant_intoxicated_or_DUI` {observed_convicted / observed_charged / alleged_on_call / unknown}, `aggravating_conduct_facts` (extreme speed, ran signals, wrong-way/erratic, flight, refusal), `defendant_is_individual_vs_entity`, `personal_asset_signal` (real property, business owner, commercial/entity, employer-in-scope, dram-shop server), `punitive_target_beyond_driver`.

**Reliable half (liability):** a DUI/intoxication fact weights **heavily and unconditionally** into Dim1 — driving while intoxicated can itself be "malice" ([*Taylor v. Superior Court* (1979) 24 Cal.3d 890](https://scocal.stanford.edu/opinion/taylor-v-superior-court-28126); [Civ. Code 3294](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3294.&lawCode=CIV)), and comparative-fault exposure is very low.

**Contingent half (value):** punitive damages are **uninsurable** in CA ([Ins. Code 533](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=533&lawCode=INS) + City Products public-policy rule) → payable only from personal assets. **Value-tier rule:** credit a punitive uplift **only when** `aggravating_conduct_facts` present AND (`defendant_is_individual_vs_entity`=entity OR `personal_asset_signal` present OR `punitive_target_beyond_driver` present, e.g. dram-shop server per [*Dawes*](https://law.justia.com/cases/california/court-of-appeal/3d/111/82.html)). Against a **bare-minimum-limits individual with no asset signal**, punitive is a **value mirage** — set an attorney-review flag, never a value bump. Because conviction status and assets are usually unknown at intake and CA bars pre-trial punitive-amount pleading / gates financial discovery behind a court order ([Civ. Code 3295](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3295.&lawCode=CIV)), **abstain / DEVELOP on punitive value** by default. Never a gate — punitive reshapes value/collectability, never auto-declines.

---

## 14. Cross-cutting module — Damages credibility & the recoverable-value rule (all types)

The **coverage/payment path is the hinge** between the same injury and different recoverable value.

**Extraction fields:** `coverage_treatment_path` {health_insurance_in_network / lien_or_out_of_network / uninsured / unknown}, `objective_diagnostic_findings`, `surgery_performed_or_recommended`, `permanency_indicator`, `disfigurement_stated` (body region), `functional_impairment_stated`, `claimant_medicare_status`, `loss_of_consciousness`, `cognitive_symptoms_stated`, `imaging_present`, `neuro_deficit_stated`, `catastrophic_marker` {paralysis/amputation/severe_burn/fatality/none}.

- **Howell/Corenbaum:** an **insured/in-network** claimant recovers amounts **paid**, not billed — apply a paid-rate dampener to the specials component; a big billed number must not inflate the value tier ([Howell (2011) 52 Cal.4th 541](https://law.justia.com/cases/california/supreme-court/2011/s179115/); Corenbaum). *(Corrected figures: ~$189,978.63 billed / ~$59,691.73 paid — fix wherever seeded.)*
- **Pebley:** an **uninsured or out-of-network lien-treating** claimant may recover the higher **billed/reasonable value** ([*Pebley* (2018) 22 Cal.App.5th 1266](https://law.justia.com/cases/california/court-of-appeal/2018/b277893.html)) — raises gross value **but** stacks a lien that feeds G1 (net, not headline).
- **Audish:** for **future** medicals, when the claimant is/will be **Medicare-eligible** (age ~63+ or stated enrollment), defendants may discount to Medicare rates ([*Audish v. Macias* (2024) 102 Cal.App.5th 740](https://caselaw.findlaw.com/court/ca-court-of-appeal/116239568.html)) → apply a future-medical dampener. **Tie-break:** for the uninsured-but-Medicare-eligible plaintiff, the Audish future-medical discount **dominates** the Pebley billed-value uplift on the future-medical component.
- **Lay-vocabulary parity (fairness rail):** "my hand goes numb and I can't grip a cup" must score the **same radiculopathy rung** as records-stated "C6 radiculopathy"; "I blacked out / I'm not myself since" routes up the TBI rung. Grade from described symptoms and functional impact, not vocabulary sophistication; never downgrade for absence of medical terminology.
- **Abstention:** most severity separators (imaging, op report, EMG, permanency rating, GCS) are unconfirmed on a first call → a promising-but-unverified severe injury is **DEVELOP + abstain**, not SIGN-NOW.

---

## 15. Cross-cutting module — Net-recovery / lien-compression → G1 & carry tier

**G1 "Underwater" fires on PROJECTED NET after statutory lien reductions, not gross bills.** Change the trigger from `gross_lien_tier ≥ limits_tier` to `projected_net_lien_tier ≥ limits_tier`.

**Extraction fields (observable on-call):** `client_insurance_status` {medi-cal / medicare / erisa-employer-group / private / uninsured / unknown}, `on_the_job_injury`, `hospital_admission`, `treated_on_lien`. **Not observable (→ DEVELOP action, not a guess):** plan funding status (self-funded vs insured), lien balances, whether the hospital billed the health plan, employer fault %.

**Lien-load tier lookup — reducibility ranks (1 = most reducible):**
| Lien type | Rank | Reduction mechanics | Net effect on G1 |
|---|---|---|---|
| **Medi-Cal** | 1 (most) | Ahlborn medical-only allocation + mandatory **25%** fee reduction + **50%-of-net cap** ("least-of") ([WIC 14124.72(d)](https://california.public.law/codes/welfare_and_institutions_code_section_14124.72); [14124.78](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-14124-78/); [Ahlborn 547 U.S. 268](https://supreme.justia.com/cases/federal/us/547/268/)) | High gross Medi-Cal → **modest net-lien tier**; should **not** push G1. |
| **Hospital Lien Act** | 2 | **50%-of-net cap** after fees/prior liens + Howell reasonableness ([Civ. Code 3045.4](https://codes.findlaw.com/ca/civil-code/civ-sect-3045-4/); State Farm v. Huff) — only bites if hospital did **not** bill health insurer | Large hospital bill on a large settlement cannot alone make the case net-underwater. |
| **Workers'-comp** | 2–3 (fact-contingent) | Reducible via Witt v. Jackson employer-fault credit, but only through intervention/litigation | Employer fault present → net improves. |
| **Medicare** | 3 | Procurement-cost fee-share only ([42 CFR 411.37](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer)); injury-related only. **No Liability-MSA required in 2026** — do **not** carve out future medicals on liability PI. | Passes through more than an equal Medi-Cal lien. |
| **ERISA self-funded** | 5 (least) | Plan language trumps made-whole **and** common-fund ([*US Airways v. McCutchen* 569 U.S. 88](https://supreme.justia.com/cases/federal/us/569/88/)) — can claw back ~100% | **The disposition-flipper.** Passes through at near-full tier → can flip a signable-looking min-limits case to DEVELOP/DECLINE. |

**Self-funded-vs-insured unknown:** when `client_insurance_status`=erisa-employer-group, **abstain** on reducibility (not worst-case) and emit a mandatory DEVELOP action ("obtain SPD / plan funding status"). **Seed prior [inference]:** solo intake skews Medi-Cal / lien-treating / Medicare (high but compressible); ERISA self-funded is rare but catastrophic to net → selective postures weight ERISA-uncertainty toward DEVELOP over SIGN-NOW.

---

## 16. DEVELOP-action taxonomy (makes DEVELOP a conveyor, not a shrug)

DEVELOP must emit a **ranked action list** from a static `DEVELOP_ACTIONS` lookup keyed on each unknown/low-confidence field or gate-abstention → resolving CA workup action, each tagged `obtainability` {client_immediate / pre_suit / discovery_only}, `effort`, `latency_days`, `latency_criticality` {routine / time_critical / CRITICAL}. Rank by (criticality desc, expected dimension-lift desc, effort asc).

| Unknown/abstention | Resolving action | Obtainability | Criticality |
|---|---|---|---|
| liability unknown | Pull CHP collision report (CHP-190 / crashes.chp.ca.gov, client authorization) — often also clears defendant-ID + coverage | pre_suit, ~7–14 days | routine ([CHP](https://www.chp.ca.gov/traffic/request-a-crash-report/)) |
| prior-claims history | Structured client interview (5-yr treatment + all prior auto/WC claims, same-body-part) — **ISO ClaimSearch is defense-only, not a plaintiff pull**; RFP the defense ISO report post-filing | client_immediate + discovery_only | routine ([FFP Law](https://ffplaw.com/blog/what-is-an-iso-search/)) |
| client coverage unknown | Obtain client's own auto declarations page (UM/UIM/MedPay) | client_immediate | routine |
| defendant BI limits unknown | **CCP 999 time-limited demand** (≥30/33-day response) pre-suit; Form Interrog. 4.1 + PMK post-filing — no across-the-board pre-suit disclosure statute | pre_suit / discovery_only | routine ([CCP 999](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-998/)) |
| treatment gap unexplained | Capture client's reason (delayed onset/financial/access) → treating-provider causation note | client_immediate | routine |
| lien existence/type | Collect insurance cards, determine plan type, **DHCS 30-day notice** | client_immediate | time_critical (final amounts 120+ days) ([DHCS](https://www.dhcs.ca.gov/services/the-personal-injury-lien-process/)) |
| collectability/entity unknown | SOS entity search + agent for service, UCC/real-property assets, confirm scope-of-employment | pre_suit | routine |
| **trucking evidence** | **Spoliation/preservation letter (ELD/HOS, ECM, dashcam, DQ file, dispatch logs) within 24–48h** | pre_suit | **CRITICAL** (1–3 day dashcam overwrite) |
| public entity | Note 6-month claim regime; preserve/present claim | pre_suit | **CRITICAL** |
| prior counsel current | Confirm status, written termination (prior-attorney fee lien attaches to fee, not client) | client_immediate | routine — **not a G3 marker**; a lawful switch is not attorney-shopping |

**Ethics bounds on emitted action text (CA):** actions touching third parties carry constraint tags — recorded statements require **two-party consent** (Pen. Code 632 — *verify before shipping copy*), no contact with a **represented** party (Rule 4.2 — *verify*), no solicitation of the prospect via runners/cappers (**Rule 7.3 / B&P 6152**, [Rule 7.3](https://www.calbar.ca.gov/portals/0/documents/rules/rrc2014/final_rules/rrc2-7.3_%5B1-400%5D-all.pdf)). Never emit "send an investigator to sign them."

---

## 17. Cross-cutting fairness & abstention invariants (bind every case type)

- **Unobserved ≠ negative** applied uniformly to `treatment_gap`, `prior_same_body_part_injury`, `bankruptcy`, `prior_representation`, `client_insured_status`, lien posture — each is asymmetrically observable and must not become a silent penalty.
- **G3 client-risk is behavior-only, flag-only:** fee-negotiation, repeated value-inquiry, "worth going to the doctor?", disrespect toward staff, self-reported serial attorney-shopping — each with a verbatim quote span. **Explicitly excluded:** distress, crying, accent, limited English, deferential/apologetic/self-minimizing speech, demographics, "sounds unsophisticated." Apology/hedging is relational face-work, not a fault admission — only a cited factual predicate ("I looked at my phone") is extractable to Dim1.
- **ASR provenance gate:** low audio SNR / high code-switch density can only **widen abstention**, never justify an adverse level. Every cited quote must pass a speech-present / non-hallucination check; interpreter-mediated facts carry full weight toward **favorable** dispositions but reduced standalone weight toward **adverse** gates. Confidence derives from observability metadata (SNR, detected-language prob, code-switch ratio, dual-run grader agreement), **never** from ASR token-confidence or LLM self-report.
- **Per-language disparate-impact audit** (four-fifths screen, necessary-not-sufficient + significance test given small solo cells): favorable-disposition rate, abstention rate, and confidence distribution by detected language; a language-correlated DECLINE is both a fairness and an accuracy failure. Spanish is the **modal** CA intake language (~88% of interpreted events) — calibrate anchors on Spanish/code-switched transcripts, not only English.
- **No terminal auto-decisions:** every disposition, including DECLINE-WITH-GRACE and REFER-OUT, is a recommendation the attorney ratifies. Gates flag or route; they never terminate.

---

### Provenance note
All value-tier dollar bands (soft-tissue, MIST, dog-bite averages, truck/med-mal cost floors) are **published priors, not this firm's**, and are used only for internal tier mapping / ordinal ordering — never surfaced. Tag each with `is_firm_data=false` and decay toward the firm's own resolved-case posteriors; **statutory rows (SB 1107, MICRA/AB 35, Prop 213, Howell, FMCSA, Gov-claim windows) are config, not flywheel-overwritable.**
