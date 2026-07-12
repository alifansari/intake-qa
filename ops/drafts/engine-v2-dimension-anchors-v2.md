# Intake QA Engine v2 — Revised Dimension-Anchor Spec

**Scope.** System-prompt-ready behavioral anchors for the seven case-quality dimensions the LLM grades. Each dimension carries a five-level anchor (`strong` / `adequate` / `thin` / `unknown` / `fatal`), grounded in what California solo/small (1–5 attorney) plaintiff PI attorneys actually treat as strong vs. fatal, and tied to **observable, quotable call content**. Every anchor level is written to drop into the grading prompt. Fairness/multilingual guardrails for Dimension 6 and for damages-credibility (Dimension 2), and the per-language disparate-impact audit, follow the anchors and are enforceable — the spec is written to **pass a disparate-impact review**.

> This document governs only the LLM's two jobs: (1) extract cited facts, (2) grade the 7 dimensions with a citation *before* stating a level. It does **not** compute gates, tiers, decisions, dates, or dollars — deterministic code does that downstream.

---

## 0. Grading contract (applies to every dimension)

1. **Cite-then-claim.** State the verbatim quote span (and speaker) that supports a level *before* naming the level. No citation → no claim → the level is `unknown`. This is enforced mechanically downstream (span must exist in transcript and entail the value); see [citation-grounding via small-NLI faithfulness detectors (MiniCheck-class)](https://arxiv.org/pdf/2512.20182) — a fabricated quote must never produce a level.
2. **Unobserved ≠ negative.** A fact not discussed on the call is `unknown`, never adverse. Abstention is the default under uncertainty, not a downgrade.
3. **Abstain rather than guess.** If the only basis for a lower level is speaker manner, audio quality, or an inference the transcript does not support, output `unknown` and let the deterministic layer route to DEVELOP.
4. **Five-level semantics.** `strong` = value-driving, near-signable on this axis; `adequate` = viable, positive; `thin` = present but discounted/at-risk; `unknown` = not established on this call; `fatal` = an axis-level killer (a legal bar or an unprovable/uncollectable posture), never by itself a terminal decision. Dimension 6 has no `fatal` (see §6).
5. **Date/number rails.** Never compute or assert a specific SOL/claim-deadline date (urgency is a **flag**), and never state a dollar figure (value is a **tier**). Numeric statutory anchors below (limits, caps) are date-conditioned config the *code* consumes; the grader only extracts the facts that select the config.
6. **Every legal threshold is incident/policy-date-conditioned.** SB 1107 minimums, rideshare UM/UIM, MICRA caps, and survival-damages rules all changed on specific dates; the grader extracts date and status facts, the code picks the operative rule.

---

## Dimension 1 — Liability / comparative-fault exposure

**Anchor frame.** California is a **pure** comparative-negligence state ([*Li v. Yellow Cab* (1975) 13 Cal.3d 804](https://cutterlaw.com/california-laws/comparative-negligence/)); a nonzero plaintiff-fault share almost never zeros a case, and the **defendant bears the burden** of proving any plaintiff-fault percentage ([CACI 405](https://www.justia.com/trials-litigation/docs/caci/400/405/)). Therefore **a fault percentage alone can never be the fatal anchor** — the fatal read requires *unprovable liability* or *plaintiff-primary/sole cause paired with thin damages*, not "there was shared fault."

**Extraction fields (observable on call).** `police_report_exists`, `defendant_factual_admission` (a specific admitted act/omission, not sentiment), `independent_evidence` (video/independent witness/citation), `collision_mechanism` (rear-end / ran-signal / lane-change / etc.), `defendant_intoxicated_or_DUI` (observed_convicted / observed_charged / alleged_on_call / unknown), `plaintiff_role`, `necessity_to_encounter` (premises), `open_and_obvious` (premises), `hazard_origin` (premises), `politeness_affect` (see fairness rule).

**Anchors:**

- **STRONG** — Clear per-se or near-certain liability quoted: rear-end, ran a red light/stop sign, cited/ticketed at scene, an *independent* video/witness/police-report fault finding, or a defendant **factual** scene admission ("I never saw you," "I looked down at my phone"). A **defendant DUI/intoxication** fact belongs here — intoxicated driving supports very low comparative-fault exposure and can itself be malice ([*Taylor v. Superior Court* (1979) 24 Cal.3d 890](https://scocal.stanford.edu/opinion/taylor-v-superior-court-28126)); weight it heavily and **unconditionally** into liability regardless of collectability.
- **ADEQUATE** — Defendant negligence is provable, but a plausible comparative-fault argument exists **and** damages are substantial (pure comparative only dilutes value; per the CAALA intake checklist, "comparative fault doesn't eliminate value if damages are substantial" — [Advocate, Oct 2024](https://www.advocatemagazine.com/article/2024-october/initial-intake-a-checklist-of-factors-to-consider)).
- **THIN** — Liability genuinely disputed: unwitnessed, he-said-she-said, no independent evidence, or a premises hazard that is open-and-obvious with no cited necessity-to-encounter, or a transitory-hazard slip-fall with **no notice/inspection-gap evidence** ([*Ortega v. Kmart* (2001) 26 Cal.4th 1200](https://law.justia.com/cases/california/supreme-court/4th/26/1200.html); mode-of-operation does **not** substitute for notice — [*Moore v. Wal-Mart* (2003) 111 Cal.App.4th 472](https://plaintiffmagazine.com/recent-issues/item/notice-in-premises-liability-actions)).
- **UNKNOWN** — No liability facts extracted / not asked / the citing audio segment is degraded (route to DEVELOP, do not infer fault).
- **FATAL** — Liability essentially **unprovable** (no evidence + plaintiff-primary/sole proximate cause) **OR** a complete legal bar. Require the *unprovable-or-sole-cause + thin-damages* conjunction; never fire fatal off a bare comparative-fault percentage.

**Fairness rule (also enforced in D6).** Apology, sympathy, hedging, deference, or self-blame in lay speech ("I'm so sorry," "maybe it was partly my fault," "lo siento") is **not** a fault admission — it is relational face-work, disproportionately produced by polite/LEP callers ([Fricker testimonial injustice](https://iep.utm.edu/epistemic-injustice/); [Latino simpatía/respeto norms](https://communication.iresearchnet.com/intercultural-and-intergroup-communication/hispanic-communication-modes/)). Extract a `factual_admission` **only** when the caller states a concrete act/omission; store politeness separately as `politeness_affect` (never consumed by liability). If the only basis for a lower level is manner of speech, output `unknown`.

---

## Dimension 2 — Damages credibility (Howell-aware)

**Anchor frame.** Two orthogonal axes drive credibility the way carriers (Colossus) actually value cases: **objective/"demonstrable"** injury (imaging finding, fracture, surgery, documented neuro deficit) vs. **subjective/"nondemonstrable"** soft-tissue, and **permanency/future-care** ([Colossus demonstrable-vs-nondemonstrable and permanency as #1 driver](https://autoaccident.com/getting-colossus-to-pay-up-prognosis-and-permanent-impairment/)). The named killers CA attorneys quote are **treatment gaps, chiropractor-only soft-tissue, delayed care, and undisclosed same-body-part prior claims** ([Butler Firm on treatment gaps](https://butlerfirm.com/blog/how-insurance-companies-use-gaps-in-medical-treatment-against-you/); [Advocate intake checklist on prior claims](https://www.advocatemagazine.com/article/2024-october/initial-intake-a-checklist-of-factors-to-consider)). Recoverable **value** (a tier, downstream) is coverage-path-dependent — [*Howell v. Hamilton Meats* (2011) 52 Cal.4th 541](https://law.justia.com/cases/california/supreme-court/2011/s179115/) caps an **insured** plaintiff at amounts *paid/accepted* (record: **~$189,978.63 billed / ~$130,286.90 written off / ~$59,691.73 paid**), extended to future medicals by [*Corenbaum v. Lampkin* (2013)](https://www.strausmeyers.com/news/2021/2/8/reasonable-value-after-pebley-by-douglas-petkoff); [*Pebley* (2018) 22 Cal.App.5th 1266](https://law.justia.com/cases/california/court-of-appeal/2018/b277893.html) lets uninsured/lien-treating plaintiffs prove the higher billed/reasonable value; [*Audish v. Macias* (2024)](https://www.swlaw.com/blogs/product-liability-update/2025/02/26/redefining-the-rules-how-audish-v-macias-reshaped-future-medical-expense-claims-in-california-personal-injury-cases/) lets defendants discount **future** medicals to Medicare rates for Medicare-eligible plaintiffs. **The grader grades credibility; the coverage-path fact modifies the value tier downstream — do not let a large billed number inflate the credibility grade.**

**Extraction fields.** `injury_objective_findings` (none_subjective_only / imaging_finding / fracture / surgical / documented_neuro_deficit), `surgery_performed_or_recommended`, `permanency_or_impairment_indicated`, `time_to_first_treatment`, `treatment_gap` (present, length, `client_stated_reason`), `provider_types` (incl. chiropractor-only flag), `property_damage_severity` (MIST), `symptom_onset_timing`, `prior_injury_or_claim_same_body_region`, `coverage_treatment_path` (health_insurance_in_network / lien_or_out_of_network / uninsured / unknown), `loss_of_consciousness` + `cognitive_symptoms_stated` (TBI), `neuro_deficit_stated`, `disfigurement_stated`, `functional_impairment_stated`.

**Anchors:**

- **STRONG** — An objective/demonstrable injury (fracture, positive imaging, surgery performed or hardware, documented neurological deficit) **plus** prompt, continuous, documented treatment with specialist involvement **plus** a permanency/functional-loss indicator — all quotable (lay phrasing counts; see parity rule). Catastrophic markers (paralysis, amputation, severe TBI, severe disfigurement/burns) sit here on credibility but trigger the capital/posture check in D7.
- **ADEQUATE** — Soft-tissue but with prompt treatment, a specialist referral, and no material gap; **or** at least one objective finding without an established permanency read; **or** a stated recommendation for surgery/injections/future care that is inherently unverified at intake (grade adequate, route DEVELOP, do **not** jump to strong).
- **THIN** — Subjective/soft-tissue only with **chiropractor-only** care, **or** an unexplained treatment gap, **or** a delayed first visit with no stated medical reason, **or** a MIST profile (minimal property damage + soft-tissue only) ([CAALA on MIST](https://www.advocatemagazine.com/article/2019-april/minor-impact-soft-tissue-cases)). Thin, not fatal — a citation-backed soft-tissue injury can still be adequate.
- **UNKNOWN** — Treatment course not discussed, or not yet observable on a fresh-incident first call, or the citing segment is audio-degraded. On a first post-incident call the *absence* of a treatment history is expected — grade `unknown`, never thin.
- **FATAL** — No injury / no treatment described, or an injury demonstrably unrelated to the incident (clear pre-existing condition, or a same-body-part prior claim that contradicts the current claim on the call). Undisclosed-but-suspected prior claims are **not** fatal at intake — they are `unknown` pending records (abstain).

**Fairness guardrails (load-bearing — see also §Fairness).**
- **Lay-vocabulary severity parity.** Map lay descriptors to clinical equivalents *before* grading and score them identically: "my hand goes numb and I can't grip a cup" / "shooting pain down my leg, my foot drags" → radiculopathy rung (same as a records "C6 radiculopathy"); "I blacked out" / "I don't remember the crash" / "I'm not myself since" → the TBI rung; "I can't pick up my kid / can't sleep" → functional-impairment evidence. **Absence of medical vocabulary is not absence of injury**; never downgrade adequate→thin for lay phrasing. LEP callers systematically under-articulate severity ([LEP pain-communication review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12712895/)).
- **Treatment-gap abstention.** An unexplained gap on a first call is `unknown` + a DEVELOP action ("capture gap reason: delayed onset / financial / access; forward to treating provider"), **never** an automatic malingering inference — delayed soft-tissue onset is medically normal and gaps are commonly access/financial ([causation analysis](https://painmanagementmedicalexpert.com/services/causation-analysis)).
- **ASR-observability gating.** Any cited quote span must pass the audio-verification check (speech above SNR floor; not silence/non-speech). A low-quality segment forces the citing read to `unknown` — bad audio can only **widen abstention, never justify a `thin`/`fatal`**, because ASR error is dialect/accent-correlated ([Koenecke et al., PNAS 2020](https://www.pnas.org/doi/pdf/10.1073/pnas.1915768117)) and Whisper is overconfident and hallucinates insertions on accented/near-silent audio ([overconfidence](https://arxiv.org/abs/2509.07195); [insertion bias](https://arxiv.org/html/2604.21276v1)).

---

## Dimension 3 — Coverage-path adequacy

**Anchor frame.** Coverage is the practical recovery ceiling. California minimums rose to **30/60/15 effective 1/1/2025** (SB 1107, "Protect California Drivers Act," first increase since 1967, → 50/100/25 in 2035) — [primary text](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107). This is **date-conditioned**: higher limits attach to policies **issued/renewed on/after 1/1/2025**, so a pre-2025 collision (or an unrenewed policy) may still read 15/30/5 — prefer the **stated** limits; use date only as a fallback. When the defendant is uninsured/underinsured, viability flips to the **claimant's own UM/UIM** (non-stacking, offset-based — [Ins. Code 11580.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=11580.2.)). Rideshare branches on period and on **who is at fault**: post-**1/1/2026** the TNC passenger-onboard UM/UIM was cut from $1M to **$60k/$300k** (SB 371/AB 1340), while the **$1M third-party liability remains only when the rideshare driver is at fault** ([J&Y Law](https://jnylaw.com/blog/california-cuts-rideshare-insurance-limits-and-gives-drivers-union-rights-what-that-means-after-an-accident/)). Trucking carries FMCSA floors of **$750k–$5M** (49 CFR 387.9 property; 387.33 passenger — [eCFR](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387)).

**Extraction fields.** `defendant_bi_limits` (per-person/per-accident, if stated), `at_minimum_limits` (derived), `client_um_uim` (present/absent/limits), `medpay_pip`, `umbrella_or_multi_policy`, `rideshare_period` (off / on_waiting / enroute_or_passenger / unknown), `at_fault_party` (rideshare_driver / third_party / disputed), `commercial_or_truck`, `date_of_loss`.

**Anchors:**

- **STRONG** — Commercial / umbrella / government / trucking (FMCSA $750k+) coverage, high personal limits, or confirmed adequate UM/UIM after offset; rideshare Periods 2–3 with the **rideshare driver at fault** ($1M liability).
- **ADEQUATE** — Standard personal-auto above minimum with damages within limits; **or** defendant uninsured/underinsured **but** the claimant has real UM/UIM (the decisive fallback path).
- **THIN** — A 30/60 minimum-limits policy with treatment/injury that exceeds it (value pinned to the policy, not the injury); rideshare Period 1 (thin ~$50k/$100k contingent coverage); a post-1/1/2026 rideshare **passenger injured by an uninsured/underinsured third party**, now capped at $60k/$300k rather than $1M.
- **UNKNOWN** — Limits / UM-UIM / rideshare period not ascertained → DEVELOP (get the client's **own declarations page** immediately for UM/UIM/MedPay; defendant BI limits are **not** reliably obtainable pre-suit — route to a **CCP 999** time-limited demand or post-filing Form Interrogatory 4.1, per [Advocate, May 2025](https://www.advocatemagazine.com/article/2025-may/ensuring-you-get-all-the-insurance-information)). Correct the common misconception: there is **no** general pre-suit statute forcing disclosure of a defendant's third-party BI limits.
- **FATAL / UNDERWATER** — At-fault party uninsured **and** the claimant has no UM/UIM — recovery path effectively absent.

---

## Dimension 4 — Collectability / deep-pocket

**Anchor frame.** **Defendant type is the single largest value multiplier** and the primary collectability anchor — commercial/entity/government/trucking/multi-defendant uncaps value; a judgment-proof individual with no coverage path kills an otherwise valid case ([Sweat, CA lawyer's guide](https://www.victimslawyer.com/blog/do-i-have-a-personal-injury-case-a-california-lawyers-guide/)). Trucking layers carrier + broker/shipper defendants, and **freight-broker negligent-selection liability is now settled nationwide** by [*Montgomery v. Caribe Transport II* (U.S. May 14, 2026)](https://law.justia.com/cases/federal/appellate-courts/ca9/19-15981/19-15981-2020-09-28.html) — treat broker liability as a settled collectability factor, **not** the old contested *Miller* flag. Net collectability must be read **after lien compression**, which varies enormously by lien type: **Medi-Cal is most reducible** (Ahlborn allocation + mandatory 25% fee reduction + 50%-of-net cap — [WIC 14124.78](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-14124-78/)), the **Hospital Lien Act** caps at 50% of net ([Civ. 3045.4](https://codes.findlaw.com/ca/civil-code/civ-sect-3045-4/)), **Medicare** is a procurement-cost-reducible super-lien, and **ERISA self-funded plans are least reducible / can consume the entire net** ([*US Airways v. McCutchen* (2013)](https://supreme.justia.com/cases/federal/us/569/88/)). Punitive damages are **uninsurable** in CA ([Ins. Code 533](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=533&lawCode=INS); City Products rule) — so a DUI/malice fact adds **collectable** value only against an entity/asset-bearing/dram-shop target, never against a bare-limits individual.

**Extraction fields.** `defendant_type` (individual / commercial / government / rideshare / trucking / multi-defendant / uninsured), `defendant_insured`, `employer_in_scope`, `commercial_policy_suspected`, `broker_or_shipper_mentioned`, `personal_asset_signal` (home/business ownership, high-net-worth cues), `punitive_target_beyond_driver` (dram-shop server, employer, entity), `lien_sources` (medi_cal / medicare / erisa_self_funded / hospital / provider / workers_comp), `on_the_job_injury`, `owner_housing_status` + `bite_location_on_premises` (dog-bite).

**Anchors:**

- **STRONG** — A solvent deep-pocket: commercial/entity/government/trucking/multi-defendant, insured premises, umbrella, or confirmed adequate UIM after offset; a confirmed on-premises homeowner policy with no exclusion (dog-bite); an entity/asset/dram-shop **punitive** target where aggravating conduct is cited.
- **ADEQUATE** — Insured private defendant with limits roughly matching damages; identifiable homeowner/renter policy for an on-premises dog bite by a non-excluded dog.
- **THIN** — Minimum-limits individual where the UIM offset leaves a thin net; a renter's off-premises dog bite or an excluded breed with no other defendant; net materially compressed by a **low-reducibility lien** (ERISA self-funded) — surface as a flag.
- **UNKNOWN** — Defendant identity/insurance/entity-status/assets not established, or **lien reducibility unknown** (especially ERISA self-funded vs. insured, which is a plan-document question not answerable on-call) → DEVELOP (SOS entity search + assets; pull the SPD/plan funding status; identify lien existence from insurance cards; send DHCS 30-day notice). Do **not** assume worst-case.
- **FATAL** — Uninsured/judgment-proof individual with no UM/UIM path; **or** an ERISA self-funded lien projected to consume the net on a limits-constrained case.

**Punitive value rule (the key fix).** A DUI/malice fact is two signals the engine must not conflate. It weights **heavily and unconditionally into Dimension 1** (liability clarity). It adds **collectable value here only** when (`aggravating_conduct_facts` cited under [Civ. 3294](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3294.&lawCode=CIV), clear-and-convincing, per [*Dawes* (1980)](https://law.justia.com/cases/california/court-of-appeal/3d/111/82.html)) **AND** (`defendant_type` = entity OR `personal_asset_signal` present OR `punitive_target_beyond_driver` present). Against a bare-limits individual, punitive is a **value mirage** → attorney-review flag, never a tier bump. Financial-condition discovery is court-gated and no amount may be pled ([Civ. 3295](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3295.&lawCode=CIV)), so punitive value is a DEVELOP question, not an intake value input.

---

## Dimension 5 — Procedural urgency (facts only, never computed dates)

**Anchor frame.** Urgency is a **flag** dimension: extract the deadline-adjacent *facts*, never compute or display a date. The triggers are the ordinary 2-year PI SOL ([CCP 335.1](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=335.1&lawCode=CCP)); the **6-month government-claim** deadline for a public-entity defendant ([Gov. Code 911.2](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=911.2)) plus the post-rejection 6-month suit window ([Gov. 945.6](https://codes.findlaw.com/ca/government-code/gov-sect-945-6/)); the med-mal **1-year-discovery / 3-year-injury** limit and mandatory **90-day CCP 364** notice ([CCP 340.5](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=340.5&lawCode=CCP)); minor tolling ([CCP 352]) for ordinary PI **but not** the government claim (minors get *mandatory late-claim relief to ~1 year* under Gov. 911.4/911.6, not tolling to 18); and **evidence-spoliation** urgency for trucking (ELD/dashcam overwritten in days–30 days) and perishable third-party surveillance.

**Extraction fields.** `incident_date_mentioned` (verbatim, may be fuzzy), `defendant_is_public_entity`, `government_claim_already_filed`, `entity_sent_rejection_letter`, `medical_negligence`, `notice_of_intent_served`, `patient_is_minor` (+ under-6), `commercial_truck_evidence_present`, `perishable_surveillance_cue`, `date_harm_discovered` (delayed-discovery).

**Anchors:**

- **STRONG (low urgency)** — Fresh incident, no government/med-mal cue, ample window.
- **ADEQUATE** — Ordinary 2-year window with ample time cues; a minor plaintiff in a non-public-entity PI case (clock tolled to 18) *relaxes* urgency — do not let false urgency drive decline pressure.
- **THIN (elevated)** — A **government-entity** defendant (6-month clock; lexical cues: "Metro/MTA," "city bus," "county hospital," "the city," "school district"), **or** a med-mal claim (1-year discovery + 90-day notice), **or** a **trucking** case (spoliation-letter window measured in days).
- **UNKNOWN** — Incident date / public-entity status / med-mal status not stated → flag as *verify* (unknown, not clear).
- **FATAL / CRITICAL FLAG** — Incident language suggests the applicable window may be near or expired ("almost two years ago," public entity + months old). Output a *verify-immediately* flag feeding the G2 malpractice-trap review; **never** compute the date, **never** auto-decline.

---

## Dimension 6 — Client-risk markers (fairness-ruled)

**Anchor frame.** **Behavioral conduct only.** The empirically-attested, practitioner-validated markers are: attempting to **negotiate the fee before signing**, **value-obsession** (repeated "what's it worth" / estimate demands, "is it even worth going to the doctor?"), **disrespect toward intake staff**, self-reported **serial attorney-shopping / firing 2+ prior lawyers for the highest quote**, and **coached/rehearsed** value demands ([Champion Firm intake guide](https://www.thechampionfirm.com/blog/personal-injury-law-intake-improvements/)). Each marker requires a **verbatim behavioral quote**. G3 can **only flag for attorney review — it can never auto-decline** — and **unobserved ≠ negative**.

**Extraction fields.** `fee_negotiation_pre_signing`, `repeated_value_inquiry`, `worth_going_to_doctor_question`, `disrespect_toward_staff`, `self_reported_serial_shopping`, `coached_or_rehearsed_demand`, `prior_counsel_status` (none / current / terminated / unknown). **`politeness_affect` is not a marker field.**

**Anchors (this dimension has no `fatal`; the severe end is an ELEVATED FLAG → mandatory attorney review, never decline):**

- **STRONG / no-marker** *(default when unobserved)* — No adverse behavior observed.
- **ADEQUATE** — A minor single instance (e.g., one fee question) with no other marker.
- **THIN / FLAG** — One clear behavioral marker quoted (fee-haggling before signing, explicitly shopping the case for a higher number, fixation on a payout figure, disrespect to staff).
- **UNKNOWN** — Behavior not observable on this call (default toward no-marker; do not manufacture a marker from tone).
- **ELEVATED FLAG** *(fatal-equivalent, still flag-only)* — Multiple markers co-occurring (e.g., fired 2+ prior attorneys **and** shopping for the highest quote **and** a coached demand). Routes to mandatory attorney review; the engine **never** auto-declines on G3.

**Explicit exclusions — never markers, baked into the grader prompt.** Distress, crying, anger at the at-fault party, accent, language, limited English, **deferential/apologetic/self-minimizing speech**, "sounds unsophisticated," and any demographic feature. A client's **lawful exercise of the right to switch counsel is not a marker** — only observed serial shopping/firing behavior counts, and even then only as a flag. Prior-counsel *existence* routes to DEVELOP (obtain written termination; note the prior-attorney fee lien attaches to the fee, not the client), not to a risk marker.

---

## Dimension 7 — Case-type fit

**Anchor frame.** Fit is judged against a **solo/1–5 attorney** firm's capital and capacity, serving the net-fee-per-attorney-hour objective. **REFER-OUT is a positive, value-preserving disposition** — California uniquely permits a **pure referral fee** (no work/joint-responsibility requirement) under [CRPC 1.5.1](https://www.calbar.ca.gov/sites/default/files/portals/0/documents/rules/Rule_1.5.1-Exec_Summary-Redline.pdf) (written lawyer agreement + written client consent, no fee increase; market splits ~25–33% pure, ~40–50% co-counsel). So "great case, wrong firm" resolves to **REFER-OUT, not DECLINE**.

**Extraction fields.** `case_type` (auto / premises-subtype / dog-bite / product / med-mal / trucking / rideshare / elder-abuse / wrongful-death / WC-third-party / government), `defendant_type`, `capital_intensity_cues` (multiple experts, design-defect, catastrophic), `on_the_job_injury` + `exclusive_remedy_exception`, `victim_is_elder_or_dependent_adult` + `recklessness_indicators`, `claim_posture` (wrongful_death / survival / both), `claimant_relationship_to_decedent`.

**Anchors:**

- **STRONG** — Auto/rear-end or premises with an insured defendant; a clean dog-bite (bite + lawful presence + confirmed homeowner policy, [Civ. 3342](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3342.&lawCode=CIV)); fast in-house cash-flow cases; **statutory elder abuse with cited recklessness** ([WIC 15657](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-15657/) — mandatory fee-shift, and **MICRA-free** per [*Delaney v. Baker* (1999)](https://law.justia.com/cases/california/supreme-court/4th/20/23.html); the fee award, not raw specials, is the economic engine).
- **ADEQUATE** — Clear-liability auto with complications a small firm can carry; a consumer-expectation product case with an identifiable **in-state seller** in the chain; a WC **third-party** civil claim against a named non-employer tortfeasor ([Lab. Code 3852](https://impactattorneys.com/labor-code-%C2%A7-3852-employers-right-to-reimbursement-from-third-party-recovery/)).
- **THIN** — Liability-complex or multi-defendant premises needing sustained expert spend; a negligent-security case seeking a high-burden duty with no cited prior-similar incidents ([*Ann M.*/*Delgado*](https://plaintiffmagazine.com/recent-issues/item/premises-liability-cases-involving-third-party-criminal-conduct)); ordinary MICRA-capped nursing-home negligence with **no** recklessness (no fee-shift).
- **UNKNOWN** — Case type not yet clear from the call.
- **FATAL-FOR-FIT** *(route REFER-OUT, not DECLINE)* — Med-mal (capital- and expert-intensive; **justify refer-out on the ~$30k–$100k cost floor and standard-of-care experts, NOT on the MICRA cap** — MICRA caps noneconomic only, is uncapped on economics, and can stack up to 3x); design/automotive product liability ([Plaintiff Magazine](https://plaintiffmagazine.com/recent-issues/item/can-a-smaller-firm-handle-a-products-liability-case)); mass tort; catastrophic/trucking exceeding firm capital/capacity; heavy government-entity litigation. Pure workers'-comp-only (no third party, no [exclusivity exception](https://plaintiffmagazine.com/recent-issues/item/the-5-exceptions-to-the-workers-compensation-exclusive-remedy-2)) → refer to a comp specialist.

> **MICRA note (do not miswire).** For 2026, the MICRA noneconomic cap is **$470k (injury) / $650k (death)**, escalating and applied at *resolution* year, and it caps **only noneconomic** damages and can stack up to three per-category ceilings ([Nolo](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html); [Milliman](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps)). It is a downstream value-tier ceiling, **not** a case-quality judgment and **not** the reason to refer med-mal.

---

## Fairness / multilingual guardrails (Dimension 6 and Damages-Credibility)

Spanish is the **modal** CA intake language (88% of interpreted courtroom events; [CA Courts language-access](https://newsroom.courts.ca.gov/branch-facts/language-access)), not an edge case, so these are core, not peripheral. The dominant threat is **corrupted upstream ASR**, not the grader — and the response to any language-correlated uncertainty must be **ABSTAIN / DEVELOP, never a language-correlated DECLINE**.

**G-1. ASR-observability gating (both dimensions).** Engine confidence is derived **only** from observability metadata — audio SNR/segment quality, detected-language probability, code-switch density, hallucination/insertion detectors, diarization stability. It is a **hard rail** that ASR token-confidence and LLM self-reported/CoT confidence are **forbidden** inputs (ASR is overconfident precisely where it errs — [calibration study](https://arxiv.org/abs/2509.07195); longer reasoning worsens calibration — [Don't Think Twice](https://arxiv.org/pdf/2508.15050)). A low-quality citing segment forces the read to `unknown`; **audio quality can only widen abstention, never justify an adverse level.**

**G-2. "No clean audio, no citation."** Every cited quote span must contain speech above the SNR floor and pass an insertion/hallucination check; spans mapping to silence/non-speech are dropped, and the fact goes `unknown`. This prevents a fabricated span (Whisper insertions spike on accented and near-silent audio — [insertion-bias benchmark](https://arxiv.org/html/2604.21276v1)) from tripping a dimension.

**G-3. Language identity is never an input.** `detected_language` is **never** an abstention or tier input — only measured `audio_quality` and `code_switch_ratio` are. Spanish on clean audio is strong ASR; blanket-abstaining on Spanish would itself be the disparate-impact failure. (Do not seed thresholds from the frequently-miscited "~2.7% Spanish WER" figure — it is a conflated English-benchmark number; calibrate from a measured per-language WER/insertion profile on the firm's own held-out Spanish + code-switched CA-PI set.)

**G-4. Lay-vocabulary severity parity (Dimension 2).** Grade severity from **described symptoms and functional impact, not vocabulary sophistication**; map lay ↔ clinical before grading; lay phrasing at a given symptom level scores identically to clinical phrasing at that level; never downgrade for absence of medical terminology. (Rationale and lexicon in §2.)

**G-5. Deferential-speech neutralization (Dimensions 1 & 6).** Apology, sympathy, hedging, deference, self-minimization, and self-blame in lay speech are **not** fault admissions and **not** client-risk markers. A `factual_admission` requires a specific admitted act/omission; a G6 marker requires a specific behavioral act. Culturally-normed deference (simpatía/respeto) and LEP/accented speech must never proxy for fault or risk ([Ahmad, *Interpreting Communities*](https://www.uclalawreview.org/wp-content/uploads/2019/09/30_54UCLALRev999June2007.pdf)).

**G-6. Grade on language-normalized facts; keep verbatim source-language citations.** Extraction stays in source language (verbatim ES spans preserved for cite-then-claim and the audio-verification check), but the 7-dimension grader consumes an **English-normalized rendering of the extracted fact structure**, so surface-language markers cannot proxy for severity/credibility ([translationese-bias rationale](https://arxiv.org/pdf/2603.10351)). On high-code-switch or Spanish calls, run a **dual-run agreement check** (native-language grade vs. verified-translation grade); disagreement on any dimension forces that dimension to `unknown` → DEVELOP. Log `grader_language` and `dual_run_agreement`.

---

## Per-language disparate-impact audit metrics

A standing audit job, computed **by detected language** and **by interpreter-mediated vs. not**. It is the enforcement surface — it feeds **human recalibration of ASR/observability thresholds, never automatic tier-cutoff changes**, and any flagged disparity resolves affected calls to DEVELOP, never a language-correlated DECLINE.

**Per-group metrics (per language cell):**
1. **Favorable-disposition rate** = share receiving SIGN-NOW + DEVELOP.
2. **Abstention rate** (share routed to DEVELOP on observability grounds).
3. **DECLINE rate** and **REFER-OUT rate**.
4. **Mean observability-confidence.**
5. **Per-dimension level distribution** (the 7 dimensions × 5 levels).
6. **G6/G3 flag rate.**

**Parity tests:**
- **Four-fifths screen (necessary, not sufficient).** For each metric, each group's rate ÷ the top group's rate must be **≥ 0.80** ([29 CFR 1607.4(D)](https://en.wikipedia.org/wiki/Disparate_impact)). Treat ≥0.80 as necessary-not-sufficient: the guideline's own text warns smaller differences can still be adverse and larger differences may not be where based on small numbers, so **always also run a significance test** (Fisher exact / bootstrap CI). Minimum cell size **n ≥ 30**; below that use Bayesian shrinkage to the seed prior rather than a bare ratio. *Legal-status caveat:* the four-fifths rule is a Title-VII employment construct borrowed as an internal monitor — it implies **no** compliance safe-harbor for a case-selection recommender; the spec/marketing must not suggest otherwise.
- **Equal-audio-quality abstention/confidence check.** Verify that abstention rate and mean observability-confidence are **not** lower for Spanish **at equal measured audio quality**. If they are, the culprit is ASR/observability calibration, **not** the grader — recalibrate the ASR/observability thresholds, do not touch tier cutoffs.
- **Translation-invariance parity test (release blocker).** On a held-out set, score each call in **source Spanish** and in a **verified English translation**; require the 7 dimension levels **and** the gate flags to match within a tight tolerance. Systematic ES-lower deltas are a **release blocker**. This is a stronger, causal fairness check than comparing aggregate score histograms.

**Disposition of a flag.** A four-fifths breach or a translation-invariance delta triggers **human review and ASR/observability recalibration**, never an automatic threshold adjustment and never a language-correlated DECLINE. Because ground-truth accuracy parity requires attorney-ratified outcomes labeled by language, stand up that labeling plan so the audit can distinguish "fair" from "equally wrong across languages."

---

### Implementation notes for the extraction schema (cross-dimension)

- Every extracted fact carries: `value`, `verbatim_quote_span`, `speaker`, `observed_on_call | inferred`, `per_fact_confidence`, `citation_audio_verified`, `provenance ∈ {observed, interpreter_mediated, inferred}`. **Interpreter-mediated facts carry full weight toward FAVORABLE dispositions but reduced standalone weight for ADVERSE gates** and require attorney review before contributing to a DECLINE.
- **Split fault signal** into `factual_admission` vs. `politeness_affect`; only `factual_admission` feeds Dimension 1 and the gates.
- **Date-condition** all statutory anchors (SB 1107 limits, rideshare UM/UIM, MICRA caps) via a dated config the code reads — the grader extracts `date_of_loss`/policy and status facts only.
- Where a promising-but-unverified severe injury, an undisclosed-but-suspected prior claim, an unknown lien-reducibility, or an unknown defendant asset/entity status blocks a `strong` read, the correct output is `unknown` → **DEVELOP with a targeted records/verification action**, never a confident `thin`/`fatal` and never `SIGN-NOW`.
