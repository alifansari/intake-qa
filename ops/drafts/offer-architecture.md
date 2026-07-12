# Offer Architecture — the Charter Firm + the Risk-Reversal Guarantee (STAGED DRAFT)

> **STATUS: STAGED. Nothing here is published, priced live, or sent.** This is the
> post-beta conversion offer (the moment a free beta firm becomes a paying Charter firm at
> the ~6-week window close), designed now so it exists before the first conversion
> conversation. Sub-objective 3.4 · backlog **B-008** (paid Charter replaces free pilot) +
> **B-010** ($25k find-it-free guarantee as risk reversal).
>
> **⚠ TWO HARD GATES:**
> 1. **PRICING → Ali (§VII, §I).** Every dollar figure below assumes **Table C** from
>    `pricing-decision-brief.md` (list $2,500 Core / $5,000 Pro; Founding $1,500 Core-scope,
>    first 10 firms, locked 12 months, always a discount FROM $2,500). Ali must lock ONE
>    table into compliance-invariants §I + a dated `decisions.md` entry before any figure is
>    quoted. The three-way price split is still BLOCKED-ON-ALI (`decisions.md:211`).
> 2. **GUARANTEE FRAMING → Yang (§VII, novel-in-a-regulated-area).** Part B proposes a
>    structural change to the guarantee and asks Yang to pick among three constructions. The
>    drafted review question is in **§7**. Nothing about the guarantee ships or is spoken to a
>    prospect before her read.
>
> Compliance spine honored throughout: flat monthly only (§I); no outcome-tied / %-of-recovery
> / per-case / per-signed language (§I); dollar figures are estimates with stated assumptions,
> never guarantees of recovery (§IV); no "only/best/#1"/guarantee-of-results (§V); staged, a
> human sends (§VII).

---

## 0. What already exists (do not reinvent — this sharpens it)

The offer is not a blank page. Three assets are already built and compliance-reviewed:

- **The `$25,000 find-it-free guarantee`** lives in `web/src/lib/site-constants.ts:162–168`
  (`GUARANTEE_CANONICAL`, `GUARANTEE_BADGE_LINE`, `GUARANTEE_METHODOLOGY`). It is **suspended
  for the beta window** (the desk is free, so there is no fee to waive) and returns at launch.
  Structure today: *if the free Leak Audit doesn't identify ≥$25k in estimated missed signable
  case value, we won't pitch you a subscription, and if you start one anyway your first month
  is free.* Trigger = value **identified**, never fees **recovered**.
- **The Charter constants** (`site-constants.ts:171–176`, `COHORT_MAX = 5`) + the
  intact-but-unrendered billing/`CHARTER_*` objects from PR #3. The founding-cohort mechanic
  already has honest, no-countdown language.
- **The compliance page** (`compliance/page.tsx:70–78`) already states the guarantee's legal
  theory: *"it triggers on estimated value identified in a firm's own calls, never on fees
  recovered… creates no outcome-fee arrangement under §§6151-6152 / SB 37 and no earnings
  claim under FTC §5 / CA §17500."*

So this draft's job is **architecture + a decision, not invention**: (1) specify the Charter
*exchange* (what the firm gives, what it gets, on what paper); (2) pressure-test the guarantee
and hand Yang a clean menu, because the current dollar-threshold construction carries a §IV /
SB-37 tension a plain satisfaction guarantee does not.

---

## PART A — THE CHARTER FIRM OFFER (B-008)

### A1. The core idea: the free pilot selects for tire-kickers; a paid Charter with a real exchange selects for partners

A free pilot converts on hope and selects for people who like free things. A **Charter** — a
paid founding membership with a locked rate, given *in exchange for* design-partner work — tests
the one assumption that decides the whole business (pilot→paid) with real money, and recruits
firms who behave like owners because they are paying like owners. This is the 2026-07-07
strategic reprioritization ("charge from day one") made concrete.

**Crucially, the Charter is a two-way trade, not a discount.** The founding rate is not a
fire-sale; it is *consideration for four things the firm gives us that a normal customer
doesn't.* Naming the exchange out loud is what keeps a $1,500 rate from anchoring the market at
$1,500 — the price is $2,500; the Charter firm earns the $1,000/mo delta by doing design-partner
work (this is standard early-customer discount discipline: a discount tied to a deliverable, with
a deadline, stated as a discount from list — [Monetizely on introductory discounts](https://www.getmonetizely.com/articles/how-to-use-introductory-discounts-without-devaluing-your-product-a-strategic-guide-for-saas-executives), directional).

### A2. What the Charter firm GIVES (the consideration — this is the moat's fuel)

| # | What they give | Why it's worth the delta to us |
|---|---|---|
| 1 | **Design-partner feedback on a cadence** — the structured per-artifact feedback capture already built (beta program layer, 0c) + a standing **monthly 30-min design call** with the Analyst of Record. | The product's roadmap gets set by 5–10 real CA PI firms instead of a founder's guess. Fastest path to a product firms 11+ pay full freight for. |
| 2 | **Their recorded intake calls, under NDA + CIPA consent chain** — the raw material of the outcome-labeled corpus. | **This is the durable moat** (insight B-016: the outcome-labeled corpus accrues only with calendar time; every uninstrumented month is permanently-lost training data). The Charter cohort is where the corpus is born. |
| 3 | **Case-outcome labels** — permission to learn which flagged cases actually signed / were worth what (the retrodiction/outcome-flywheel spine). | Turns a QA log into a validated actuarial instrument — the thing no CRM or answering service can build because they don't have independent, cross-firm, outcome-linked call data. |
| 4 | **An opt-in named reference / case study** (permissioned, de-identified by default; named only on explicit sign-off). | References fund the channel. The 2026-07-07 plan is explicit: the founding cohort's job is to become the reference base that makes cold outreach warm. |

Rails on the exchange (compliance): call data flows only under the executed **mutual NDA** +
per-call **CIPA consent attestation** already gated in the product; the deletion cascade covers
everything derived; outcome labels are the firm's confidential data under the NDA; no testimonial
implies guaranteed results (§V — no claimant testimonials, ever). None of this is a fee for
referrals or a share of anything — it is data-for-discount, a standard design-partner trade.

### A3. What the Charter firm GETS (the value stack — assembled, not invented)

1. **The Founding rate: $1,500/mo Core scope, locked 12 months** [Table C — Ali gate]. Always
   presented as *"the list price is $2,500; your Charter rate is $1,500, locked for a year,
   because you're helping us build it."*
2. **Rate protection.** Reconcile the two live promises before quoting: the PR-#3 language said
   *"rate locked for life of subscription"*; the pricing brief says *"12 months."*
   **Recommend the 12-month lock** (cleaner, matches Table C, avoids a perpetual below-list
   liability), with an explicit renewal courtesy: *"we'll give you 60 days' notice and never
   move you to more than list."* Flag for Ali — this is a real money decision, not a copy nit.
3. **A direct line to the Analyst of Record.** Not a support queue — Ali, named, accountable
   (the "Analyst of Record" staked-attestation position, §I positioning).
4. **Roadmap influence** — the monthly design call means their intake pain sets the build order.
5. **The risk-reversal guarantee** (Part B) at launch — the thing that makes the *first* yes safe.
6. **Priority everything** — first in line for Spanish-language QA, per-rep coaching rollups (Pro),
   priority turnaround.

### A4. Structure & terms (all flat, all §I-clean)

- **Cohort cap:** first **10** paying Charter firms. (Note the collision to resolve: the *beta*
  founding cohort is `COHORT_MAX = 5`; the *paid Charter* cap in the pricing brief and PR-#3 is
  **10**. Recommend: **5 beta firms → the Charter opens to 10 total paid seats**, so beta firms
  convert into the first 5 Charter seats and 5 remain for warm-outreach closes. Ali confirms.)
- **Term:** month-to-month, auto-renew, **30-day cancel any time** (no lock-IN — the *rate* is
  locked, the *commitment* is not; this is a feature, not a hedge).
- **Real deadline:** the Charter closes at the **10th paid firm or a dated cliff** (e.g., 90 days
  after beta launch), whichever first. A deadline that's real converts; an open-ended founding
  offer never does ([Monetizely], directional). No fake countdowns, no "3 seats left" theater
  (the founding-cohort constants already forbid this — keep that discipline).
- **Paper:** flat monthly subscription agreement; **no outcome-tied language anywhere**; CIPA
  consent chain + deletion cascade on offboard; Ali as **Analyst of Record / independent scorer,
  not a fee participant**; the design-partner deliverables (A2) named as the consideration for
  the founding rate. **Novel fee/consent wording → Yang before first use (§VII).**

### A5. Naming

Recommend **"Charter Firm"** (already the internal name; connotes founding-member permanence and
a chartered standard, which rhymes with the independent-standard/"Moody's of intake" position).
Reject "pilot" (selects tire-kickers), "beta customer" (sounds unfinished at the paid stage),
"partner" (Rule-5.4 optics — we are emphatically *not* a partner in the firm). "Charter Firm" it is.

---

## PART B — THE RISK-REVERSAL GUARANTEE (B-010) [→ YANG]

### B1. The Hormozi lens (grounded, then disciplined by compliance)

Alex Hormozi's *$100M Offers* catalogs four guarantee types — **unconditional** (no-questions
refund), **conditional** (refund tied to a specific trigger), **anti-guarantee** (all sales
final), and **implied/performance** (provider paid only on client success). His claims, relevant
here: a strong guarantee reverses the buyer's risk and can *reduce* refund rates by attracting
committed buyers; **conditional guarantees convert better than unconditional** because they
qualify buyers and repel free-riders ([Shortform summary of Hormozi on guarantees](https://www.shortform.com/blog/alex-hormozi-guarantees/); [Greg Faxon $100M Offers summary](https://www.gregfaxon.com/blog/100m-offers-summary)). Verified as an accurate
rendering of Hormozi's framework; **the efficacy claims are his assertion, not independently
established** — treat as directional marketing theory, not evidence.

**The compliance overlay flips one of his four off the table immediately:** the
**implied/performance guarantee** ("we're paid only if you succeed") is the *exact* structure
compliance-invariants §I bans — it is an outcome-tied / contingent fee by another name. So our
menu is drawn only from **unconditional** and **conditional**, and the conditional trigger must
be something *we* deliver, never something the firm *recovers*.

### B2. The bright line, stated precisely (this is the whole compliance argument)

> **A service/satisfaction guarantee promises something the VENDOR controls and delivers
> (an audit, a finding, a satisfaction standard, an SLA). An outcome-fee promises the vendor a
> stake in something the CLIENT'S CASE produces (a recovery, a settlement, a signed case).**

Everything legal about our guarantee rests on staying entirely on the left side of that line:

- **Trigger** = value **identified in the firm's own calls** by our diagnostic — a deliverable
  we produce and cite to a transcript span. Not fees recovered, not cases signed, not settlements.
- **Remedy** = a **fixed** thing (we decline to pitch; or one free month; or a refund) — never a
  variable amount that scales with the firm's outcome. A variable remedy would smuggle the
  outcome-tie back in.
- **Why this clears §§6151-6152 / SB 37:** those statutes reach *sharing in, or being paid
  contingent on, recovered fees* (the capping/outcome-fee framework). A guarantee whose trigger
  and remedy both live on the vendor-deliverable side creates no share of and no contingency on
  recovery. This is the theory already on `compliance/page.tsx`. **Verified**: the statutory
  targets (per-case/outcome pricing reached via §§6151-6152, backed by SB 37's $5k–$100k private
  right of action) — see `yang-ab931-sb37-clearance-memo.md` and insight 2026-07-07 A1.
  **Plausible-unverified**: that our specific guarantee construction clears them — *this is
  precisely the analysis that must be Yang's, not an agent's.*

### B3. The tension the current $25k construction imports (the real reason this routes to Yang)

The existing `$25,000 find-it-free` guarantee is well-built, but it **fuses two different things**
and by doing so imports risk a plain satisfaction guarantee wouldn't carry:

1. **It guarantees a DOLLAR figure.** `GUARANTEE_CANONICAL` promises to identify *"at least
   $25,000 in estimated missed signable case value."* But compliance-invariants **§IV** says
   *"dollar recovery figures are estimates with stated assumptions and confidence, never
   guarantees."* We are, structurally, **guaranteeing that an estimate will exceed a threshold.**
   That is defensible (it's value *identified*, we control the methodology, we disclaim recovery
   three ways) — but it is the softest surface in the whole offer, and it is novel.
2. **SB 37 broadened "advertisement" to bar "unverifiable claims and misleading guarantees"**
   ([Walker Advertising on SB 37](https://www.walkeradvertising.com/navigating-california-attorney-advertising-law-sb37/); [Cal. Rule 7.1 — an express guarantee of a result is per se
   false/misleading](https://www.calbar.ca.gov/legal-professionals/rules/rules-professional-conduct/current-rules-professional-conduct/chapter-7-information-about-legal-services)). **We are not a
   law firm, so Rule 7.1 does not bind us directly.** But two live vectors remain: **(a)** if a
   Charter firm **republishes** our guarantee/badge, does the dollar-denominated "$25k" become,
   in the firm's hands, attorney advertising containing a results-adjacent claim with "no
   reasonable factual foundation" for *that* firm? **(b)** Independent of the Bar rules, does a
   reasonable buyer read "we guarantee we'll find you $25,000" as an **earnings/results promise**
   that FTC §5 / CA §17500 (false advertising) would test against our ability to substantiate it
   firm-by-firm? A satisfaction guarantee ("cancel in month 1, full refund") raises **none** of
   this ([FTC 16 CFR §239.3 on advertised satisfaction guarantees](https://www.law.cornell.edu/cfr/text/16/239.3); [Robert Freund Law on money-back-guarantee advertising risk](https://robertfreundlaw.com/los-angeles-false-avertising-litigation-attorney/avoid-problems-with-money-back-guarantees/)).

**The insight:** the *risk reversal* (what makes the first yes safe) and the *value proof* (the
firm's own missed-value number) are two jobs. The current construct welds them into one
dollar-threshold guarantee, which is why it carries §IV/SB-37 weight. **They can be decoupled.**

### B4. The recommended architecture: decouple the reversal from the dollar proof

Present Yang **three constructions**, recommend a hybrid:

**Construction 1 — Dollar-threshold conditional (the current build).**
"If the audit doesn't identify ≥$25k in estimated missed value, first month free."
*Strongest marketing punch; highest §IV / SB-37 / §17500 tension.* Keep only if Yang blesses the
dollar guarantee as a service claim.

**Construction 2 — Count-based conditional (the compliance-clean conditional).**
"If our audit doesn't surface at least **[N] cited, signable-case leaks** — specific
value-determining questions your reps missed on real calls, each tied to a transcript span —
your first month is free."
*Anchors on a countable deliverable WE fully control and cite; no dollar promise, so §IV is not
implicated and there's no earnings-claim surface. Still a real, falsifiable, confidence-inspiring
bet on our own diagnostic.* This is the Hormozi conditional (qualifies buyers, we stake our
finding) with the compliance tension engineered out.

**Construction 3 — Unconditional satisfaction (the bulletproof floor).**
"Your first month is fully refundable. Cancel in the first 30 days for any reason, full refund,
no questions." *Cleanest possible compliance; weakest differentiation; conditional converts
better per Hormozi.*

**RECOMMENDED HYBRID:** **Construction 3 as the stated guarantee** (the risk reversal — clean,
unimpeachable, what goes on the badge/paper) **+ the dollar figure demoted from a *guaranteed
threshold* to a *per-firm audit finding*** shown in the readout ("here is *your* estimated missed
value, cited, with assumptions"), never as a number we promise in advance. Optionally layer
**Construction 2's count-trigger** as the "we won't even pitch you unless we find real leaks"
qualification bar. This **keeps the full persuasive force** (an unconditional money-back reversal
*plus* the firm's own shocking number in their own readout) while **removing the guaranteed-dollar
surface entirely.** The "$25,000" stops being a promise and becomes an observed finding — exactly
what §IV says a dollar figure must be.

### B5. Guarantee terms (whichever construction survives Yang)

- **Fixed remedy only:** one free month **or** a first-month refund — never a variable amount.
- **One clean trigger, plainly stated,** with any material condition disclosed up front (FTC:
  advertised guarantees must disclose material limitations — [16 CFR §239.3](https://www.law.cornell.edu/cfr/text/16/239.3)).
- **Honor it without friction** (the obligation to honor a stated guarantee is mandatory once
  offered — [Dickinson Law, satisfaction-guarantee obligations](https://sites.psu.edu/entrepreneurshiplaw/2025/03/19/money-grab-through-money-back-what-you-should-know-about-satisfaction-guarantees/)). A guarantee you argue about is worse than none.
- **Stays suspended during the beta** (no fee to waive); returns with published pricing at launch,
  in whatever construction Yang clears.
- **No claimant testimonials, no implied results guarantee anywhere near it** (§V).

---

## §7 — THE YANG GATE (drafted review question — Ali sends; §VII)

> **To:** Roberta M. Yang · **Re:** Guarantee construction — service guarantee vs. the SB-37
> "misleading guarantee" / outcome-fee line (one decision, three options)
>
> Roberta — one focused question with a recommendation attached; a yes/no on the recommendation
> plus any redline is all I need.
>
> **Context.** At launch (not during the current free beta) we want a risk-reversal guarantee on
> the paid subscription. The firm bright line we hold is flat-monthly-only, never a share of or
> contingent on any recovery (§§6151-6152 / SB 37). Our guarantee is designed to trigger on value
> our audit *identifies in the firm's own calls* — a deliverable we produce and cite — never on
> fees the firm *recovers.* We are not a law firm and Rule 7.1 doesn't bind us directly, but I'm
> worried about two things: **(a)** a Charter firm *republishing* our guarantee and it becoming,
> in their hands, a results-adjacent claim under the Bar's advertising rules / SB 37's broadened
> "unverifiable claims and misleading guarantees" bar; and **(b)** an FTC §5 / §17500 earnings-claim
> reading of a **dollar-denominated** guarantee ("we'll find you $25,000").
>
> **Q1 (the decision).** Of these three, which may we run — and would you rephrase any?
> 1. **Dollar-threshold:** "if the audit doesn't identify ≥$25k in estimated missed case value,
>    first month free."
> 2. **Count-based:** "if the audit doesn't surface at least N cited, signable-case leaks (each
>    tied to a transcript span), first month free" — no dollar figure.
> 3. **Unconditional:** "first 30 days fully refundable, no questions."
>
> **My recommendation:** run **#3 as the guarantee**, and show the dollar figure only as a
> *per-firm finding in that firm's own readout* (cited, with assumptions), never as a promised
> threshold — so the guarantee carries no dollar claim and no earnings surface. Optionally add
> #2's count-trigger as a qualification bar. **Is that the safe construction, or do you prefer a
> different combination?**
>
> **Q2 (yes/no).** Independent of which we pick: does our guarantee — trigger on value
> *identified*, fixed remedy (free/refunded month), never scaling with the firm's outcome — sit
> cleanly on the **service-guarantee** side of the §§6151-6152 / SB-37 outcome-fee line, or is
> there a construction detail you'd change to keep it there?
>
> **Q3 (short answer).** Is there any republication risk we should pre-empt with a one-line "for
> firm evaluation only; not for use in your advertising" legend on the guarantee/badge?
>
> Nothing ships or is spoken to a prospect before your read. — Ali

---

## §8 — RISKS & HONESTY FLAGS (§VIII)

1. **The dollar guarantee is the softest surface in the entire offer.** If we keep Construction 1
   and a firm republishes "$25k guaranteed," we've handed a plaintiff-side theory a dollar number
   under SB 37's new private right of action ($5k–$100k/violation). The decouple in B4 is not a
   nicety — it's the risk-elimination move. Recommend defaulting to the hybrid even if Yang would
   bless the dollar version, because "safe *and* still persuasive" beats "blessed but exposed."
2. **Pricing is not locked.** Every number here is Table-C-provisional and BLOCKED-ON-ALI. If Ali
   picks Table B ($1,500 permanent), the "discount from $2,500" framing that keeps the Charter
   rate from anchoring the market collapses, and the whole A3/A4 story needs a rewrite. This offer
   cannot go live until one table is in §I.
3. **Cohort-cap collision (5 vs 10) is a live inconsistency**, not a rounding issue — beta says 5,
   Charter says 10. Left unreconciled it produces contradictory public copy. Recommend 5→10 (§A4).
4. **Rate-lock term conflict (12 months vs "life of subscription")** is a real balance-sheet
   decision, flagged not smoothed. Recommend 12 months.
5. **N=5–10 is too small to make any efficacy claim.** The guarantee must never harden the beta's
   correlation data ("firms resolving >X% within SLA upgraded N cases") into a promise. Keep it
   confidence-tiered and directional (this is already a standing flag in `develop-queue-GTM.md`).
6. **Hormozi's efficacy claims are marketing theory, not evidence** — cited as directional, and
   every one of his four types was filtered through §I (which killed the performance guarantee
   outright). Don't let a compelling framework override a bright line.

---

## §9 — PROPOSED `ops/decisions.md` ENTRY (staged — not appended live)

```
## 2026-07-12 — Offer architecture: Charter Firm + risk-reversal guarantee (B-008/B-010)  ·  agent: research/offer sub-agent · lane: pricing/GTM (§VII)
- **Change (STAGED, not shipped):** Designed the post-beta conversion offer.
  (A) Charter Firm = the paid founding membership that replaces the free pilot: first 10 paid
  seats (beta's 5 convert in, 5 for warm outreach), Founding $1,500/mo Core-scope locked 12
  months as an explicit discount FROM $2,500 list [Table C — ALI GATE], month-to-month /
  30-day cancel / real cohort+date cliff. The founding rate is CONSIDERATION for four
  design-partner deliverables — cadence feedback + monthly design call, recorded calls under
  NDA+CIPA (the corpus/moat), case-outcome labels (the actuarial spine), and an opt-in
  reference — i.e. data-for-discount, never a fee for referrals or a share of anything.
  (B) Risk-reversal guarantee: RECOMMEND decoupling the reversal from the dollar proof —
  run an UNCONDITIONAL first-month-refund satisfaction guarantee as the stated guarantee, and
  demote "$25,000" from a guaranteed threshold to a per-firm audit FINDING shown in the firm's
  own cited readout (so no dollar is ever promised; §IV honored). Menu of 3 constructions +
  drafted Yang question staged.
- **Hypothesis:** charging from day one with a locked founding rate tied to a real exchange
  tests pilot→paid with real money and builds the reference base (2026-07-07 reprioritization);
  a clean risk reversal makes the first yes safe without importing a guaranteed-dollar surface.
- **Compliance:** flat-monthly only (§I); guarantee triggers on value IDENTIFIED not RECOVERED,
  fixed remedy never variable (the service-guarantee vs outcome-fee line); no results guarantee
  / no claimant testimonials (§V); suspended during the free beta, returns at launch.
- **Status:** staged-for-approval. GATES: Ali locks a pricing table into §I + resolves the
  5-vs-10 cohort cap and the 12mo-vs-life rate lock; **Yang picks the guarantee construction
  (§7 question) BEFORE any guarantee ships or is spoken.** Nothing published, sent, or built.
- **Review date:** at first Charter conversion conversation (post-beta, ~6 weeks after 7/14).
- **Result:** —
```

---

### Sources (verified vs. directional labeled inline)
- Hormozi guarantee framework — [Shortform](https://www.shortform.com/blog/alex-hormozi-guarantees/), [Greg Faxon](https://www.gregfaxon.com/blog/100m-offers-summary) (framework verified; efficacy claims = his assertion, directional).
- Cal. Rule 7.1 (express result-guarantee = per se misleading; binds lawyers, not us directly) — [State Bar Ch.7](https://www.calbar.ca.gov/legal-professionals/rules/rules-professional-conduct/current-rules-professional-conduct/chapter-7-information-about-legal-services).
- SB 37 broadened "advertisement" + "unverifiable claims / misleading guarantees" bar + private right of action — [Walker Advertising SB-37 summary](https://www.walkeradvertising.com/navigating-california-attorney-advertising-law-sb37/); cross-ref `yang-ab931-sb37-clearance-memo.md` (statutes VERIFIED; our-clearance analysis plausible-unverified → Yang).
- FTC advertised-satisfaction-guarantee disclosure duty — [16 CFR §239.3](https://www.law.cornell.edu/cfr/text/16/239.3); money-back advertising risk — [Robert Freund Law](https://robertfreundlaw.com/los-angeles-false-avertising-litigation-attorney/avoid-problems-with-money-back-guarantees/); obligation-to-honor — [Dickinson Law](https://sites.psu.edu/entrepreneurshiplaw/2025/03/19/money-grab-through-money-back-what-you-should-know-about-satisfaction-guarantees/).
- Early-customer discount discipline (deadline, deliverable-tied, discount-from-list) — [Monetizely](https://www.getmonetizely.com/articles/how-to-use-introductory-discounts-without-devaluing-your-product-a-strategic-guide-for-saas-executives) (directional).
- Internal: `pricing-decision-brief.md` (Table C), `site-constants.ts:162–176`, `compliance/page.tsx:70–78`, `develop-queue-GTM.md`, backlog B-008/B-010/B-016.
