# The Goal Model: What CA Plaintiff PI Attorneys Actually Optimize at Triage (Wave 12, 2026-07-11)

> **Status:** staged research brief — the objective-function foundation for the v2 engine
> build. Read with `engine-v2-attorney-blindspots.md` (execution errors) and
> `engine-v2-scoring-architecture.md` (build mechanics). Synthesized into
> `engine-v2-objective-spec.md`.

## 1. The primary objective function: maximize risk-adjusted NET FEE PER ATTORNEY-HOUR, subject to a capital and a capacity constraint

The single best-attested formulation in the literature is not fee-per-case. It is **return per hour of time invested**. The foundational legal-economics model (Schwartz & Mitchell, 1970, restated in Calandrillo et al., *Contingency Fee Conflicts*, 26 NYU J. Legis. & Pub. Pol'y 1 (2023)) states it verbatim: **"The aim of the profit-maximizing contingent-fee lawyer is to get the highest possible return per hour of time spent."** The article's worked example is exactly the engine-relevant scenario: a lawyer who can settle at $15k for 10 hours ($500/hr) vs. $21k for 40 hours ($175/hr) rationally takes the smaller settlement because her time redeploys to the next case — the divergence appears "whenever the likely contingency fee recovery falls below the lawyer's opportunity cost." [sourced: Calandrillo et al.]

Kritzer (*Risks, Reputations, and Rewards*, Stanford UP 2004) — the only book-length empirical study of contingency practice — frames the whole practice as **a portfolio whose invested asset is the lawyer's time**: "The investment is largely the lawyer's time and the return is the fee." Case selection is portfolio construction. [sourced]

Three additional terms bind, each with evidence:

- **Capital efficiency (costs advanced).** Costs are the firm's own money at total risk (CAALA's Pierson: expect ~10% of case value in costs; a wrong med-mal case is "six figures in costs alone" — Advocate Magazine, Nov. 2023). For a small firm, dollars of advanceable capital — not leads — is often the binding constraint on how many litigation-track cases it can hold. [sourced]
- **Cash-flow timing.** Contingency firms live on an irregular fee cycle; the practice-finance literature (Esquire Bank, Advocate Capital, Anders CPA) describes the standing dilemma as "whether to spend money prosecuting the cases in their inventory today or invest in signing more cases" — the portfolio needs a deliberate MIX of quick-settle pre-lit files (payroll) and long-tail litigation files (wealth). A triage decision is partly a liquidity decision. [sourced]
- **Capacity/slots.** Time is inventory; a signed dog occupies a slot whose cost is the EV of the displaced good case. [prior wave]

**Precise form [inference, assembled]:** maximize Σ over signed cases of `P(recovery) × net fee (post-Howell, post-lien, limits-capped)` **per attorney-hour**, subject to (a) advanced-cost capital ≤ budget, (b) case slots ≤ capacity, (c) a cash-flow smoothness constraint on the settlement-timing mix. A per-CASE optimizer signs the $300k case needing 800 hours; a per-HOUR optimizer may refer it out and keep three $60k pre-lit files. Real small-firm owners are per-hour optimizers with a capital constraint — which is why the referral fee (fee > 0, hours ≈ 0, capital = 0) keeps showing up as the mathematically dominant outcome for whole categories of intake.

## 2. Risk goals: asymmetric constraints, not symmetric terms

Loss aversion here is rational because the downside cases are not mirror images of the upside — they consume the scarce inputs (time, capital, license, sanity) that all other cases need. Triage is designed around four catastrophes:

1. **The time-sink/underwater case.** 18–24 months, $8k+ costs eaten, break-even-or-negative fee, client nets ~$0. Advocate's med-mal management piece is explicit that the cases you DON'T take matter more than the ones you do; the profiled firm accepts ~2–3% of inquiries. [sourced]
2. **The malpractice trap.** A missed SOL/Gov. Code §911.2 deadline is "one of the most clear-cut and devastating forms of legal malpractice" and damages equal the value of the expired claim — so a *signed* marginal case carries tail risk a *declined* case never does. Critically, the asymmetry is legal, not psychological: under **CRPC 1.16 + CCP §284 the client can fire you at will, but you cannot fire the case** — "a case that lacks merit is probably not a basis for justifiable withdrawal," and in litigation you need court permission. Signing converts an option into an obligation of competence and diligence (CRPC 1.1, 1.3). This is why "sign and see" is misconduct-adjacent. [sourced]
3. **The client-from-hell.** Under *Fracasse v. Brent* (1972) 6 Cal.3d 784, a client who fires you pre-settlement owes only quantum meruit — payable **only if and when they later recover** — while your advanced costs sit in someone else's case file. Add bar-complaint exposure at disbursement when liens eat the client's net. Intake red-flag lore (fee negotiators, prior-attorney shoppers, value-obsessed callers) exists precisely to screen this. [sourced]
4. **Trial-risk exposure.** The defense verdict on a $250k-costs file is a total loss of the firm's own capital. Selective firms underwrite this deliberately; volume firms structurally avoid it by never signing cases that require it. [prior wave]

**Engine translation [inference]:** these are GATES and caps, not additive negatives. One bad case genuinely can eat ten good fees, so the engine must be allowed to be "unfairly" harsh on downside markers.

## 3. Non-economic goals that still bind

- **Referral-network reputation.** Fisher's model is explicit: "My clients are not injury victims. My clients are attorneys who can send us a steady stream of cases." Declining/referring gracefully *is the marketing engine* for the selective firm; Simon (Advocate, June 2024) shows the reciprocity loop. [sourced]
- **Carrier credibility.** Adjusters and carrier software track which firms file and try cases; a mill letterhead triggers the lowball range, a trial-firm letterhead moves the offer on EVERY file. Signing dogs you'll dump cheap degrades the settlement value of your whole inventory — a portfolio externality of one intake decision. [sourced]
- **Firm identity / perfect-case criteria.** Glass (Great Legal Marketing) teaches firms to "aggressively reject cases that do not meet their 'perfect case criteria'"; identity discipline is itself an asset. [sourced]
- **Ethics as constraints, not preferences.** Competence/diligence attach at signing; CRPC 1.5.1 makes refer-out clean (pure referral fee, written client consent). The constraint shape matters: ethics rules never make a case *more* attractive; they only remove actions from the feasible set. [sourced]
- **Staff morale/sanity [inference, widely attested]:** the bad case generates 10× the inbound-communication load; intake screens for "respect for you and your staff" as a signable criterion. [sourced: ABA intake piece]

## 4. The two coherent postures (both rational; different objective functions)

- **Volume/mill:** maximize `n × small_fee` with minimal hours/case and near-zero cost advance; never try cases. Objective: per-hour maximization achieved by *shrinking hours per case*, accepting the carrier's mill-discount as a cost of scale. Borderline files → sign.
- **Selective/boutique:** maximize per-hour by *raising fee per case* (severity, trial credibility premium) while strictly rationing slots and capital; borderline files → develop or refer.
- **The CA solo/1–5 beachhead sits in between and — per the Wave-3 finding — closer to volume behavior than it admits: it signs almost everything not disqualified, and its real constraint is follow-up and capital, not selection discipline.** It runs a hybrid: pre-lit auto/premises volume for cash flow, plus an aspiration to keep the occasional trucking/gov case in-house. The engine's posture config is therefore honest, not cosmetic.

## 5. The time dimension: triage as option exercise

Sign-now / develop / refer / decline are four exercises of one option. The develop option is **cheap information purchase before irreversible commitment** (police report, limits letter, first MRI), rational whenever `cost of information << EV swing it resolves` and no deadline forces exercise. Sign-now is forced exercise (SOL, §911.2's six-month clock, perishable evidence). Refer-out is the per-hour optimizer's ace: the min-limits dog worked in-house nets ~$1,250 over 18 months; referred at 25% under CRPC 1.5.1 it nets ~$1,250 for one phone call — an effectively infinite hourly rate plus a referral-network deposit. Decline is the free disposal option, and executed gracefully it still pays reputation yield. [sourced]

## The 10 engine-design implications

1. **Denominate value in fee-per-hour, not fee-per-case:** every case estimate needs an hours/effort tier, or the engine silently becomes a per-case optimizer that over-signs big slow files.
2. **Track capital separately from time:** `cost_to_develop` is not a score deduction, it's a draw against a configurable firm capital budget.
3. **Score the four downside archetypes as gates/caps** (underwater, SOL-trap, client-risk, trial-capital), never as linear penalties — one flag may legitimately zero a file.
4. **Treat signing as option-destruction:** the engine should price the irreversibility (CRPC 1.16 lock-in) — a marginal SIGN must beat a DEVELOP on information value, not just on EV.
5. **Refer-out gets an explicit EV (≈25% × downstream fee, at ~0 hours) and competes on per-hour terms** — it will and should WIN whole categories. (Engine outputs TIER comparisons, never dollar figures, per standing compliance rails.)
6. **Develop recommendations must name the resolving fact, its cost, and the deadline** — the option is only rational while information is cheaper than the EV swing.
7. **Hard-deadline detection (SOL, §911.2) flips the engine's advice from develop to sign-now** — urgency reverses the option logic. (As FLAGS, never computed dates.)
8. **Posture config changes THRESHOLDS on borderline files (sign vs develop/refer), not just weights** — that's the actual behavioral difference between mill and boutique.
9. **Add a portfolio/cash-flow lens:** a quick-settle file and a long-tail file with equal EV are not interchangeable to a firm making payroll; expose `expected_carry` as a tiered mix input.
10. **Count reputation yield on non-sign outcomes:** graceful decline/refer is a positive-value event (referral flow, carrier credibility); an engine that scores only signed revenue re-creates v1's core defect.

Sources: [Calandrillo et al., NYU JLPP 26:1](https://nyujlpp.org/wp-content/uploads/2024/03/JLPP-26.1-Calandrillo-et-al.pdf) · [Kritzer, Risks, Reputations, and Rewards (SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=572883) · [Advocate: med-mal firm management](https://www.advocatemagazine.com/article/2023-november/starting-and-running-a-successful-medical-malpractice-firm) · [Advocate: referral/co-counsel fees (Simon)](https://www.advocatemagazine.com/article/2024-june/passive-income-referral-and-co-counseling-fees) · [Advocate: managing cash flow](https://www.advocatemagazine.com/article/2021-november/managing-cash-flow) · [Esquire Bank: contingency cash-flow cycle](https://esquirebank.com/the-irregular-cash-flow-cycle-of-contingency-fee-law-firms/) · [Fisher/TonaLaw podcast](https://tonalaw.com/podcast/022/) · [CLA: permissive withdrawal](https://calawyers.org/california-lawyers-association/permissive-withdrawal-from-the-representation-of-a-client-yes-but-no-hot-potato-withdrawals/) · [CRPC 1.16 text](https://www.calbar.ca.gov/Portals/0/documents/rules/Rule_1.16.pdf) · [Fracasse v. Brent (Justia)](https://law.justia.com/cases/california/supreme-court/3d/6/784.html) · [Henderson Law: missed SOL malpractice](https://www.hendersonlawllc.com/legal-malpractice-and-missed-deadlines-what-to-do-when-your-attorney-lets-the-statute-of-limitations-expire/) · [ABA: intake screening](https://www.americanbar.org/groups/young_lawyers/resources/tyl/practice-management/how-to-conduct-client-intake-and-screening/) · [Dolman: settlement mills](https://www.dolmanlaw.com/blog/personal-injury-settlement-mills-loved-by-insurance-carriers/) · [Anders CPA: PI firm KPIs](https://anderscpa.com/learn/blog/personal-injury-firm-kpis/)
