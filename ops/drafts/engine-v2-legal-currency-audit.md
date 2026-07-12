# Engine v2 — CA Legal-Currency Audit & Gate-Correction Memo

**Scope.** This memo audits every California legal doctrine the frozen v2 triage engine depends on, against primary authority current as of mid-2026. For each doctrine it states (1) the current law with citation, (2) whether the engine's existing gate / dimension anchor / tier treatment is **CORRECT**, **STALE**, or **MISSING**, and (3) the exact correction to the extraction schema, a dimension anchor, a gate trigger, the decision table, a tier lookup, the posture config, or the seed priors.

**Compliance rails preserved throughout.** No dollar figures at intake (tiers only); no computed SOL/deadline dates (urgency FLAGS only); no terminal auto-decisions; fairness rules; "no citation, no claim"; abstain rather than guess. Every correction below is expressed as a tier/flag/anchor change, never a dollar or date shown at intake.

**How to read the status tags.** CORRECT = keep as-is; STALE = engine holds an obsolete number/rule and will mis-triage until re-keyed; MISSING = doctrine is not modeled and should be added; CORRECTION-TO-PRIOR-RESEARCH = a claim circulated in the research that this audit refutes or narrows, flagged so it is not resurrected.

---

## 0. Items that MUST go to the attorney / Yang before shipping

These survived verification but turn on facts, dates, or firm-specific posture that legal counsel must ratify. They are called out again inline.

1. **MICRA cap "which year" rule.** The AB 35 escalation is measured by **year of resolution**, not year of injury or filing ([Milliman](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps)). A case intaked in 2026 resolves ~2027–2029, so the internal fee math should use the **projected resolution-year cap**, not the 2026 figure. Confirm the operative-date interpretation of amended Civ. Code 3333.2 with counsel before hard-coding the tier lookup.
2. **MICRA multi-cap stacking.** Up to three separate noneconomic caps can apply (provider category / institution category / unaffiliated third category). Confirm the firm wants the value tier to model stacking on multi-defendant med-mal (see §3).
3. **Prop 213 DUI-exception scope.** The 3333.4(c) exception is textually anchored to the uninsured **owner** (subd. (a)(2)); extending it to the uninsured **operator** (a)(3) is not clearly supported. Treat operator-scenario DUI relief as attorney-review (see §1).
4. **Audish future-medical discount.** *Audish v. Macias* is a published Court of Appeal decision that partially conflicts with *Pebley*. Confirm current review/depublication status before finalizing the future-medical reliability discount (see §2).
5. **Rideshare SB 371 codification.** The $60k/$300k UM/UIM figure and 1/1/2026 date are corroborated by multiple secondary sources and a PUC 5433 cite from the verifier, but the enrolled-bill section numbers were not pulled from leginfo. Confirm before hard-coding the rideshare coverage anchor (see §9).
6. **Freight-broker liability.** A 2026 U.S. Supreme Court decision (below) appears to resolve the FAAAA-preemption split nationwide; confirm the holding's scope before treating broker liability as settled collectability (see §10).
7. **Punitive-damages posture.** Whether the firm wants a punitive value-uplift at all for an individual DUI defendant (uninsurable; collectable only against assets) is a posture choice (see §12).

---

## 1. Proposition 213 — Civ. Code 3333.4 (uninsured-motorist noneconomic bar)

**Current law (2026).** [Civ. Code 3333.4](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3333.4.&lawCode=CIV) bars recovery of **noneconomic damages only** (economic damages — medical, wage loss, property — remain fully recoverable) where the injured person was: (a)(1) convicted of DUI for their own driving in the crash; (a)(2) the **uninsured owner** of a vehicle involved; or (a)(3) the **uninsured operator** who cannot establish financial responsibility. The bar is **defeated** by subd. (c) when the at-fault driver is **convicted** of DUI under Veh. Code 23152/23153 ([leginfo](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3333.4.&lawCode=CIV); [MKP Law](https://www.mkplawgroup.com/auto-accidents/proposition-213-the-basics/)).

Five verified carve-outs the gate must respect so it does not over-fire ([Advocate, "Into the weeds of Prop 213," Oct 2025](https://www.advocatemagazine.com/article/2025-october/into-the-weeds-of-prop-213)): employee driving employer's uninsured vehicle (*Montes v. Gibbens*); permissive user covered under another policy such as a parent's (*Landeros v. Torres*); wrongful-death heirs' loss-of-society damages (*Horwich v. Superior Court*); punitive damages (*Nakamura v. Superior Court*); and product-liability claims (*Hodges v. Superior Court*). Summary adjudication of the 213 issue is improper under CCP 437c(f)(1). Statutory bar reaches only vehicles required to be insured and operated on a highway.

**Engine status: PARTIALLY STALE / UNDER-SPECIFIED.** The G1 sub-trigger described as "Prop-213 + soft tissue" fires on too coarse a predicate. Prop 213 is not about soft tissue; it is about the **claimant's own insurance status + role + the DUI-conviction exception + carve-outs**, and it collapses value to **economic-only** rather than declining the case.

**Exact correction.**
- **Extraction fields (add):** `claimant_own_vehicle_insured` (yes/no/unknown, cited); `claimant_role` (driver / owner / owner-occupant / passenger / pedestrian-cyclist); `at_fault_driver_DUI_status` (none / suspected / arrested / charged / convicted, cited); plus carve-out flags `employer_owned_vehicle`, `permissive_use_under_other_policy`, `wrongful_death_posture`, `product_defect_component`, `punitive_conduct_present`.
- **G1 gate logic:** Fire the Prop-213 sub-trigger ONLY when `claimant_role ∈ {owner, owner-occupant, non-owner operator}` **AND** `claimant_own_vehicle_insured = no` **AND** no carve-out fact is cited **AND** `at_fault_driver_DUI_status ≠ convicted`. Effect = cap the damages-credibility/value contribution to **economic damages only** (guts a soft-tissue case, leaves a high-medical-bill case viable). **Passengers and insured drivers must never trip it.**
- **Contingency flag, not a bar:** When DUI is present-but-not-yet-convicted, emit "Prop 213 bar contingent on DUI conviction" and route to DEVELOP (unresolved ≠ negative).
- **Fairness rail:** Unobserved insurance status = `unknown`; never infer "uninsured." No auto-decline — G1 flags for attorney ratification.
- **Confidence-tag the exceptions:** statutory (passenger, DUI-convicted-defendant) = high; case-law (private-property, parked-vehicle, and the operator-scenario DUI exception) = lower, attorney-review. **→ Yang confirm the (a)(3) operator DUI-exception scope.**

---

## 2. Paid-vs-billed medicals — Howell / Corenbaum / Pebley / Audish

**Current law (2026).**
- **[Howell v. Hamilton Meats (2011) 52 Cal.4th 541](https://law.justia.com/cases/california/supreme-court/2011/s179115/):** an **insured** plaintiff recovers past medical damages only in the amount **actually paid and accepted** as full satisfaction, not the billed charge. **Corrected figures:** the Howell record was **~$189,978.63 billed / ~$130,286.90 written off / ~$59,691.73 paid** — *not* the $174k/$41k figure that circulated in research. The paid-not-billed principle is correct; fix the numbers wherever they seed examples.
- **Corenbaum v. Lampkin (2013):** billed amounts are irrelevant and inadmissible even to prove **future** medicals or noneconomic damages for an insured plaintiff ([Manoukian Law](https://manoukianlaw.com/howell-corenbaum-pebley-california-medical-damages-billed-vs-paid/)).
- **[Pebley v. Santa Clara Organics (2018) 22 Cal.App.5th 1266](https://law.justia.com/cases/california/court-of-appeal/2018/b277893.html):** an **uninsured** plaintiff, or an insured plaintiff who elects to treat **out-of-network on a lien**, is treated as uninsured and may put the **full billed/reasonable value** before the jury — raising the gross ceiling but coupling it to a lien that compresses net.
- **Audish v. Macias (2024, published):** a plaintiff's future **Medicare eligibility and Medicare reimbursement rates** are admissible to prove the reasonable value of **future** medical care without violating the collateral-source rule — a defense tool that discounts future-medical claims for Medicare-eligible (or soon-eligible at 65) plaintiffs, an implicit narrowing of *Pebley* ([Lewis Brisbois](https://lewisbrisbois.com/newsroom/legal-alerts/calif.-appeals-court-permits-use-of-medicare-reimbursement-rates); [WSHB](https://www.wshblaw.com/publication-california-court-of-appeal-upholds-admissibility-of-medicare-eligibility-in-an-implicit-rebuke-of-pebley-v-santa-clara-organics)).

**Engine status: PARTIALLY STALE (Audish MISSING).** The v2 damages-credibility dimension is described as "Howell-aware," which is correct, but the frozen engine predates *Audish* and does not carry the coverage-path fact that makes Howell vs. Pebley operative.

**Exact correction.**
- **Load-bearing extraction field (add):** `coverage_treatment_path` (private-health-in-network / Medicare / Medi-Cal / med-pay / uninsured-self-pay / **lien-or-out-of-network**), cited.
- **Damages-credibility anchor:** For an **insured/in-network** claimant, treat a quoted **billed** total as an upper bound only — grade adequate/strong on paid-amount or reasonable-value evidence, else abstain; do not let a big billed number inflate the value tier. For a **lien/uninsured** claimant, allow billed amounts to support a higher **gross** grade (Pebley) but simultaneously feed the lien into G1 Underwater and the carry tier (see §5).
- **Audish future-medical discount (add):** field `claimant_medicare_eligible_now_or_near_65` (from stated enrollment or age ≥ ~63). When a case leans on large future-medical / life-care numbers **and** the plaintiff is/will be Medicare-eligible, down-grade the reliability of billed/lien future-medical projections; lower the future-medical base-rate prior. **Tie-break for the uninsured-but-Medicare-eligible plaintiff:** for **future** medical, the *Audish* reliability discount dominates the *Pebley* billed-value uplift. **→ Yang confirm Audish review/depublication status.**

---

## 3. MICRA / AB 35 — med-mal noneconomic cap schedule

**Current law (2026).** [AB 35](https://www.gov.ca.gov/2022/05/23/governor-newsom-signs-legislation-to-modernize-californias-medical-malpractice-system/) (eff. 1/1/2023, amending Civ. Code 3333.2) replaced the flat $250k cap with **two escalating schedules**. Non-death (injury) started $350k and rises $40k/yr; wrongful-death started $500k and rises $50k/yr — both for 10 years to **$750k / $1,000,000 in 2033**, then +2%/yr from 2034 ([Milliman](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps); [Nolo](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html)):

| Resolution year | Injury (non-death) cap | Wrongful-death cap |
|---|---|---|
| 2023 | $350,000 | $500,000 |
| 2024 | $390,000 | $550,000 |
| 2025 | $430,000 | $600,000 |
| **2026** | **$470,000** | **$650,000** |
| 2027 | $510,000 | $700,000 |
| 2028 | $550,000 | $750,000 |
| … | +$40k/yr | +$50k/yr |
| 2033 | $750,000 | $1,000,000 |
| 2034+ | +2%/yr | +2%/yr |

Three verified constraints: (a) the cap is **noneconomic only** — economic damages (medicals, wage loss, future care) are **uncapped**; (b) the applicable figure is keyed to **year of resolution**; (c) up to **three separate caps stack** (health-care providers collectively; institutions; an unaffiliated provider/institution category), so a hospital-plus-physician case can carry ~2–3x the headline. AB 35's schedule applies only to cases **filed on/after 1/1/2023**.

**Engine status: STALE if any static MICRA figure exists; STRUCTURALLY MISSING the stacking model.** Two research framings are **CORRECTED**: (i) do **not** treat $470k/$650k as a hard med-mal value ceiling — that under-tiers high-economic-damage and multi-defendant cases; (ii) the correct justification for the med-mal REFER-OUT default is **capital/expert intensity** (~$30k–$50k+ advance, six figures at trial; standard-of-care requires paid experts), **not** the cap.

**Exact correction.**
- **Config, not constant:** store the AB 35 schedule as a **year-indexed table** the med-mal value tier reads; auto-advance each Jan 1. Use the **projected resolution-year** cap for a new intake (2027–2029 for a 2026 sign), never the intake-year figure — under-tiering otherwise is systematic. **→ Yang confirm resolution-year rule.**
- **Stacking:** add extraction fields `defendant_is_individual_provider` vs `defendant_is_institution` vs `unaffiliated_defendant`; when multiple categories are cited, model a **per-category ceiling**, not a single-case ceiling. **→ Yang confirm firm wants stacking modeled.**
- **Economic-weighting:** because noneconomic is capped and economic is not, the med-mal damages-credibility anchor must weight economic-loss facts (wage loss, future/life-care) far more than pain-and-suffering narrative; bias the decision table to DEVELOP/REFER-OUT for a solo unless economic damages are catastrophic.
- **Guard:** never apply the AB 35 schedule to a pre-2023 (re)filing — those stay at the flat $250k.
- **Non-med-mal guard:** MICRA does not touch auto/premises/trucking value tiers; do not cross-wire.

---

## 4. CCP 998 — offers to compromise (carry / trial-capital signal)

**Current law (2026).** [CCP 998](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-998/) shifts costs on a rejected-then-beaten offer: a plaintiff who beats its own 998 recovers post-offer expert fees plus 10% prejudgment interest; a plaintiff who rejects a defense 998 and does worse forfeits post-offer costs and pays the defense's post-offer expert fees out of the verdict (commonly $20k–$50k+ in multi-expert cases) ([Injury Goat 2026 guide](https://injurygoat.com/resources/practice-areas/ccp-998-offers)).

**Engine status: CORRECTLY OUT OF EXTRACTION SCOPE.** 998 is not an intake-transcript fact.

**Exact correction (posture note, not a new gate).** Encode 998 in the **G4 trial-capital gate and carry/effort tiers** as reasoning, not extraction: expert-heavy, thin-liability cases carry asymmetric 998 cost-shift downside (worse net-fee-per-attorney-hour), while strong-liability cases gain leverage/interest from an early plaintiff 998. Surface only as attorney-review reasoning in DEVELOP/REFER — never a decline driver.

---

## 5. Lien law — net-recovery compression by type

**Current law (2026), ranked by statutory reducibility.**
1. **Medi-Cal (MOST reducible).** Limited to the *Ahlborn* medical-expense allocation ([WIC 14124.76](https://plaintiffmagazine.com/recent-issues/item/calculating-medi-cal-s-reimbursement-rights-under-ahlborn); [*Ahlborn*, 547 U.S. 268](https://supreme.justia.com/cases/federal/us/547/268/)), mandatorily reduced **25%** for attorney fees ([WIC 14124.72(d)](https://california.public.law/codes/welfare_and_institutions_code_section_14124.72)), and hard-capped so DHCS never takes more than the beneficiary's own net ([WIC 14124.78](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-14124-78/)). DHCS runs a "least-of" cascade; *Aguilera v. Loma Linda* applied Ahlborn in CA.
2. **Hospital Lien Act (moderately reducible).** [Civ. Code 3045.4](https://codes.findlaw.com/ca/civil-code/civ-sect-3045-4/) caps the lien at **50% of net** after attorney fees and prior liens, and reaches only "reasonable" charges (*State Farm v. Huff* extends *Howell*). Bites only when the hospital did **not** bill the patient's health insurer.
3. **Workers'-comp lien on a third-party recovery (fact-contingent).** [Lab. Code 3856/3860](https://law.justia.com/codes/california/code-lab/division-4/part-1/chapter-5/section-3856/); reducible by pro-rata fee/cost share and reduced or wiped by employer comparative fault under ***Witt v. Jackson* (1961) 57 Cal.2d 57** — but only through intervention/litigation.
4. **Medicare conditional payments (federal super-lien).** Reducible chiefly by the procurement-cost fee-share ([42 CFR 411.37](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer)); injury-related charges only.
5. **ERISA self-funded plans (LEAST reducible — the disposition-flipper).** [*US Airways v. McCutchen*, 569 U.S. 88 (2013)](https://supreme.justia.com/cases/federal/us/569/88/): plan language trumps the made-whole and common-fund doctrines, so a well-drafted self-funded plan can claw back nearly 100% of paid medicals off the top with no fee discount. Reducibility turns entirely on **self-funded vs. insured** (ERISA deemer clause) — a plan-document question almost never answerable on an intake call.

**Liability MSA — CORRECTION.** A **Liability** Medicare Set-Aside is **NOT required in 2026** — CMS has no mandatory review process for future medicals in liability PI settlements, and the "Future Medicals" rule was withdrawn again ([Sanderson Firm](https://www.sandersoncomp.com/blog/lmsawithdrawn)). Do **not** carve out future medicals on liability cases; reserve MSA logic for the workers'-comp branch.

**Engine status: MISSING net-recovery modeling.** If G1 measures "liens vs. limits" on **gross** bills, it both over-declines highly-compressible Medi-Cal/HLA cases and under-detects the genuinely-underwater ERISA-self-funded case.

**Exact correction.**
- **Extraction fields (add):** `lien_sources` = {Medi-Cal, Medicare, ERISA-employer-group, private-insurance, Hospital-Lien-Act, med-pay, letters-of-protection}, each {suspected, confirmed, cited}; plus `client_insurance_status`, `government_benefit_status`, `on_the_job_injury`, `hospital_admission`, `treated_on_lien`. Mark plan-funding-status, exact lien balances, and employer-fault as **not observable on call** → each triggers a specific DEVELOP action.
- **Lien-load tier lookup:** key by (lien_type, reducibility_rank 1–5). Medi-Cal/HLA collapse toward lower net-lien tiers; ERISA self-funded passes through at full tier.
- **Re-specify G1:** change the trigger from `gross_lien_tier ≥ limits_tier` to `projected_net_lien_tier ≥ limits_tier`. When reducibility is unknown (e.g., ERISA type unresolved), G1 **abstains → DEVELOP**, never auto-declines. Emit the develop-action "obtain SPD / plan funding status" for any ERISA-employer-group fact.
- **Posture:** selective firms weight lien-reducibility uncertainty more heavily (favor DEVELOP over SIGN-NOW when ERISA type is unresolved).

---

## 6. Statute-of-limitations table (urgency FLAGS only)

**Current law (2026).**
- **General PI / product / wrongful death:** 2 years — [CCP 335.1](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=335.1&lawCode=CCP). Tolled for minors until age 18 ([CCP 352](https://www.shouselaw.com/ca/blog/5-situations-when-statute-of-limitations-is-tolled-in-california/)); delayed-discovery can defer accrual.
- **Med-mal:** earlier of **1 year from discovery or 3 years from injury** — [CCP 340.5](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=340.5&lawCode=CCP); 3-year outer cap tolled only for fraud, intentional concealment, or a non-therapeutic foreign body. Minor tolling: under age 6 → until the 8th birthday. **Mandatory 90-day pre-suit notice** — [CCP 364](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=364); if served in the last 90 days of the period, the SOL extends 90 days (*Woods v. Young* (1991) 53 Cal.3d 315).
- **Government claim:** 6 months to present (see §7).

**Engine status: CORRECT in principle (flags-only), but med-mal and the 364 notice are likely UNDER-SPECIFIED.**

**Exact correction.** Give the urgency dimension a dedicated **med-mal row**: extract `date_of_treatment_or_procedure`, `date_symptoms_or_error_discovered`, `patient_is_minor` / `minor_under_6`, `notice_of_intent_served` — all facts, never computed dates. Decision-table rule: med-mal + SOL-adjacent fact + notice-not-served → escalate urgency flag and bias to **REFER-OUT** (a specialist executes the 364 mechanics), not slow DEVELOP. For a minor in a **non-public-entity** PI case, **relax** the urgency flag (clock tolled to 18) to prevent false urgency-driven decline pressure. Emit FLAGS only.

---

## 7. Government Claims Act — Gov. Code 911.2 / 945.6 (sharpest malpractice trap)

**Current law (2026).** [Gov. Code 911.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=911.2): a written claim for PI/wrongful-death/personal-property must be presented to the public entity **within 6 months of accrual** (one year for other claims); missing it generally bars suit, with only narrow §911.4 late-claim relief. After a compliant §913 written rejection, [Gov. Code 945.6](https://codes.findlaw.com/ca/government-code/gov-sect-945-6/) starts a fresh **6-month** window to file suit; if no compliant rejection is mailed, the plaintiff gets **2 years** from accrual. Dangerous-condition claims add [Gov. Code 835](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=835.&lawCode=GOV)'s notice element (entity's own actual/constructive notice, or employee-created condition; condition must be "substantial").

Two verified nuances:
- **Minor late-claim backstop.** For a claimant who was a **minor** throughout the 6-month period, §911.4/911.6 provides **mandatory** late-claim relief ("shall grant") on application within one year of accrual. So a minor is effectively protected to ~1 year, **not** hard-barred at 6 months — do not model a bare 6-month CRITICAL that ignores the backstop.
- **Accrual for latent injuries** can post-date the incident; extract both `incident_date` and `date_harm_discovered` and let the flag reflect uncertainty (unknown accrual = verify).

**Engine status: PRESENT but likely UNDER-SPECIFIED.** The single 6-month flag is correct as a concept; the chain of deadlines and the minor backstop are the gaps.

**Exact correction.**
- **Extraction (add):** top-priority `public_entity_defendant` (bool), derived from cited transcript facts via a lexical checklist — govt/marked vehicle (bus, police, fire, city, county, school district, Metro/MTA, VA/county hospital, "the city," "government car"), injury on public property (sidewalk/road/park/public building), public hospital/clinic, or public employee in scope. Plus `claim_already_filed_with_entity`, `entity_sent_rejection_letter`, `rejection_letter_date`, `claimant_is_minor`.
- **Urgency + G2:** a cited public-entity defendant fires the **tightest** urgency flag and is the sharpest G2 malpractice-trap trigger → bias SIGN-NOW-and-preserve or REFER-OUT-FAST, never slow DEVELOP. Add a distinct "government-claim-rejected → 6-month suit clock" sub-flag and a "minor: mandatory late-claim relief to ~1yr may apply" sub-flag. Flags only, never a computed date. Unobserved filing statement = unknown/verify (unobserved ≠ negative).

---

## 8. SB 1107 — auto minimum liability limits (currency reset)

**Current law (2026).** [SB 1107](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107) (Protect California Drivers Act) raised the minimums from **15/30/5 to 30/60/15**, the first increase since 1967, for policies **issued or renewed on/after 1/1/2025** (a pre-2025 policy may still legally read 15/30). Scheduled step to **50/100/25 on 1/1/2035**. Self-insurance deposit rose $35k→$75k. Codified via Veh. Code 16056 / Ins. Code 11580.1b ([FMG](https://www.fmglaw.com/insurance-4/california-increases-auto-insurance-minimums-for-the-first-time-since-1967/); [State Farm](https://newsroom.statefarm.com/understanding-californias-new-auto-liability-coverage-law-10-2024/)).

**Engine status: STALE.** The G1 "min-limits + heavy treatment" anchor and the coverage-path priors are keyed to the obsolete $15k floor. A "policy limits / minimum policy" fact now implies **$30k**, changing the underwater math and how fast a min-limits case goes underwater on heavy treatment.

**Exact correction.**
- **Extraction (add):** `policy_bi_per_person`, `policy_bi_per_accident`, `policy_pd`, derived `at_minimum_limits` flag, and — critically — `date_of_loss` / policy issue-renewal date.
- **Date-conditioned lookup:** compare limits against **$30k/person** for incidents/renewals on/after 1/1/2025, **$15k/person** for pre-2025; the date-conditional branch is **not optional** (older accidents still within SOL are being intaked in 2026). Prefer the **stated** policy limits when mentioned; date is a fallback proxy.
- **Re-seed** the "min-limits trips G1" base-rate prior on 30/60, and refresh coverage-path anchors. Build the 2035 step (50/100/25) into the dated config now so the threshold auto-updates.

---

## 9. Rideshare coverage — SB 371 / AB 1340 + the three app periods

**Current law (2026).** California cut rideshare (TNC) **UM/UIM during an active ride from $1M to $60k per person / $300k per accident effective 1/1/2026** (SB 371, traded for AB 1340 driver-union rights), while the **$1M third-party liability — which applies only when the rideshare DRIVER is at fault — remains** ([J&Y Law](https://jnylaw.com/blog/california-cuts-rideshare-insurance-limits-and-gives-drivers-union-rights-what-that-means-after-an-accident/); [HH Law](https://www.hhlawfirm.law/uber-rideshare-insurance-changes-2026/)). Verifier resolution: the $60k/$300k haircut applies specifically to the **passenger-onboard active-ride window** (PUC 5433(b)(2)), not Period 1 or between-rides; SB 371 also added a $200k excess layer over the $50k/$100k between-rides coverage (PUC 5433(c)). The three periods (AB 2293, in force 7/1/2015): Period 1 (app on, no match) = contingent ~$50k/$100k/$30k; Periods 2–3 (matched / passenger aboard) = the $1M liability ([CA Dept. of Insurance](https://www.insurance.ca.gov/0400-news/0100-press-releases/archives/release067-15.cfm)).

**Engine status: MISSING (frozen v2 predates SB 371).**

**Exact correction.**
- **Extraction (add):** `rideshare_period` (off / on-waiting / enroute-or-passenger / unknown), `at_fault_party` (rideshare-driver / third-party / disputed).
- **Value tier must branch on at-fault party, not "was it a rideshare":** if the injured client was a passenger and an **uninsured/underinsured third party** caused the crash, cap the recoverable-coverage anchor at **$60k/$300k** for post-1/1/2026 crashes (can drop a serious-injury case from high tier to modest and may trip G1). Keep the **$1M** anchor only when the **rideshare driver** is the tortfeasor. Pre-1/1/2026 crashes still carry $1M UM/UIM (date-gate on crash date).
- **Period is the master switch on Periods 1–3 coverage:** if period is unknown, abstain → DEVELOP (ask which period) rather than tiering on assumption. **→ Yang confirm SB 371 codification before hard-coding.**

---

## 10. Trucking — FMCSA minimums, spoliation urgency, layered defendants

**Current law (2026).**
- **Federal minimums** dwarf CA auto: [49 CFR 387.9](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387) property carriers — **$750k** general freight, $1M oil, **$5M** hazmat; 387.33 passenger carriers — $1.5M (≤15 seats) / $5M (16+).
- **Spoliation urgency:** ELD/HOS records retain ~6 months but in-cab looping dashcam can be overwritten in **1–3 days**, telematics ~30 days — a preservation letter must go out within **24–48 hours**; post-notice destruction becomes consciousness-of-guilt evidence ([FMCSA ELD](https://eld.fmcsa.dot.gov/); [LHL Law](https://www.lhllaw.com/insights/trucking-company-spoliation-letters)).
- **Layered defendants + freight-broker liability — CORRECTION/UPDATE.** The research cited an unsettled FAAAA-preemption split (*Miller v. C.H. Robinson*, 9th Cir. 2020, vs. a CA Superior Court rejection). The verifier reports this is **superseded by *Montgomery v. Caribe Transport II, LLC*, U.S. Supreme Court, decided May 14 2026** (unanimous, Barrett, J.), holding the FAAAA safety exception preserves state negligent-hiring/selection claims against freight brokers nationwide. Broker liability moves from "contested upside flag" to a settled collectability factor. **→ Yang confirm the holding's scope before treating broker liability as certain; cite Montgomery, not the Gallagher Sharp CA Superior Court alert.**

**Engine status: MOSTLY PRESENT for coverage depth; spoliation-urgency and broker-liability treatment need updating.**

**Exact correction.**
- **Extraction (add):** `vehicle_is_commercial_truck`, `cargo_type` (general/hazmat/passenger), `estimated_gvw_over_10001`, `employer_carrier_identified`, `broker_or_shipper_mentioned`, `driver_on_the_job`, `commercial_truck_evidence_present` (ELD/dashcam/logs mentioned).
- **Coverage-path floor** = FMCSA minimum ($750k baseline / $5M hazmat), not the auto min; multi-defendant (carrier + broker/shipper) upgrades collectability toward "strong."
- **Spoliation flag:** when `vehicle_is_commercial_truck = true`, fire procedural-urgency FLAG "spoliation-letter-needed within 24–48h" at **CRITICAL** latency (flag only, no date). This pushes a viable truck case toward SIGN-NOW/immediate in-house action; refer-out delay risks spoliation. It is an evidence-preservation flag, not a G2 trigger unless the case is also deadline-adjacent and marginal.
- **G4 bound:** high-limit + corporate-defendant cases also mean well-funded defense and $150k–$300k+ expert exposure — gate the trucking SIGN-NOW/in-house recommendation on G4 and the firm's capital posture; thin capital → REFER-OUT-WITH-FEE even on strong merit.

---

## 11. Survival actions — CCP 377.34 sunset + elder-abuse carve-out

**Current law (2026).** The temporary CCP 377.34(b) window (SB 447) allowing **noneconomic** (pain/suffering/disfigurement) damages in **survival** actions **sunset for new filings on 1/1/2026**; for actions filed on/after that date, survival damages revert to **economic-only** (plus rare punitives) — [CCP 377.34](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-34/); [Gordon Rees](https://www.grsm.com/insight/the-end-of-pain-and-suffering-damages-in-california-survival-actions/). **Wrongful-death** damages ([CCP 377.60](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-60/) — closed heir class) are unaffected. **Critical carve-out:** [WIC 15657(b)](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-15657/) independently strips the 377.34 limitation for **elder/dependent-adult abuse**, so a deceased victim's pre-death pain and suffering **remains recoverable** (capped only by Civ. Code 3333.2(b)) and **survives the sunset**. *Delaney v. Baker* (1999) 20 Cal.4th 23 holds reckless neglect is not "professional negligence," so **MICRA does not cap the elder-abuse cause of action**; WIC 15657 also mandates **attorney-fee shifting** on clear-and-convincing proof of recklessness/oppression/fraud/malice.

**Engine status: MISSING.**

**Exact correction.**
- **Extraction (add):** `victim_died`, `claim_posture` (wrongful-death-only / survival-only / both), `victim_is_elder_or_dependent_adult`, `care_facility_defendant`, `recklessness_indicators` (pressure sores/stage, falls, understaffing, ignored calls, med errors, malnutrition — cited), `elder_or_dependent_adult_abuse_theory`.
- **Value tier:** for actions on/after 1/1/2026, a **survival-only** intake with no living 377.60 heirs and no elder-abuse recklessness → **tier down** (economic-only); do **not** credit "decedent's pain and suffering." A case with living wrongful-death heirs **or** cited elder-abuse recklessness **retains** high value.
- **Elder-abuse fork:** only cited reckless-conduct facts justify the high-value fee-shift/MICRA-free anchor; mere below-standard care with no recklessness maps to the ordinary (MICRA-capped, no fee-shift) nursing-home-negligence anchor. If the transcript cannot distinguish recklessness from ordinary negligence → **abstain → DEVELOP** (records review), do not assume the fee-shift value.

---

## 12. Punitive damages — Civ. Code 3294 + Ins. Code 533 uninsurability

**Current law (2026).** [Civ. Code 3294](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3294.&lawCode=CIV) authorizes punitives only on **clear-and-convincing** proof of malice/oppression/fraud (aggravating conduct beyond negligence). *Taylor v. Superior Court* (1979) 24 Cal.3d 890 holds intoxicated driving can itself be "malice"; *Dawes v. Superior Court* (1980) 111 Cal.App.3d 82 requires the aggravating conscious-disregard circumstances (extreme speed, running signals, erratic driving) and illustrates a deep-pocket dram-shop target. **Uninsurability:** [Ins. Code 533](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=533&lawCode=INS) plus the public-policy *City Products* rule make punitive damages **uninsurable** — payable only from the defendant's personal assets ([Blank Rome](https://www.blankrome.com/publications/california-corner-californias-bar-coverage-willful-acts-under-insurance-code-section)). [Civ. Code 3295](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3295.&lawCode=CIV) bars pleading a punitive amount and gates financial-condition discovery behind a court order.

**Engine status: MISSING the liability/value split.** A DUI/malice fact is two signals the engine risks conflating.

**Exact correction.**
- **Split the signal.** As a **liability** signal, `defendant_intoxicated_or_DUI` (observed-convicted / charged / alleged / unknown) weights **heavily and unconditionally** into the liability/comparative-fault dimension (drives toward "strong," very low comparative-fault exposure) — the reliable half.
- **As a value signal it is contingent.** Credit a punitive value-uplift **only** when `aggravating_conduct_facts` are cited **AND** collectability supports it: `defendant_is_entity` OR `personal_asset_signal` (home/business owner, commercial vehicle, named employer) OR `punitive_target_beyond_driver` (dram-shop/employer/entity). Against a **bare-minimum-limits individual with no asset signal**, punitive value is a mirage (uninsurable, uncollectable) — set only a soft "punitive-upside, collectability-unverified" attorney-review flag, never a firm value bump.
- **Abstain at intake.** Conviction/BAC and defendant assets are usually unknown on-call → abstain on punitive value and route to DEVELOP ("confirm conviction/BAC + defendant assets/entity + insurer identity"). Never let the LLM self-assert punitive value; it is a deterministic function of collectability metadata. Punitive-uninsurability reshapes value/collectability only — it must **never auto-decline** (preserves the no-terminal-decision rail). **→ Yang confirm firm posture on individual-DUI punitive uplift.**

---

## 13. Consolidated year-indexed / dated constants (make these config, not code)

| Constant | 2026 value | Trigger date / key | Auto-update rule |
|---|---|---|---|
| Auto min limits (SB 1107) | 30/60/15 | policy issued/renewed ≥ 1/1/2025 (else 15/30/5) | step to 50/100/25 on 1/1/2035 |
| Limited-jurisdiction ceiling (AB 2347) | $35,000 | filings ≥ 1/1/2024 (was $25k) | static until amended |
| MICRA injury cap | $470,000 | **year of resolution** | +$40k/yr → $750k in 2033, then +2%/yr |
| MICRA death cap | $650,000 | year of resolution | +$50k/yr → $1.0M in 2033, then +2%/yr |
| Rideshare UM/UIM, passenger-aboard (SB 371) | $60k/$300k | crash ≥ 1/1/2026 (else $1M) | — |
| Rideshare 3rd-party liability | $1M | only when rideshare driver at fault | — |
| FMCSA trucking min | $750k / $1M oil / $5M hazmat | commercial GVW > 10,001 lbs | 387.9 property, 387.33 passenger |
| Survival noneconomic damages | economic-only | filings ≥ 1/1/2026 (SB 447 sunset) | elder-abuse (WIC 15657) exempt |

---

## 14. Refuted / corrected / narrowed claims log (do not resurrect)

- **Howell dollar figures.** Use ~$189,978.63 billed / ~$59,691.73 paid, not $174k/$41k. Principle unchanged.
- **MICRA as a hard value ceiling.** Refuted — noneconomic-only, economic uncapped, and up to 3x stacking. Justify med-mal refer-out on capital/expert intensity, not the cap.
- **ISO ClaimSearch as a plaintiff develop-action.** Refuted — ISO discloses to insurers only; the pre-suit action is a structured client interview, with the defense ISO report obtainable only post-filing by RFP.
- **Freight-broker FAAAA-preemption split "unsettled."** Superseded by *Montgomery v. Caribe Transport II* (SCOTUS, May 14 2026) per the verifier — broker negligent-hiring claims preserved nationwide. **→ Yang confirm.**
- **Liability MSA / future-medical set-aside required.** Refuted — no CMS mandate in 2026; do not haircut liability future medicals for an MSA.
- **Prop 213 "private-property/parked-vehicle" exceptions as statutory.** Narrowed — these are interpretive/case-law; only the passenger and DUI-convicted-defendant exceptions are in the statute. Confidence-tag accordingly.
- **Prop 213 DUI exception for uninsured operators.** Narrowed — textually anchored to the uninsured owner (a)(2); operator scenario is attorney-review.
- **BJS median provenance / "2.7% Spanish WER."** Peripheral to legal currency but flagged by verifiers as mis-cited; not used as legal anchors here.

---

## 15. Net engine-change checklist (legal currency only)

- **STALE, fix now:** SB 1107 min-limits re-key + date branch (§8); any static MICRA figure → year-indexed table on resolution year (§3); Howell example numbers (§2).
- **MISSING, add:** Audish future-medical discount (§2); lien-type net-recovery model + G1 re-spec on projected net (§5); rideshare SB 371 at-fault branch (§9); survival-sunset + elder-abuse carve-out value logic (§11); punitive liability/value split with Ins. Code 533 uninsurability (§12).
- **PRESENT, refine:** Prop 213 role/insurance/DUI/carve-out precision (§1); government-claim deadline chain + minor backstop (§7); med-mal SOL row + CCP 364 notice (§6); trucking spoliation-urgency flag + Montgomery broker update (§10).
- **CORRECT, keep:** CCP 998 as G4/carry reasoning only (§4); flags-only SOL/urgency design; no-dollars/no-dates/no-terminal-decision rails throughout.
- **To attorney/Yang (see §0):** MICRA resolution-year rule + stacking; Prop 213 operator DUI exception; Audish status; SB 371 codification; Montgomery scope; individual-DUI punitive posture.
