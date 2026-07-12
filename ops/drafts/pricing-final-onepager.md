# Pricing — Final One-Pager (Decision for Ali)  ·  2026-07-12

> **Owner: Ali (§VII — pricing is your call; this closes the three-way split).** Everything below is
> flat-monthly only; nothing touches the §I bright line. This one-pager exists to end the
> compliance-invariants §I ↔ GTM-draft ↔ 2026-07-09 disagreement with ONE table written into §I and
> one dated decisions entry the same day. **Nothing here is published. Numbers route to Ali; if Ali
> reads a §I fee-structure edit as regulated-novel, it routes to Yang before it lands.**

---

## 1. The three tables, side by side

| | **A — current §I** | **B — GTM draft** | **C — 2026-07-09 (RECOMMEND)** |
|---|---|---|---|
| List — Core | $2,500/mo | $1,500/mo | **$2,500/mo** |
| List — Pro | $5,000/mo | $3,000/mo | **$5,000/mo** |
| Founding rate | none | $1,000/mo **permanent** | **$1,500/mo, 12-mo lock** |
| Founding discount depth | n/a | 33% off a low list (and permanent) | **40% off $2,500, expiring** |
| Firms for $1M run-rate | ~34 Core / ~26 blended | ~56 Core / ~43 blended | ~26–34 steady, minus ~$120k yr-1 drag |
| Kills | first-dollar (free→$2,500 cold) | anchors market 60% below authority price | 40% depth must be framed loudly AS a discount |

Numbers are `[assumption]` on the firm-count math (steady-state $1M ÷ annual price, 70/30 Core/Pro
mix); list/founding dollars are the decision variables. B's own rationale text says to price
"deliberately ABOVE the $50–200 call-tool band," yet its $1,000 rate undercuts that argument — an
internal contradiction, flagged.

---

## 2. Wave-9 reasoning (10 lines)

1. Price is the quality proxy buyers use when quality is unverifiable pre-purchase — the exact case of an audit desk.
2. An independent audit priced like an answering service ($200–600 band) forfeits the authority the whole pitch rests on.
3. The pitch bills against the marketing / cost-per-case budget ($2,500+ per signed case), not the tools budget — $2,500 lands there unambiguously; $1,500 floats between bands.
4. At 1–5 attorneys the partner IS the committee; $1,500 vs $2,500 is the same person and the same "is this worth a case" call — the cheaper table buys no friction, only worse math.
5. $1M needs ~26–34 firms at C vs ~43–56 at B; for a one-analyst desk the sales+review hours per firm bind harder than margin (COGS ~$30–50/firm, ~97–98% gross either way).
6. A founding mechanic is required — asking beta firms to jump free→$2,500 cold is the hardest first dollar (A's flaw).
7. A **permanent** discount tells the market the real price is a fiction and anchors it 60% low (B's flaw) — reject.
8. Best-practice founding discount is real-deadline, time-limited, always stated as a discount FROM list — C does this; the $1,500 is a founding rate, never "the price."
9. The 40% depth sits at the aggressive edge of the design-partner norm (see §5) — acceptable ONLY because it is cohort-capped, 12-month-expiring, and bought with references/case studies; state that trade in the offer.
10. Net: C preserves A's authority list price, adds the founding mechanic A lacks, and avoids B's permanent-anchor damage — the only table that satisfies all three constraints.

---

## 3. What each table implies for the LIVE "founding testers lock preferred pricing" promise

The promise is already public in five places (verified in repo): `/pricing`, `/faq`, `/founder`,
`/letter`, and `desk/settings`. It says three things and NO number: (a) free during the beta,
(b) flat monthly at launch, never per-case, (c) **founding testers lock in preferred pricing at
launch**. The public also states the beta cohort is **capped at 5 firms** (`COHORT_MAX = 5`,
"Five founding firms," "the first five").

| | Does it honor the live promise? |
|---|---|
| **A** | Half-honors it. "Preferred pricing" would mean… the same $2,500 list — there is no preferred rate to lock. The promise reads as empty. Defect. |
| **B** | Over-honors it but poisons list: "preferred" = $1,000 permanent, so every later firm's "real" price is visibly a markup. The promise becomes the anchor. |
| **C** | Cleanly honors it: "preferred pricing" = the $1,500 founding rate, a concrete, expiring, below-list number the founding testers actually lock. This is what the live sentence was always gesturing at (Founding → Core). |

**Two live-promise reconciliations C forces (both flagged, neither published yet):**

- **Cap 5 (public beta cohort) vs cap 10 (Table C founding-rate pool).** These are NOT the same set and do not contradict: the public promise is to the **5 beta testers**; the cap-10 simply defines the outer bound of the founding-**rate** pool (the 5 beta firms + up to 5 additional early payers). The promise to the 5 stays intact; raising a cap never breaks a promise, lowering one does. Keep `COHORT_MAX = 5` public as the *beta* number; keep "10" internal as the *pricing-pool* number. **Do not publish either the cap-10 or any dollar.** If Ali would rather the public founding-rate pool BE 5, that is strictly safer and needs no copy change — recommend defaulting to that for launch and expanding later.
- **"Lock in" duration.** The public verb "lock in" can be read by a firm as *permanent* (and the 2026-07-07 charter language literally said "rate locked for life of subscription"). Table C locks for **12 months**, then steps $1,500 → $2,500 — a 67% increase at conversion. The written offer/MOU to founding firms MUST state the 12-month term explicitly so "lock in" is never heard as "forever." This is the single most important framing fix and the biggest churn risk (see §6). Route the exact MOU sentence to Yang with the §I edit.

---

## 4. RECOMMEND

**Adopt Table C: list Core $2,500 / Pro $5,000; Founding Cohort rate $1,500/mo (Core scope), locked
12 months from first invoice, always framed as a time-limited founding discount from the $2,500 list,
capped at the founding pool (publicly 5 beta testers; internal outer bound 10). Kill B's permanent
$1,000 lock. Write C into compliance-invariants §I and a dated decisions.md entry the same day.
No dollar figure reaches the public site during the beta.**

---

## 5. Numbers sanity-check vs 2026 design-partner / founding-cohort norms

Deep-research pass (WebSearch, 2026-07-12). Every claim labeled verified vs plausible-unverified.

- **Design partners expect 20–50% off for the risk they take; structure the depth against concrete deliverables (references, feedback, case study) rather than a blanket cut.** [verified — [SaaStr](https://www.saastr.com/dear-saastr-what-incentives-are-given-to-design-partners-and-other-super-early-customers/)] → C's 40% is INSIDE the design-partner band, at the deep end. Defensible because it is capped + expiring + bought with references, exactly as SaaStr prescribes.
- **General-acquisition discounts >40% led to smaller, slower deals; best-practice acquisition discount is 5–20%, reserving 15–20% for annual/multi-year.** [verified — [PricingSaaS / salesfully 2026 playbook](https://www.salesfully.com/single-post/are-you-leaving-money-on-the-table-the-b2b-saas-pricing-playbook-for-2026)] → the tension is real: 40% is fine as a *design-partner* rate, NOT as a repeatable acquisition tactic. Hard-cap it to the founding pool so it never becomes the default motion.
- **Customers acquired at 30%+ discount churned ~4.2× full-price customers (Stripe data, as cited in 2026 discount guides).** [plausible-unverified — secondary citation in [PlanMySaaS guide](https://www.planmysaas.com/guides/saas-pricing-strategy-guide); original Stripe study not located] → this is the empirical backing for the §6 risk: deep-discount cohorts churn at the step-up. Mitigate by making the value (recovered-fee ledger) undeniable before month 13.
- **Permanent introductory discounts "tell the market your real price is a fiction"; time-box them and always state as a discount from list.** [verified, directional — prior brief cites [Monetizely](https://www.getmonetizely.com/articles/how-to-use-introductory-discounts-without-devaluing-your-product-a-strategic-guide-for-saas-executives)] → confirms killing B's permanent lock.

Net: the norms **support C's structure** (time-boxed, capped, discount-from-list) and **caution on C's depth** (40% is at the risky edge; the mitigation is the cap + the expiry + a hard value-proof before conversion). They **reject B's permanent lock** outright.

---

## 6. Biggest risk (flagged, not smoothed)

**The founding→Core step-up.** $1,500 → $2,500 at month 13 is a 67% increase, and the deep-discount
churn data says this cohort is the most likely to walk at exactly that moment. If the recovered-fee
ledger has not made the value self-evident by then, C converts worse than a shallower discount would
have. Two guards: (1) the 12-month term must be explicit in writing from day one so the step-up is
never a surprise (§3); (2) the north-star metric for founding firms is confirmed recovered fees before
month 13 — that number, not the discount, is what has to close the renewal. Secondary risk: a diligent
firm hearing "lock in preferred pricing" (live copy) and later meeting a 12-month expiry could read it
as bait; the MOU language must pre-empt that. Route both to Yang with the §I edit.

---

## 7. EXACT compliance-invariants §I replacement text (STAGED — do not apply)

**File:** `.claude/skills/compliance-invariants/SKILL.md`, §I, first bullet.

**REPLACE this current text —**

> - **Flat monthly fees only.** Core ~$2,500/mo, Pro ~$5,000/mo. Never price, describe, hint,
>   or imply pricing as a percentage of recovered fees, per-case, per-signed-case,
>   per-settlement, or any variable tied to case outcomes or firm revenue.

**— WITH this text:**

> - **Flat monthly fees only.** List price: Core **$2,500/mo**, Pro **$5,000/mo**. A **Founding
>   Cohort rate of $1,500/mo** (Core scope) is available only to the founding pool — the publicly
>   promised beta cohort (currently 5 firms) plus, at Ali's discretion, up to a total of 10 paying
>   firms — locked for **12 months** from first invoice, after which it steps to the $2,500 list
>   price. The founding rate is always stated as a time-limited founding discount FROM the $2,500
>   list price, never as "the price," and its 12-month term is stated in writing to the firm up front.
>   Never price, describe, hint, or imply pricing as a percentage of recovered fees, per-case,
>   per-signed-case, per-settlement, or any variable tied to case outcomes or firm revenue. **No
>   dollar figure is published on plaintiffops.com during the beta window** (§VII); numbers are
>   quoted individually, in writing, after a firm's free Leak Audit.

Downstream artifacts to reconcile ONCE Ali locks this (all internal, none public): `develop-queue-GTM.md`
§3 table (currently B's numbers), the Supio battlecard "$1,500" line (currently an unauthorized 40%
discount if A were right — becomes correct under C), beta config `TODO(Ali)` numbers, and the
`pricing-decision-brief.md` recommendation (already C).

---

## 8. Reconfirm — nothing leaks a dollar to the public site during beta

Repo scan 2026-07-12 (`grep -rE '\$[0-9]'` across `web/src/app`):
- `/pricing/page.tsx` — **no dollar figure** (verified: grep returns NONE). Copy = "flat monthly at launch, founding testers lock in preferred pricing," no number.
- The only `$` figures found in public copy are **statutory amounts** in `/letter` and `/compliance` — CIPA §632 "$5,000 statutory damages," "$2,500 criminal fine," "$5,000 civil under §637.2." These are cited law, not pricing, and were explicitly kept per the 2026-07-09 decision. **Not a leak.**
- `/faq` and `/founder` state the fee is flat and per-volume with NO number and route price questions to `FOUNDER_EMAIL`. Compliant.

**Conclusion: the public site is clean. Adopting C changes NO public copy** — the founding number lives
only in §I, the MOU (firm-eyes, post-NDA), and internal collateral. The live "lock in preferred pricing"
sentence stays as-is; C just makes the word "preferred" finally mean a real number behind the NDA.

---

## 9. Proposed decisions.md entry (STAGED — paste on Ali's yes, do not append live)

```
## 2026-07-12 — Pricing three-way split RESOLVED: Table C locked  ·  agent: research/pricing · lane: pricing (§VII)
- **Change:** Closed the 2026-07-10 BLOCKED-ON-ALI three-way split. Adopted Table C: list Core
  $2,500/mo, Pro $5,000/mo; Founding Cohort rate $1,500/mo (Core scope), 12-month lock from first
  invoice then steps to $2,500 list; framed always as a time-limited founding discount from list;
  founding-rate pool = the public 5-firm beta cohort + up to 10 paying firms total (internal). Killed
  the GTM draft's permanent $1,000 lock. Rewrote compliance-invariants §I first bullet (exact text in
  ops/drafts/pricing-final-onepager.md §7). No public dollar figure during beta — unchanged.
- **Hypothesis:** an audit desk priced at authority-level list ($2,500) with an expiring, capped
  founding rate ($1,500) preserves the quality signal, gives beta firms a real lock, and needs
  ~26–34 firms for $1M vs ~43–56 under the cheaper table — coherent for one analyst.
- **Sanity-check:** 40% founding depth sits inside the 20–50% design-partner norm (SaaStr) but at the
  risky edge (>40% acquisition discounts underperform; 30%+ cohorts churn ~4.2×); mitigated by the
  cap, the 12-month expiry, and a hard recovered-fee value-proof before the step-up.
- **Biggest risk:** the $1,500→$2,500 month-13 step-up (67%) is the deep-discount churn moment; guard
  with an explicit written 12-month term and confirmed-recovered-fees before renewal.
- **Status:** staged-for-approval — Ali locks the table + §I edit; Yang reads the §I fee-structure
  edit and the founding-MOU "12-month lock" sentence before first live quote (novel-in-regulated-area).
- **Review date:** 2026-08-12 (or first founding-rate quote, whichever first).
- **Result:** (filled at review)
```

---

## 10. Routing (§VII)

- **Ali:** lock Table C (or the §6 fallback), approve the §7 §I edit, decide founding-pool cap (5 public
  default vs internal 10). Pricing change + §I edit are both §VII gates — nothing applies until your yes.
- **Yang:** read the §I fee-structure edit and the founding-MOU "12-month lock / steps to $2,500"
  sentence before any firm hears a number — this is novel-in-a-regulated-area (fee structure).
- **Do NOT** touch `.claude/skills/compliance-invariants/SKILL.md`, `decisions.md`, or any web copy in
  this task. All staged.
