# Engine v2 — Seed Base-Rate Prior Library

**The "boring prior" the engine ships before the firm's flywheel has data.**

This library gives Intake QA a defensible, sourced sentence to render for each incoming call *before* the firm has resolved a single case of its own. Every prior below is a **published prior, not this firm's data**, and the engine must say so out loud. Priors are seeded from four tiers of public evidence, ordered by trustworthiness:

1. **Hard CA statute / case law** that moves the value math directly (MICRA/AB 35 caps, SB 1107 minimums, Prop 213, Howell/Pebley/Audish, lien-reducibility statutes). These are **config**, not flywheel-overwritable.
2. **BJS tort-trial data** — a relative-value ladder and case-type liability win-rates.
3. **IRC / insurer-side data** (Colossus behavior, auto-BI economics, attorney-representation multipliers) — systematically conservative.
4. **Studdert/NEJM + CRICO/Candello** malpractice-outcome gradients for the med-mal `dog_rate`.

The single most important honesty constraint: **there is no free, CA-specific, case-type *settlement* (not verdict) distribution.** Verdict reporters (VerdictSearch, Jury Verdict Alert, JVR, Daily Journal) are paywalled and selection-biased toward tried/large cases; the soft-tissue/MIST dollar bands circulating online are marketing-aggregator figures, not audited data. So the dollar bands that underlie the value tiers below are either **winner-only verdict medians (upward-biased)**, **insurer-side paid means (conservative)**, or **aggregator marketing numbers (unaudited)** — never a true CA settlement distribution. The true value sits *between* the verdict medians and the paid means; auto-BI priors are biased modestly upward for this reason, and every dollar band is flagged for fast flywheel replacement.

---

## 1. How to read a prior

Each flywheel-overwritable row carries five fields:

| Field | Meaning |
|---|---|
| `value_tier` | Internal tier (never a dollar shown at intake). See §3. |
| `dog_rate` | Prior probability the case turns out non-viable ("a dog") — no fee. |
| `settle_prob` | Prior probability the case resolves by settlement rather than trial. |
| `source` | The published evidence base. |
| `confidence` | High / Medium / Low — how much to trust the number, and how fast it should decay. |

Two hard rules:

- **`is_firm_data = false` on every row here.** The engine states "*published prior, not this firm's data*" in the rendered sentence.
- **`dog_rate` and `value_tier` are the first two fields the firm's flywheel overwrites.** Statutory rows (§5) are config and are *not* overwritten by the flywheel — they change only when the law changes.

Low-confidence dollar bands (soft-tissue, trucking aggregate) must **decay fast** and be replaced after ~N of the firm's own resolved cases in that cell; until then the engine should *widen its value-confidence band (abstain on tier)* rather than assert.

---

## 2. Value-tier ladder (internal only — never surfaced at intake)

Per the no-dollars-at-intake compliance rail, dollar bands exist **only** to map evidence into a tier; the engine renders the tier label, never the band.

| Tier | Internal band | Typical profile |
|---|---|---|
| **T0** | < ~$10k | Minor soft-tissue, min-limits, economic-only Prop-213 |
| **T1** | ~$10k–$50k | Routine auto BI, adequate coverage |
| **T2** | ~$50k–$250k | Objective injury, premises w/ clear notice, moderate trucking |
| **T3** | ~$250k–$1M | Surgical/serious injury + coverage, med-mal potential |
| **T4** | > $1M | Catastrophic/death + deep pocket, catastrophic trucking |

*Source for band anchoring:* [BJS Tort Bench and Jury Trials](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005) verdict ladder + [IRC auto-injury data](https://insurance-research.org/news/study-finds-more-auto-injury-claimants-are-hiring-attorneys). **Confidence: Medium** (relative ordering is stable; absolute bands are not CA settlement data).

---

## 3. The seed prior table

`(case_type × key-signal) → value_tier, dog_rate, settle_prob`. Every row is a **published prior, not this firm's data.**

| # | case_type | key-signal | value_tier | dog_rate | settle_prob | source | confidence |
|---|---|---|---|---|---|---|---|
| 1 | Auto BI | soft-tissue, **min-limits** (now 30/60) | T0 | 0.35 | 0.95 | [BJS auto median](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005); [IRC](https://insurance-research.org/news/study-finds-more-auto-injury-claimants-are-hiring-attorneys); [SB 1107](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107) | Medium |
| 2 | Auto BI | soft-tissue, adequate coverage | T1 | 0.15 | 0.96 | [IRC ~$27k mean BI](https://www.cccis.com/reports/crash-course-2024/q4) | Medium |
| 3 | Auto BI | **objective injury / surgery** | T2–T3 | 0.08 | 0.94 | [IRC 3.5× representation multiplier](https://insurance-research.org/news/study-finds-more-auto-injury-claimants-are-hiring-attorneys); Colossus objective-injury driver | Medium |
| 4 | Auto | catastrophic / death, adequate coverage | T3–T4 | 0.05 | 0.90 | [BJS award tail](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005) | Medium |
| 5 | Premises | soft-tissue | T0–T1 | 0.40 | 0.93 | [BJS premises 39% win-rate](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005) | Medium |
| 6 | Premises | serious injury, **clear notice** (Ortega) | T2 | 0.20 | 0.92 | [BJS premises $59k median](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005) | Medium |
| 7 | Trucking / CMV | moderate injury | T2–T3 | 0.12 | 0.93 | [FMCSA $750k–$5M minimums (49 CFR 387)](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387) | Medium |
| 8 | Trucking / CMV | catastrophic | T4 | 0.08 | 0.88 | FMCSA limits; practitioner aggregate | Medium |
| 9 | Med-mal | **any** — DEFAULT REFER-OUT | T3–T4 *potential*, capital-gated | **0.70** | 0.30 (of-paid) | [CRICO/Candello ~72% no-pay](https://pmc.ncbi.nlm.nih.gov/articles/PMC2628515/); [Studdert NEJM](https://www.nejm.org/doi/full/10.1056/NEJMsa054479); [AB 35 cap](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html) | High (dog_rate); Medium (tier) |
| 10 | Auto (Prop-213) | **uninsured plaintiff-driver + soft-tissue** | T0 (economic-only) | 0.60 | 0.93 | [Civ. Code 3333.4](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3333.4.&lawCode=CIV) | High (mechanism); Medium (rate) |
| 11 | Dog-bite | single bite, lawful presence, homeowner coverage | T1–T2 | *NULL* (see §8) | ~0.95 | [III: CA avg claim $81,789 (2025)](https://www.iii.org/article/spotlight-on-dog-bite-liability) | Medium (value); Low (dog_rate=null) |
| 12 | Product liability | design-defect / automotive — DEFAULT REFER-OUT | high *potential*, capital-gated | *NULL* | — | [Plaintiff Mag small-firm products guide](https://plaintiffmagazine.com/recent-issues/item/can-a-smaller-firm-handle-a-products-liability-case) | Medium (posture); Low (rate=null) |
| 13 | Elder abuse (statutory, WIC 15657) | cited **recklessness** facts + fee-shift | up-tiered by fee-shift | *NULL* | — | [WIC 15657](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-15657/); [Delaney v. Baker](https://law.justia.com/cases/california/supreme-court/4th/20/23.html) | High (mechanism); Low (rate=null) |
| 14 | Nursing-home / med negligence (no recklessness) | MICRA-capped, **no fee-shift** | tier-down vs. row 13 | — | — | [AB 35 / Civ. 3333.2](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html) | High (mechanism); Low (rate=null) |
| 15 | WC third-party civil | on-the-job + named non-employer tortfeasor | per underlying auto/premises row, **net of comp lien** | inherit | inherit | [Lab. Code 3852/3856](https://law.justia.com/codes/california/code-lab/division-4/part-1/chapter-5/section-3856/); [Witt v. Jackson](https://www.advocatemagazine.com/article/2019-march/workers-compensation-liens-and-credit-issues) | Medium (mechanism); Low (rate=null) |
| 16 | Wrongful death / survival | living 377.60 heir(s) present | per injury severity + coverage | — | — | [CCP 377.60](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-60/) | High (mechanism); Low (rate=null) |
| 17 | Survival-only (post-2026) | **no living 377.60 heir + no elder-abuse recklessness** | tier-**down** (economic-only) | — | — | [CCP 377.34 SB447 sunset](https://codes.findlaw.com/ca/code-of-civil-procedure/ccp-sect-377-34/) | High (mechanism); Low (rate=null) |

**Notes on the table.**

- **Rows 1–2 min-limits math is re-keyed to SB 1107.** A "policy limits" fact now implies **$30k** BI (not the legacy $15k) for policies issued/renewed on/after 1/1/2025 — prefer *stated* limits, use `date_of_loss` only as a fallback; pre-2025 policies may still legally carry 15/30. [SB 1107](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107).
- **Row 9 (med-mal) `dog_rate = 0.70` is cited to CRICO/Candello**, the correct denominator for intake (most inquiries never become viable claims). Studdert's merit→payment gradient (19% pay on weak evidence → 84% on clear error) informs the *conditional* payment probability, **not** the intake dog_rate. Med-mal defaults to **REFER-OUT** for a 1–5 attorney firm because the ~$30k–$50k+ cost floor + capped non-economic recovery collapse risk-adjusted net fee per attorney-hour on marginal cases. [Med-mal cost floor](https://www.helbocklaw.com/how-much-is-a-medical-malpractice-case-worth-in-california/).
- **Row 10 (Prop-213) fires only when** the plaintiff was an *uninsured owner/driver* AND no exception (passenger, DUI-convicted defendant, employer vehicle, permissive-use coverage, wrongful-death, product, punitive). If insurance status was not observed, the row does **not** fire — `unknown ≠ uninsured` per the fairness rail. [Advocate: Into the weeds of Prop 213](https://www.advocatemagazine.com/article/2025-october/into-the-weeds-of-prop-213).
- **Rows 11–17 carry `dog_rate = NULL`.** No published CA no-fee rate exists for these types; the engine must **not** invent one. It renders the value-tier prior and the mechanism note, and explicitly states the dog-rate is unknown until the firm accumulates data (§8).

---

## 4. Statutory / case-law config anchors (NOT flywheel-overwritable)

These are stored as **dated config** and change only when the law changes. They cap or re-key the value math regardless of firm data.

### 4.1 MICRA / AB 35 non-economic caps (med-mal only)

| Resolution year | Injury (non-death) | Wrongful death |
|---|---|---|
| 2023 | $350,000 | $500,000 |
| **2026** | **$470,000** | **$650,000** |
| 2033 | $750,000 | $1,000,000 |
| 2034+ | +2%/yr (flat, not CPI) | +2%/yr |

- **Key to the year of RESOLUTION, not intake.** A case signed in 2026 resolves ~2027–2029; the engine should feed the **projected resolution-year cap** (e.g., 2027 ≈ $510k/$700k), not the 2026 intake-year figure, or it systematically under-tiers.
- **Non-economic only** — economic damages (medical, wage, future care) are **uncapped** and drive most med-mal value.
- **Caps stack up to ~3×** across defendant categories (provider / institution / unaffiliated). Extract `defendant_is_institution` vs `individual_provider`; a hospital+physician case can roughly double or triple the effective ceiling (2026 stacked ≈ $1.41M injury / $1.95M WD). Do **not** hard-cap value at a single figure.
- **Do NOT apply the MICRA cap to statutory elder abuse** (row 13) — [Delaney v. Baker](https://law.justia.com/cases/california/supreme-court/4th/20/23.html) holds recklessness ≠ professional negligence.
- Sources: [Nolo 2026](https://www.nolo.com/legal-encyclopedia/how-does-the-micra-damage-cap-affect-california-medical-malpractice-case.html); [Milliman AB 35](https://us.milliman.com/en/insight/how-will-ab-35-affect-micra-and-non-economic-damage-caps); [Gov. AB 35 signing](https://www.gov.ca.gov/2022/05/23/governor-newsom-signs-legislation-to-modernize-californias-medical-malpractice-system/). **Confidence: High.**

### 4.2 Auto minimum limits (SB 1107)

- **30/60/15** for policies issued/renewed **on/after 1/1/2025** (first raise since 1967); **50/100/25 in 2035**. Legacy **15/30/5** for pre-2025 policies. Trigger keys off **policy issue/renewal date**, not loss date — prefer stated limits. [SB 1107](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107); [State Farm guide](https://newsroom.statefarm.com/understanding-californias-new-auto-liability-coverage-law-10-2024/). **Confidence: High.**

### 4.3 Prop 213 (Civ. Code 3333.4)

- Uninsured owner/operator (and DUI-convicted plaintiff, and felon injured in flight) recovers **economic damages only** — no non-economic. Defeated by the **at-fault-driver-DUI-conviction** exception (usually unknown at intake → contingency FLAG, route DEVELOP). Passengers and insured drivers are unaffected. [Civ. 3333.4](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=3333.4.&lawCode=CIV). **Confidence: High.**

### 4.4 Recoverable-medicals rule (Howell / Corenbaum / Pebley / Audish)

| Coverage path | Recoverable-value basis | Effect on value tier |
|---|---|---|
| **Insured / in-network** | Amount **paid & accepted** (Howell; Corenbaum extends to future) | Billed number is an **upper bound only** — discount before tiering |
| **Uninsured / lien / out-of-network** | **Full billed / reasonable value** (Pebley) | Higher gross tier — **but net into G1**, lien compresses net |
| **Medicare-eligible (age ~63+/enrolled)** | Future medicals discountable to **Medicare rates** (Audish) | Down-weight large future-medical projections |

- Howell record figures (for any seed docs/examples): **~$189,978.63 billed / ~$59,691.73 paid** (correcting an earlier internal $174k/$41k slip). [Howell](https://law.justia.com/cases/california/supreme-court/2011/s179115/); [Pebley](https://law.justia.com/cases/california/court-of-appeal/2018/b277893.html); [Audish tie-break](https://www.swlaw.com/blogs/product-liability-update/2025/02/26/redefining-the-rules-how-audish-v-macias-reshaped-future-medical-expense-claims-in-california-personal-injury-cases/). **Confidence: High.** Tie-break: for future medicals, the **Audish** reliability-discount dominates the **Pebley** billed-value uplift when Medicare eligibility is cited.

### 4.5 Trucking floors (FMCSA)

- Property carriers **$750k / $1M oil / $5M hazmat** (49 CFR 387.9); passenger carriers **$1.5M (≤15 seats) / $5M (16+)** (387.33). Sets the coverage-path floor far above the auto minimum → higher default value tier, gated by G4 trial-capital. [49 CFR 387](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-387). **Confidence: High.**

### 4.6 Limited-jurisdiction line

- **$35,000** (AB 2347, eff. 1/1/2024), up from $25k. MIST/low-value profiles filed here. Use the current $35k line in the tier config, filing-date-conditioned. **Confidence: High.**

### 4.7 Liability-MSA

- **No LMSA required in 2026** — the CMS future-medicals rule was withdrawn again; there is no formal review process for liability PI future medicals. **Do not** carve out future medicals on a liability case. Reserve MSA logic for the workers'-comp branch only. [LMSA withdrawn](https://www.sandersoncomp.com/blog/lmsawithdrawn). **Confidence: High.**

---

## 5. Liability win-rate priors (BJS)

Feed the liability/comparative-fault dimension so a thin-notice premises case defaults to DEVELOP, not SIGN-NOW.

| case_type | plaintiff trial win-rate | source | confidence |
|---|---|---|---|
| Auto | ~0.52 | [BJS](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005) | High (as *trial* win-rate) |
| Premises | ~0.39 | BJS | High |
| Med-mal | ~0.23–0.27 | [BJS med-mal](https://bjs.ojp.gov/content/pub/pdf/mmtvlc01.pdf) | High |
| Overall tort | ~0.52 | BJS | High |

**Provenance correction (load-bearing):** the widely-cited medians **auto $16k / premises $59k / med-mal $422k** are from the **2001 BJS *Large Counties*** reports ([tort](https://bjs.ojp.gov/library/publications/tort-bench-and-jury-trials-state-courts-2005), [med-mal](https://bjs.ojp.gov/content/pub/pdf/mmtvlc01.pdf)); the **2005 State Courts** report gives auto ~$15k and med-mal ~$682k. Pick **one** report family for the value ladder and cite it correctly — the relative ordering the engine uses is stable across both. **These are winner-only trial medians (upward-biased), encoded with a confidence penalty on absolute magnitude.**

---

## 6. Process priors (settlement, timeline, cost floors)

| Prior | Value | Source | confidence |
|---|---|---|---|
| Global `settle_probability` | ~0.95 (per-type overridable) | [BJS: ~3–5% of tort cases tried](https://maguirelawfirm.com/what-percentage-of-personal-injury-cases-go-to-trial/) | High |
| Time-to-resolution, non-litigated | ~9 months | [Advocate/CAALA cash-flow](https://www.advocatemagazine.com/article/2021-november/managing-cash-flow) | High |
| Time-to-resolution, litigated | ~24 months (≈25.6 filing-to-verdict) | Advocate/CAALA | High |
| Cost floor — soft-tissue auto pre-suit | < ~$1k | [Allen Law](https://www.sjallenlaw.com/costs-to-file-injury-lawsuit-california/) | Medium |
| Cost floor — soft-tissue auto **in-suit** | ~$5k–$20k | Allen Law; [Nolo](https://www.nolo.com/legal-encyclopedia/what-are-costs-in-a-personal-injury-case.html) | Medium |
| Cost floor — **med-mal** | ~$30k–$50k (six figures at trial) | [Helbock](https://www.helbocklaw.com/how-much-is-a-medical-malpractice-case-worth-in-california/) | Medium |
| Cost floor — **trucking/catastrophic** | $150k–$300k+ expert exposure | [Block O'Toole](https://www.blockotoole.com/truck-accidents/) | Medium |
| Contingency fee rate | 0.33 pre-suit / 0.40 post-filing | [Express Legal Funding](https://expresslegalfunding.com/lawsuit-costs/) | High |
| REFER-OUT split (pure referral, Rule 1.5.1) | 25–33% | [Feher Law / Rule 1.5.1](https://feherlawfirm.com/california-attorney-referral-fees-rule-1-5-1-guide/) | High |
| REFER-OUT split (active co-counsel) | 40–50% | Feher Law | High |
| Cost as % of gross recovery (sanity bound) | ~10–15% | [Lawyers.com](https://legal-info.lawyers.com/personal-injury/introduction-to-personal-injury-law/how-much-is-my-personal-injury-claim-worth.html) | Medium |

**Attorney/staff HOURS per case are a NULL** (see §8) — proxy off `(case_track × litigation_status)` until timekeeping data exists.

---

## 7. Lien-reducibility priors (feed G1 Underwater on projected NET, not gross)

The same gross bill compresses net very differently by lien type. **G1 must fire on projected net after statutory reduction, not gross bills.**

| Lien type | Reducibility rank | Mechanism | source | confidence |
|---|---|---|---|---|
| **Medi-Cal** | 1 (most reducible) | Ahlborn medical-only allocation + mandatory 25% fee cut + 50%-of-net cap ("least-of") | [WIC 14124.72/.76/.78](https://codes.findlaw.com/ca/welfare-and-institutions-code/wic-sect-14124-78/) | High |
| **Hospital Lien Act** | 2 | Civ. 3045.4 caps at 50% of net after fees/prior liens; Howell reasonableness | [Civ. 3045.4](https://codes.findlaw.com/ca/civil-code/civ-sect-3045-4/) | High |
| **Workers'-comp** | 2–3 (fact-contingent) | Witt v. Jackson employer-fault credit can reduce or wipe | [Advocate](https://www.advocatemagazine.com/article/2019-march/workers-compensation-liens-and-credit-issues) | High |
| **Medicare (conditional pmts)** | 3 | Federal super-lien, reduced only by 42 CFR 411.37 procurement-cost share | [CMS MSP](https://www.cms.gov/medicare/coordination-benefits-recovery/overview/secondary-payer) | High |
| **ERISA self-funded** | 5 (least / non-reducible) | Plan terms trump made-whole & common-fund (McCutchen) — can claw ~100% | [US Airways v. McCutchen](https://supreme.justia.com/cases/federal/us/569/88/) | High |

**Disposition-flipper:** ERISA **self-funded** vs **insured** turns entirely on plan documents, almost never observable on the call → **ABSTAIN on reducibility, route DEVELOP** (obtain SPD), never worst-case-guess. A Medi-Cal-heavy min-limits case may **clear** G1 while an ERISA-self-funded case with identical gross bills **trips** it.

---

## 8. Honest NULLs (where good data does not exist)

The engine must render these as explicit unknowns, not fabricate a number.

| Missing prior | Why NULL | Interim behavior |
|---|---|---|
| **CA case-type *settlement* distribution** | Verdict reporters paywalled & selection-biased; no public settlement dataset | Use BJS verdict medians (biased high) and IRC paid means (biased low) as bounds; bias auto-BI modestly up; widen confidence band |
| **Soft-tissue / MIST dollar bands** | Only law-firm marketing aggregators, not audited | Seed T0–T1 with **Low** confidence, decay fast, never surface bands |
| **`dog_rate` for dog-bite, product, elder-abuse, WC-third-party, wrongful-death, survival** | No published CA no-fee rate | Render value-tier + mechanism note; state dog-rate unknown until firm data |
| **Venue / county multipliers** | Real (LA plaintiff-friendly ≈ 1/3 of state nuclear verdicts; Orange Co. lower) but no free structured dataset | Keep `incident_county` as an extraction field; multiplier = **explicit null/abstain**; may widen value-confidence band, **never move a disposition**. Acquisition path: licensed verdict feeds (VerdictSearch/Jury Verdict Alert/TopVerdict/Daily Journal) or CAALA/CAOC member data |
| **Attorney/staff hours per case** | No public per-track figure for a 1–5 attorney firm | Proxy off `(case_track × litigation_status)`; instrument timekeeping day one |
| **Life-care-planner / economist professional fees** | Unpublished as advanced costs | Bracket by adjacent tracks; flag for firm-data calibration |
| **Treatment-duration → value magnitude (CA venues)** | Gap-penalty is directional (Colossus) but not magnitude-calibrated for CA | Use as a one-level anchor downgrade, not a dollar figure |

**Dog-bite value note (row 11):** CA leads the U.S. in dog-bite claims — **2,830 claims at $81,789 avg (2025)** vs national $65,450 ([III](https://www.iii.org/article/spotlight-on-dog-bite-liability)). That seats a *run-of-the-mill* single-bite file in **mid T1–T2**, and often lower once a homeowner/renter **sublimit (~$25k), breed exclusion, or off-premises exclusion** applies. Require cited aggravating-damages facts (reconstructive surgery, child facial scarring, nerve damage) to move above the seed. `dog_rate` is NULL.

---

## 9. The template sentence (tier-based, no dollars — compliance-safe)

The engine renders **from `value_tier` + `dog_rate` + `settle_prob`**, never from a dollar band, and always carries the "published prior, not this firm's data" framing.

### Canonical template

> **Boring prior (published data, not this firm's own):** Cases like this — *{case_type}*, *{key-signal}* — have historically landed around **value tier {value_tier}**{, with roughly *{dog_rate×100}%* turning out non-viable}{ and about *{settle_prob×100}%* resolving by settlement rather than trial}. Source: *{source}*. This is a starting baseline; your firm's own results will replace it as cases resolve.

Bracketed clauses are **suppressed when the field is NULL** (e.g., dog-bite renders no dog-rate clause).

### Rendered examples

**Row 1 — Auto BI, soft-tissue, min-limits:**
> Boring prior (published data, not this firm's own): Cases like this — a soft-tissue auto injury on a minimum-limits (30/60) policy — have historically landed around **value tier T0**, with roughly **35%** turning out non-viable and about **95%** resolving by settlement. Source: BJS tort medians + IRC + SB 1107. This is a starting baseline; your firm's own results will replace it as cases resolve.

**Row 9 — Med-mal, any:**
> Boring prior (published data, not this firm's own): Cases like this — a medical-malpractice inquiry — carry **high value potential (tier T3–T4) but are capital-gated**, and roughly **70%** of such inquiries never become a paying claim; the default recommendation for a small firm is **refer out**. Source: CRICO/Candello closed-claims + AB 35 MICRA cap. This is a starting baseline; your firm's own results will replace it as cases resolve.

**Row 11 — Dog-bite (NULL dog_rate):**
> Boring prior (published data, not this firm's own): Cases like this — a single dog-bite with likely homeowner coverage — have historically landed around **value tier T1–T2**, though a policy sublimit or breed exclusion can pull realistic recovery lower. We don't yet have a reliable non-viability rate for this type. Source: Insurance Information Institute CA dog-bite data. This is a starting baseline; your firm's own results will replace it as cases resolve.

**Row 10 — Prop-213 economic-only:**
> Boring prior (published data, not this firm's own): If the caller was an uninsured driver, California law (Prop 213) generally limits recovery to economic damages only — which tends to place cases like this around **value tier T0** and makes roughly **60%** non-viable for a contingency firm, unless an exception applies (e.g., the at-fault driver is convicted of DUI). Source: Civ. Code 3333.4. This is a starting baseline, and the insurance/DUI facts should be confirmed.

---

## 10. Provenance, bias, and decay discipline

- **Two-sided bias.** Every non-statutory band is winner-only verdict data (BJS, biased **high**), insurer-side paid data (IRC/CCC, biased **low**), or aggregator marketing data (soft-tissue/trucking, unaudited). True settlement value sits between the verdict medians and the paid means — auto-BI priors are biased modestly upward to compensate, and all bands are flagged for fast replacement.
- **Statutory rows are config, not flywheel-overwritable** (§4, §7). MICRA caps auto-advance by resolution year; SB 1107 minimums and the $35k limited-jurisdiction line are date-conditioned.
- **`dog_rate` and `value_tier` overwrite first.** Once the firm resolves ~N cases in a cell, the published prior yields to a Bayesian posterior (`published prior → firm posterior`); the engine should expose a per-cell "calibration coverage" metric and **abstain on tier** where firm data is still sparse rather than assert a stale published number.
- **Selective vs volume posture weighting.** Under a selective posture, weight lien-reducibility uncertainty and capital-gated types (med-mal, trucking, product) more heavily toward DEVELOP/REFER-OUT; a volume posture tolerates more uncertainty. This is a posture-config parameter, not a baked-in prior.
- **Compliance:** all dollar bands remain **internal to tier mapping**; the engine renders tiers and rates only, never a dollar figure or a computed deadline, and every prior is spoken as *published, not this firm's data*.

---

### One-line summary for the build

Ship rows 1–17 into `prior_library` keyed by `(case_type, key-signal)` with fields `{value_tier, dog_rate, settle_prob, source, confidence, is_firm_data=false}`; ship §4/§7 as dated statutory **config**; render §9's template; and carry §8's NULLs honestly — the "boring prior" is a floor to be replaced by the flywheel, not a claim to be defended.
