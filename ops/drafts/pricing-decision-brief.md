# Pricing Decision Brief — Pick One Table (Wave 9, 2026-07-10)

> **Decision owner: Ali (§VII — pricing is your call; this brief recommends).** Flat monthly
> only per compliance-invariants §I; nothing below touches that line. Related open conflict:
> the staged Intake Closer pivot's Yang-gated per-signed-case mode contradicts any "never
> outcome-tied, ever" promise — pick this table AND kill one of those two.
> Companion: the BLOCKED-ON-ALI escalation in `ops/decisions.md` (pricing three-way split).

## 1. The three tables, side-by-side

| | **A — Invariants §I** | **B — GTM draft** | **C — 2026-07-09 decision** |
|---|---|---|---|
| Numbers | Core ~$2,500 / Pro ~$5,000 | Founding $1,000 (permanent) / Core $1,500 / Pro $3,000 | Founding $1,500 (12 mo) → Core $2,500 / Pro $5,000 |
| Firms for $1M run-rate | ~34 Core-only; ~26 at a 70/30 Core/Pro mix [assumption] | ~56 Core-only; ~43 blended [assumption] | Same steady state as A, minus ~$120k first-year founding drag [assumption] |
| For | Matches the audit-desk authority position; already the "supreme" doc; prior PR explicitly corrected low tiers *to* these numbers because cheap pricing broke the $1M math | Easiest yes for a solo; closest to the commoditized-tool band prospects already recognize | Keeps A's list price AND gives the beta firms a real, expiring founding offer; it's what "locked $1,500/$2,500/$5,000" actually meant (Founding → Core) |
| Against | No founding mechanic — asks beta firms to jump from free to $2,500 cold; hardest first-dollar | $1,000 *permanent* lock anchors the market 60% below list; needs ~56 firms in year one with the same per-firm sales effort; prices the "independent auditor" like an answering service | 40% founding discount is above the 15–30% "sweet spot" — must be framed loudly as a discount FROM $2,500, never as the price |

Note B's own rationale text says to price "deliberately ABOVE the $50–200 call-tool band" — its $1,000 founding rate undercuts its own argument.

## 2. Budget context — what a 1–5-attorney CA PI firm already pays monthly

| Line item | Monthly spend | Source |
|---|---|---|
| CMS — Clio | $49–$149/user | [Clio pricing](https://www.clio.com/pricing/), [Costbench](https://costbench.com/software/ai-legal-tools/clio/) [sourced] |
| CMS — CASEpeer (PI-specific; most firms buy Pro $119) | $79–$149/user | [Lawyerist](https://lawyerist.com/reviews/law-practice-management-software/casepeer/), [aiforlawfirms](https://aiforlawfirms.org/casepeer-pricing/) [sourced] |
| Answering — Smith.ai live | ~$292.50 for 30 calls | [Smith.ai](https://smith.ai/pricing/receptionists) [sourced] |
| Answering — Answering Legal solo | ~$360 (100 min @ $3.60) | [Answering Legal](https://www.answeringlegal.com/answering-service-cost) [sourced] |
| Intake/answering services generally | $200–$2,500 | [Easybee](https://easybeereceptionist.com/blog/how-much-does-a-legal-answering-service-cost/), [JustCall](https://justcall.io/blog/legal-inbound-call-center.html) [sourced] |
| **Marketing (largest line)** — PI firms spend 10–20% of revenue; $2,500–$8,000 cost per *case*; $312–512 per lead; LA CPCs $250–400+ | Small firms $1k–3k; aggressive PI firms far more | [Grow Law](https://growlaw.co/blog/law-firm-marketing-budget), [Taqtics](https://taqtics.com/answers/google-ads-for-lawyers/lawyer-ppc-cost/), [ROA](https://roa-marketing.com/blog/attorney-google-ads-cost-per-click-2026/) [sourced] |
| Enterprise call-QA (the adjacent category) | Observe.AI ~$69/agent/mo (one module), full platform $60k–180k/yr w/ 100-seat min; CallMiner $3k–12k/mo | [Prospeo](https://prospeo.io/s/observeai-pricing-reviews-pros-and-cons), [CheckThat](https://checkthat.ai/brands/callminer) [sourced] |

Read: the tools band tops out ~$600/mo; the marketing band starts ~$2,500/mo *per signed case*. $1,500 sits ambiguously between them; $2,500 unambiguously bills against the marketing/case-recovery budget — which is the budget the pitch ("the case you almost lost") actually targets.

## 3. Value anchor — one recovered mid-tier case

CA soft-tissue MVA settlements run **$5k–$75k+, honestly a very wide range** ([victimslawyer.com](https://www.victimslawyer.com/blog/average-whiplash-settlement-amounts-in-california/), [JLF](https://jlffirm.com/average-soft-tissue-injury-settlement/) [sourced]); contingency fees 33–40% [sourced] → **fee to the firm ≈ $1.7k–$30k, mid-tier plausibly $8k–15k** [assumption]. Annual price: A/C Core = $30k/yr ≈ 2–4 mid-tier fees; B Core = $18k/yr ≈ 1.5–2. One genuinely high-tier recovery (e.g., a commercial policy) dwarfs a year at any table. ROI is *told*, never structured into the fee (§I).

## 4. Unit economics

Assumptions: 75 calls/firm/mo avg 10 min (~12.5 hrs audio); AssemblyAI $0.15–0.37/hr → **~$2–5** [sourced pricing, assumed volume]. Claude scoring (cached prefix): ~$0.06–0.10/call incl. develop-queue passes and retries → **~$8–25**. Infra share (Vercel/Supabase/Resend) **~$20** [assumption]. **COGS ≈ $30–50/firm/mo → gross margin ~97% at $1,500, ~98% at $2,500** [assumption]. Margin doesn't decide this — the binding costs are Ali's analyst-of-record review hours per firm and the sales effort per firm, both of which argue for *fewer firms at higher price*. Beachhead supply: CAALA/CAOC-scale membership suggests low-thousands of CA plaintiff firms [assumption] — 26–34 paying firms ≈ ~1–2% penetration (aggressive but coherent); 56 firms at half price is strictly harder, not easier.

## 5. Recommendation: **Table C** — list $2,500/$5,000, founding $1,500 locked 12 months

- **Price-as-signal:** an independent audit desk priced like a gym membership undercuts its own authority; buyers use price as a quality proxy precisely when quality is unverifiable pre-purchase — the exact situation of an audit ([Vistaar](https://www.vistaar.com/blog/premium-pricing-strategy), [softwarepricing.com](https://softwarepricing.com/blog/is-premium-pricing-a-good-strategy-for-b2b-software/) [sourced, directional]).
- **No committee to dodge:** at 1–5 attorneys the partner *is* the committee; $500-ish no-approval thresholds are big-company constructs ([Corma](https://www.corma.io/blog/saas-procurement-policy-template) [sourced]). $1,500 vs $2,500 is the same decision-maker and the same "is this worth a case" conversation — so the cheaper table buys no friction reduction, only worse math.
- **Founding mechanic that doesn't poison list:** discount best practice — real deadline, time-limited (6–12 mo for complex products), always stated as a discount from list; permanent flat discounts "tell the market your real price is a fiction" ([Monetizely](https://www.getmonetizely.com/articles/how-to-use-introductory-discounts-without-devaluing-your-product-a-strategic-guide-for-saas-executives), [shareyoursaas](https://shareyoursaas.com/blog/how-to-price-a-saas-product-for-early-customers/) [sourced]). Kill B's *permanent* $1,000 lock. The 40% founding depth is above the recommended 15–30% band — acceptable only because it's cohort-capped (first 5–10), 12-month expiring, and buys references/case studies; state that trade explicitly in the offer.
- $1M needs ~26–34 firms — hard but coherent for one analyst; B's ~43–56 is not.

**Exact replacement text for compliance-invariants §I, first bullet** (route through Yang if she reads §I as fee-structure-adjacent; log a dated decisions.md entry same day):

> - **Flat monthly fees only.** List price: Core **$2,500/mo**, Pro **$5,000/mo**. A **Founding Cohort rate of $1,500/mo** (Core scope) is available only to the first 10 paying firms, locked for 12 months from first invoice, and is always stated as a time-limited founding discount from the $2,500 list price — never as the price. Never price, describe, hint, or imply pricing as a percentage of recovered fees, per-case, per-signed-case, per-settlement, or any variable tied to case outcomes or firm revenue.

Downstream fixes once locked: develop-queue-GTM §3 table, Supio battlecard "$1,500" line, beta config `TODO(Ali)` numbers.

## 6. If you disagree (fallback)

If you believe solo-attorney firms genuinely can't clear $2,500, adopt B's Core $1,500 — but make the founding rate **time-limited, not permanent**, keep Pro at $5,000 (not $3,000) to preserve the upgrade anchor, and accept in writing that $1M now requires ~50 paying firms. Either way, write ONE table into §I and decisions.md today; the three-way split is costing you every artifact it touches.
