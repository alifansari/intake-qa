# Insights Ledger

> The research analyst writes here. Builders read here before acting. Each insight is
> dated, sourced, and tagged with which lane(s) it affects and a confidence label
> (verified / plausible-unverified). Newest on top.

## Format

```
## YYYY-MM-DD — [short title]
- **Finding:** one or two sentences.
- **Source:** primary source(s), with URL or citation. "No citation, no claim" applies here too.
- **Confidence:** verified | plausible-unverified
- **Affects:** product | website | outreach | strategy
- **Implied hypothesis:** → (added to ops/backlog.md as B-NNN)
```

---

## Seed — foundational research already in the business's DNA (verified, load-bearing)

These are the intellectual load-bearing walls. Agents should reach for them, not re-derive them.

- **Actuarial beats clinical (Meehl 1954; Grove & Meehl meta-analyses).** Structured/statistical
  judgment reliably matches or beats unstructured expert judgment. → Justifies a *scored*,
  rubric-based intake evaluation over gut feel. Affects: product, outreach.
- **Signal detection theory (ROC; hit vs. false-alarm tradeoff).** Every scoring threshold trades
  sensitivity against false alarms; publishing the false-alarm rate is a trust move, not a
  weakness. Affects: product, website (Calibration & Honesty page).
- **Diagnostic classification precedent (BI-RADS; Clawson MPDS emergency dispatch).** Tiered,
  standardized confidence language already governs high-stakes human judgment in medicine and
  911 dispatch — direct precedent for intake scoring tiers. Affects: product.
- **Audit/expert-report conventions (AICPA AUP; FRCP 26 expert reports; Daubert defensibility).**
  The Monthly Missed-Revenue Statement borrows the *form* of a defensible opinion. Affects: product.
- **Lead-response decay (MIT/InsideSales; Harvard Business Review "Lead Response Management").**
  Odds of qualifying a lead collapse within minutes; grounds the Recoverable-Lead Alert. Affects:
  product, outreach.
- **Insurance "leakage" reversal (McKinsey/Allstate).** The industry term for value lost to
  process failure — reframed from the plaintiff side as recoverable revenue. Affects: outreach, website.
- **Dispute transformation (Felstiner–Abel–Sarat "naming, blaming, claiming").** A grievance
  becomes a case only if it's named, blamed, and claimed — intake is where that transformation
  succeeds or fails silently. Affects: outreach (manifesto), product.
- **Testimonial injustice (Miranda Fricker).** Credibility deficits (accent, class, language) cause
  intake staff to under-credit real claimants — the Spanish-intake quality gap is a justice problem,
  not just a conversion problem. Affects: product (Spanish gate), outreach (earned-PR pillar).
- **Street-level bureaucracy (Lipsky).** Intake staff exercise unexamined discretion under load;
  scoring makes that discretion visible and improvable. Affects: product, outreach.
- **Speech-act theory (Austin; Ali's "Staked Words").** A signed attestation is a performative that
  stakes the analyst's credibility — the core of why the deliverable is trusted. Affects: product, website.

---

## 2026-07-07 — CYCLE: Strategic foundation for $1M ARR (NorCal PI). Regulatory-first scan + path-to-$1M model + wedge.

### A. REGULATORY WATCH (first-order — clears the model, with two live flags)

- **A1. AB 931 + SB 37 both chaptered Oct 2025; effective Jan 1, 2026. Our flat-fee model survives — but this is the load-bearing legal call.**
  - **Finding:** AB 931 (Ch. approved 10/10/2025) prohibits an attorney from "promising or giving anything of value to a person for the purpose of recommending or securing the attorney's or the attorney's law firm's services" (with narrow exceptions: permitted gifts, bar-operated referral services). Fee-sharing prohibition applies to contracts entered 1/1/2026–1/1/2030. SB 37 (Umberg, Ch. 645, Statutes of 2025, 10/11/2025) toughens the anti-"capping" regime, creates a **private right of action** for consumers harmed by unlawful solicitation, and broadens the definition of "advertisement." Penalties cited: SB 37 civil penalties $5,000–$100,000/violation; AB 931 up to $10,000/incident or 3× advanced amount.
  - **Why we clear it:** (1) Intake QA is paid a **flat monthly fee not tied to case outcomes or recovery %** — structurally distinct from prohibited fee-sharing (Rule 5.4's own carve-outs turn on comp NOT "tied to the fees of specific cases"). (2) Intake QA **does not recommend, secure, refer, or steer clients** to any attorney — it scores the firm's OWN inbound calls and helps the firm re-engage its OWN leaked leads. AB 931's "anything of value for recommending/securing services" and SB 37's anti-capping both target someone who STEERS a claimant to a lawyer for payment. We are the opposite vector: we never touch claimant acquisition-for-a-fee. (3) Rule 7.2(b) parallel: paying a nonlawyer is barred only when it's for "recommending the lawyer's services" — a QA/software vendor fee is not that.
  - **Source:** JDSupra/Shipkevich summary of AB 931 & SB 37 (https://www.jdsupra.com/legalnews/attorney-fee-sharing-prohibited-8840366/); CalMatters Digital Democracy SB 37 bill page (https://calmatters.digitaldemocracy.org/bills/ca_202520260sb37); Advocate Magazine "Navigating California Rule 5.4" Feb 2026 (https://www.advocatemagazine.com/article/2026-february/navigating-california-rule-5-4); CA Rule 7.2 exec summary (calbar.ca.gov Rule_7.2 redline).
  - **Confidence:** verified (statutes + Bar rule text) for the facts; **plausible-unverified** for the legal conclusion that we clear them — this is my analysis, NOT a legal opinion. → **ROUTE TO YANG before any public claim that we are "compliant with AB 931/SB 37."** §I and §VII require it.
  - **Affects:** strategy, product, outreach, website (compliance page).
  - **Implied hypothesis:** → B-005.

- **A2. SB 37's broadened "advertisement" definition is claimant-facing, not B2B — our outreach to FIRMS stays outside it, but copy discipline tightens.**
  - **Finding:** SB 37 redefines advertisement as communication "that provides information concerning a lawyer or the lawyer's services for the purpose of encouraging individuals to secure the services of the lawyer." Emphasis on "encouraging individuals to secure the services" = potential CLIENTS, not law-firm buyers. Our newsletter, Dream-25 mailers, LinkedIn, and 1:1 email sell software TO FIRMS and are not attorney advertising. But SB 37 also bans "unverifiable claims and misleading guarantees" — reinforces our existing "no citation, no claim" / no-guarantee invariants for anything a firm might republish.
  - **Source:** CalMatters SB 37 bill page (above); Advocate Magazine June 2025 advertising/legislation piece.
  - **Confidence:** verified (statute); analysis plausible-unverified.
  - **Affects:** outreach, website. **Implied hypothesis:** confirms Decision-log guardrail; no new backlog item, but a copy-audit is warranted (folded into B-005).

- **A3. CIPA §632 / pen-register litigation is exploding (>4,000 cases), and SB 690 to strip the private right of action is STILL PENDING as of July 2026 — the mystery-shop protocol must stay CIPA-safe regardless.**
  - **Finding:** CIPA website-tracking/pen-register suits jumped from ~600 to >4,000 cases; SB 690 (amended June/July 2026) would remove the private right of action for Penal Code §§638.50/638.51 and give enforcement to the AG only, but it has NOT passed (Assembly Privacy & Consumer Protection heard it 7/1/2026). Ninth Circuit *Popa* (Aug 2025) tightened Article III standing (must show concrete/private-info injury). This is website-tracking law, adjacent to but distinct from our §632 all-party-consent recording exposure.
  - **Source:** Holland & Knight (hklaw.com/en/insights/publications/2026/02/uncertainty-continues...); Troutman Pepper Locke SB 690 alert (troutman.com/insights/sb-690-amended...); Barnes & Thornburg 2026 CIPA alert.
  - **Confidence:** verified.
  - **Affects:** product (mystery-shop benchmark), website (any tracking pixels).
  - **Implied hypothesis:** Keep the mystery-shop fixed-scenario, Yang-signed, no-live-claimant protocol locked; audit plaintiffops.com for any pen-register-style trackers before traffic scales. → folded into B-005 / B-001.

### B. THE PATH-TO-$1M MODEL (unit economics + funnel, backward from $1M ARR)

- **B1. The arithmetic of $1M ARR at flat pricing.**
  - **Finding [ESTIMATE — assumptions stated]:** ARR = 12 × MRR. To hit $1.0M ARR ≈ $83.3K MRR. Tier mix scenarios (Core $2,500/mo = $30K ARR each; Pro $5,000/mo = $60K ARR each):
    - **All-Core:** 34 firms (34 × $30K = $1.02M).
    - **All-Pro:** 17 firms (17 × $60K = $1.02M).
    - **Blended 60/40 Core/Pro (base case):** avg ARR/firm ≈ 0.6×$30K + 0.4×$60K = $42K → **~24 paying firms** = $1.008M ARR.
  - **Single biggest constraint (honest):** NOT market size (see B-map) and NOT pricing — it is **PROOF-OF-VALUE VELOCITY**: converting a free Leak Audit → signed pilot → paid flat fee fast enough, repeatedly, with a founder-led sales motion. 24 paying firms is small in absolute terms but each requires an independent, evidence-backed value demonstration (the audit) that takes analyst time. The binding constraint is **founder/analyst hours per closed firm**, not TAM.
  - **Confidence:** ESTIMATE (arithmetic is exact; the mix is an assumption).

- **B2. Funnel math backward (base case: 24 paying firms in 12 months).**
  - **Finding [ESTIMATE — conversion assumptions flagged weakest→]:** Working backward with stated rates:
    - Paying firms needed: **24**
    - Pilot→paid conversion: assume **50%** [WEAKEST assumption — no owned data yet; industry pilot-conversion for niche B2B SaaS ranges wildly 20–60%]. → pilots needed: **48**
    - Qualified-conversation→pilot: assume **40%** [weak — depends on audit quality]. → qualified conversations: **120**
    - Outreach-touch→qualified-conversation: assume **8%** reply-to-qualified on warm, personalized, authority-led outreach (Dream-25 mailer + LinkedIn + newsletter), NOT cold blast. → **~1,500 targeted outreach touches** over the year (~125/mo), heavily concentrated on a Dream-25 + second-ring ~200-firm list, i.e. multiple touches per firm.
    - **Sanity check:** 24 closes / ~200 seriously-worked firms = **12% account-level close rate** over a year of multi-touch, audit-led selling. Aggressive but not fantasy for a differentiated, founder-sold wedge. If pilot→paid is really 33% (not 50%), you need ~72 pilots and the model likely slips to an 18-month, not 12-month, $1M — flag this as the base-rate risk.
  - **Confidence:** ESTIMATE. The two numbers that decide everything: **pilot→paid conversion** and **audit→pilot conversion**. Instrument both from firm #1.

- **B3. Monthly ramp (illustrative, base case).**
  - **Finding [ESTIMATE]:** Front-loaded pilots, back-loaded revenue. Illustrative net paying firms by month-end: M1–2: 0 (audits + founding-cohort pilots running free); M3: 2; M4: 4; M5: 6; M6: 9; M7: 12; M8: 15; M9: 18; M10: 20; M11: 22; M12: 24. Exit-run-rate ARR ≈ $1.0M reached in **month 12**, meaning average recognized ARR over year 1 is far below $1M — **the $1M is an exit run-rate, not year-1 booked revenue.** Be explicit about that distinction with any investor/founder framing.
  - **Confidence:** ESTIMATE (illustrative curve).

- **B4. The ROI story that makes the flat fee a rounding error (this is the sales spine).**
  - **Finding [VERIFIED inputs → ESTIMATE conclusion]:** PI paid-channel economics: **cost per lead ~$284; cost per SIGNED case ~$468 at a 7% lead→case rate** across 13 plaintiff firms / $3.3M spend [VERIFIED — rankings.io 2026]; exclusive live-transfer leads $250–$600+, auto-accident leads $300–$1,500, truck $500–$1,500+ [VERIFIED — same]. Speed-to-lead: sub-5-min response → 35–45% intake conversion vs. 5–15% at one hour [VERIFIED-as-reported — talkroute/amalga/getstafi, industry sources not peer-reviewed]. **35% (34.8%) of calls to small/mid law firms go UNANSWERED even 10am–4pm** (1,200-call field test) and **80% of those callers hang up without leaving a message** [VERIFIED-as-reported — LegalNavigator.ai/Law Leaders internal study, n=1,200; NOT independent/peer-reviewed — treat as a lead to replicate in OUR CIPA-safe benchmark, not as gospel].
    - **The math that sells:** a single recovered signable PI case is worth a contingency fee typically **>$10,000** (often far more). Recovering even ONE leaked case per quarter pays for a full YEAR of Core ($30K). At $468–$960 all-in acquisition cost per signed case, a firm already spending 5–16.5% of revenue on marketing [VERIFIED — rankings.io] is bleeding cases it ALREADY PAID to acquire when 35% of calls go unanswered. Intake QA sells the recovery of sunk-cost leads — the cheapest cases a firm can win.
  - **Data-integrity flag:** A secondary source claimed "$468 cost per signed case at 7% conversion" AND "$960 at 25% conversion" — those are inconsistent ($284/7% ≈ $4,057, not $468; the $468 figure appears mis-derived or from a different denominator). **Use $284/lead as the clean VERIFIED anchor and present cost-per-signed-case as a RANGE ($468 reported low end to ~$960+), never a point estimate.** No citation, no claim.
  - **Confidence:** lead/case costs VERIFIED; speed-to-lead & 35%-unanswered VERIFIED-AS-REPORTED (industry, self-interested sources — replicate before publishing as our own claim); ROI conclusion ESTIMATE.
  - **Affects:** outreach, product (Recoverable-Lead Alert, Monthly Statement), website.
  - **Implied hypothesis:** → B-006 (build our OWN independent benchmark to replace self-interested vendor stats).

### C. NORCAL PI MARKET MAP

- **C1. Market size — bounding the addressable NorCal solo/small PI firm count.**
  - **Finding [ESTIMATE from VERIFIED anchors]:** CA has **~190,000 active attorneys** [VERIFIED — State Bar; some sources say 200K+]. National benchmarks put PI as a large but single-digit-to-low-double-digit share of practice; solo+small firms (2–10 attys) dominate PI. Directory triangulation (Justia/Super Lawyers/Avvo list hundreds of PI attorneys per NorCal metro). **Defensible ESTIMATE:** the serviceable NorCal solo/small plaintiff-PI firm universe (Greater Bay Area + Sacramento + San Jose + surrounding counties) is on the order of **~800–1,500 firms** that advertise/generate leads at enough volume to have an intake-leakage problem worth scoring. **We need ~24 of them.** That is a **~2–3% penetration** of the serviceable niche — the market is NOT the constraint (reinforces B1).
  - **Source:** State Bar attorney demographics (apps.calbar.ca.gov/members/demographics.aspx); Justia/Super Lawyers NorCal PI directories (directory counts, not a firm census). **Gap flagged:** no clean primary count of "NorCal small-PI firms by size" exists in public data; recommend Ali/analyst build it from State Bar + directory scraping next cycle.
  - **Confidence:** attorney count VERIFIED; firm-universe ESTIMATE (weak — needs a real census).

- **C2. Geographic concentration & referral networks.**
  - **Finding [ESTIMATE/plausible]:** Concentrations: **San Francisco / Oakland-Alameda, San Jose-Santa Clara, Sacramento**, plus Contra Costa, San Mateo, Fresno (Central Valley edge). Referral rails to map: **Consumer Attorneys of California (CAOC)** and its NorCal chapters (CAOC sponsored BOTH SB 37 and AB 931 — the plaintiff bar's political home, and a concentrated audience), county trial-lawyer associations (SFTLA, Santa Clara County TLA, Capitol City Trial Lawyers/Sacramento), and Cal-ABOTA. These are the earned-authority distribution points for the benchmark report.
  - **Source:** CAOC legislation page (caoc.org/?pg=legislation) confirms CAOC sponsorship of SB 37/AB 931.
  - **Confidence:** concentrations plausible-unverified; CAOC sponsorship VERIFIED.

- **C3. "Dream 25" ideal-fit definition.**
  - **Finding [STRATEGY, not fact]:** Ideal-fit firm signals — (1) **Size:** 2–10 attorneys (big enough to have paid lead flow + an intake team, small enough that the owner feels every leaked case and decides fast). (2) **Case mix:** auto/MVA, premises, and other volume PI where lead cost is $300–$1,500 and intake volume is high. (3) **Ad-spend behavior:** visibly running Google LSA/PPC, TV, or buying leads (findable via ad-transparency, LSA badges, billboards) — they PAY per lead, so leakage has a hard dollar cost. (4) **Intake-pain signals:** after-hours calls to voicemail, no bilingual intake, generic 1-800 answering service, slow web-form follow-up, Spanish landing pages with English-only phone trees (the Spanish gap, C4). (5) **Owner psychographic:** growth-minded, metrics-curious, feels the "cases we let slip" pain.
  - **Confidence:** STRATEGY (ICP hypothesis to validate with real firms).

- **C4. The Spanish-intake gap — a justice story WITH a number (NorCal-specific).**
  - **Finding [VERIFIED anchors]:** Statewide **~28.8% of Californians speak Spanish at home** [VERIFIED — Census/ACS 2019–2023 range]. San Francisco–Oakland–Fremont metro: **43.4% speak a language other than English at home** [VERIFIED — Census Reporter, ACS 2024 1-yr]; the brief's ~16.7% Spanish-at-home for the metro is consistent with that envelope [treat metro-Spanish as ~15–17%, VERIFIED-range]. Fricker testimonial-injustice framing (seed insight): accent/language credibility deficits cause intake staff to under-credit real Spanish-speaking claimants → signable cases lost at the FIRST call. In a market where ~1-in-6 to 1-in-3 potential claimants' first language is Spanish, English-only intake is both a conversion leak AND an equity failure.
  - **Source:** Census Reporter SF-Oakland-Fremont profile (censusreporter.org/profiles/31000US41860...); ACS statewide Spanish-at-home (~28.8%).
  - **Confidence:** demographics VERIFIED; the causal intake-gap claim = Fricker-framed hypothesis (plausible-unverified until measured in our benchmark).
  - **Affects:** product (Spanish gate), outreach (earned-PR pillar). → B-002 sharpened.

### D. THE DIFFERENTIATED WEDGE — 2–3 durable, defensible moves

- **D1. The INDEPENDENT-scorer moat (the one competitors structurally cannot copy).**
  - **Finding [VERIFIED competitive scan]:** Every incumbent scoring/QA/intake tool is either (a) the firm's OWN CRM/tool grading its own funnel — Lawmatics QualifyAI, Law Ruler, Clio Grow, Lead Docket/LeadsAI — or (b) an answering/AI-voice vendor grading ITS OWN work — Smith.ai, Intaker, CallRail Conversation Intelligence. **None is an independent third party with no stake in the outcome scoring the firm's intake.** That is exactly the Moody's / J.D. Power / Consumer Reports structural position: trust and pricing power come from *independence* + *published methodology*, not features. A CRM literally cannot become independent of the firm; an answering service cannot independently grade itself. **The moat is a conflict-of-interest they can't escape without dismantling their own business model.**
  - **Source:** competitor scan (smith.ai, serviceagent.ai, cloudtalk.io, proplaintiff.ai, callrail.com 2026 listings).
  - **Confidence:** VERIFIED (positioning of named competitors) + STRATEGY (that independence is the durable edge).
  - **Novel move:** Formalize "Analyst of Record" as a **signed, staked attestation** (Austin speech-act model) on every deliverable — a named human independently stakes their credibility on the score. No SaaS dashboard can replicate a signed independent opinion; it's the difference between a credit *tool* and a credit *rating*.

- **D2. The CIPA-safe "State of NorCal PI Intake" benchmark as the category-defining authority asset.**
  - **Finding [STRATEGY grounded in evidence]:** The 35%-unanswered stat and speed-to-lead cliffs currently circulating are all self-interested VENDOR studies (B4 flag). **There is no independent, methodologically-published benchmark of NorCal PI intake quality.** If Intake QA runs the CIPA-safe fixed-scenario mystery shop (Yang-signed, no live claimants, §632-safe) across a defined NorCal firm sample and publishes it like a J.D. Power study — with a scored rubric, tiered confidence, and a PUBLISHED false-alarm rate — it becomes the ONLY citable independent source in the category. Competitors can't cite it without citing us; press and CAOC chapters can. This is the second-touch that earns the first meeting (B-001) AND the earned-PR vehicle for the Spanish gap (D3).
  - **Confidence:** STRATEGY. → B-001 (elevated) + B-006.

- **D3. The Spanish-intake-gap benchmark as a justice-framed, high-variance PR wedge nobody else will touch.**
  - **Finding [STRATEGY + VERIFIED demographics]:** No competitor is positioned to publish "X% of NorCal PI firms cannot competently intake a Spanish-speaking claimant" as a *justice* finding — CRM vendors and answering services have every incentive NOT to indict the market they sell into. Intake QA, as the independent scorer, is the ONLY actor whose business model rewards surfacing it. Framed with Fricker (testimonial injustice) + hard Census numbers (C4), it's a story with a number that trial-lawyer media and mainstream press will carry, and it converts moral authority into inbound. **Defensible because it requires both independence (D1) AND a methodology (D2) — a two-lock combination no incumbent holds.**
  - **Confidence:** demographics VERIFIED; PR-leverage = STRATEGY.

### E. SHARPENED BACKLOG — see ops/backlog.md re-scores (B-001 elevated; new B-005 regulatory-clearance, B-006 independent benchmark).

**Single highest-leverage next move this cycle:** Fund **B-006 → B-001**: build the independent, CIPA-safe NorCal PI intake benchmark (with Yang-signed protocol) — it simultaneously (a) replaces the self-interested vendor stats we currently lean on with OUR OWN citable number, (b) is the second-touch authority asset that earns first meetings, (c) is the vehicle for the Spanish-gap PR wedge, and (d) instantiates the independent-scorer moat that competitors structurally cannot copy. One asset, four strategic jobs.

## 2026-07-10 — Persona field guides (5 verified web-research passes; full guides in session transcript)

**The managing partner (2–10 atty CA PI):** ~45% of time is admin; vendor tools get one
distracted 20–30 min first session and <5 min/week after. Bounce triggers: "AI-powered" as
headline, no pricing, vendor-computed "you're losing $84k" math (65% of B2B buyers call
vendor ROI math inflated), superlatives, non-PI language (billable hours = outsider tell).
Trust builders: peer names (CAALA listservs are THE channel), founder-inside-the-vertical,
run-it-on-MY-calls demos, published methodology he can hand a skeptic, humility about AI
("flags for a human to review"). Daily email survives week 3 only if exception-based and
forwardable without login; monthly statement = P&L-style, ≤2 pages, HIS arithmetic.
Vocabulary: signable/PNC/policy limits/MIST/dog/specials/statute; never "clients" for
unsigned callers.

**The intake coordinator:** also the receptionist and often a case manager (192-case
loads documented); ~47-second attention spans, 5–15 fragmented min/day for any new tool.
Adoption killers: boss-sees-score-first, red numbers with no path to green, scored on
things she can't control, tool-as-surveillance-witness (HBR: monitoring RAISES
rule-breaking unless perceived fair), data-entry taxes (37% admit faking required CRM
fields), leaderboards in a 2-person team. Wins: she sees her own calls first, credit
framing ("3 signed cases came from your callbacks"), callback list as a gift not a quota,
one screen/one queue/tap-to-dial, one-tap logging (Reached/Left VM/Bad number/Signed/Not
interested), warm 2-sentence openers (service framing), symmetric tracking (attorney
follow-up tracked too). Per-case bonuses are ethically barred (Rule 5.4 analogs) —
recognition and discretionary-bonus ammunition are the only upside the tool can offer her.

**Callback science (for the rescue loop):** 93% of converted leads are reached by the
6th call attempt but most firms quit after ~2 (Velocify, 3.5M leads); Falkowitz retained
250 of 1,000 nine-month-old "dead" leads; stopping rule = "not interested / hired another
firm," nothing else. Best contact windows: 4–6pm, Wed/Thu (MIT/InsideSales). Gong (90k
cold calls): stating the reason for the call 2.1×'s success — openers referencing THEIR
prior call are the mechanism. Talk tracks beat verbatim scripts except for brand-new reps.

**Applied 2026-07-10 (commit 969c30a):** LeakCard one-tap phone-reality statuses +
bad_number + undo/reopen + warm opener; grading language off the staff surface; honest
heartbeat; demo caller names/phones; beta-aware Settings/Billing; zero-call Calls page.
**Not yet applied (backlog):** queue ordering/archival of terminal cards, attempt-count
nudge toward 6 touches, 4–6pm callback-window hint, statute clock, coordinator
"your wins" tally, engine v2 triage rubric (gated on attorney review).

<!-- New research insights go above this line, newest on top. -->
