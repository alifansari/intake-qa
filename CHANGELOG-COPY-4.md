# CHANGELOG-COPY-4.md — the independent recovery desk (v3 report)

Fourth rewrite. Deliberately REVERSES four round-3 decisions (Ali approved all) and
preserves every still-valid fix from rounds 1–3. Copy + static pages only; product
core and the test suite are untouched (130/130 green; `next build` compiles, 44
static pages). All offer numbers live in `web/src/lib/site-constants.ts`.

## Reversals of round 3

| Round 3 (was) | Round 4 (now) | Why |
|---|---|---|
| $500 paid Leak Audit, credited to first invoice | **FREE** Intake Quality Audit | A cold-start, zero-testimonial founder shouldn't demand money and trust at once; free diagnostics fit top-of-funnel for a founding cohort. |
| $50,000 Find-It Guarantee, refunds the $500 fee | **$25,000 find-it-free**: if the free audit doesn't surface ≥$25k in estimated missed signable case value, we won't pitch a subscription — and if you start one anyway, first month free | The old guarantee attached to a fee that no longer exists; the new one attaches to the subscription decision + a diagnostic threshold, never a recovery. |
| Category-king "Case Acquisition Intelligence" hero | **"the independent recovery desk"**; CAI demoted to a supporting phrase; the "What is CAI?" page removed | Gong staged its category ~3 years in; a pre-revenue solo founder earns a category with proof, not proclamation. Brands the mechanism, not a category. |
| Pure-SaaS / "call-scoring software" | **Productized service, software inside; Ali is analyst of record** who reviews every audit + statement | Productized-service best practice: name/face the founder, sell readouts not feature grids, "a real person backed by real software." |

## Directive-by-directive

**D1 Free audit.** Removed every `$500`/`credited`/paid-audit mechanic and the audit Stripe `AUDIT_PAYMENT_URL` from constants, the Leak Audit page (pay button gone), homepage, pricing, FAQ, compliance, concierge, terms, layout meta, OG. New constants `AUDIT_FREE_LINE`, `AUDIT_CAPACITY_LINE` (honest capacity, TODO for the real number — no fake scarcity), `AUDIT_DELIVERABLES`, `FUNNEL_LINE` (free audit → readout with Ali → free 30-day pilot → flat monthly). One coherent funnel on Home/Pricing/Audit.

**D2 $25k find-it-free guarantee.** `GUARANTEE_THRESHOLD` $50k→$25k; `GUARANTEE_CANONICAL`/`GUARANTEE_BADGE_LINE`/`GUARANTEE_METHODOLOGY` rewritten to the diagnostic-threshold + first-month-free structure. Methodology prefers the firm's own avg fee per case type; benchmark values (auto ~$16k, serious $55k+) are labeled fallback. "Estimate of what walked, not a promise of recovery" stated in the same block as the headline (FTC/§17500). `GuaranteeBadge` component + Honesty methodology section updated.

**D3 Independent recovery desk.** New hero (self-graded-homework / independence). New constants `DESK_NAME`, `INDEPENDENCE_LINE`, `DIFFERENTIATORS` (the four points), `WHO_DOES_THE_WORK` (names Ali; TODO on the 100%-review claim), `CATEGORY_BOUNDARY_LINE`. Service language ("readouts," "the desk," "your analyst") replaces dashboard/feature framing; Monthly Missed-Revenue Statement kept as flagship deliverable. Founder page: Ali as analyst of record.

**D4 Category staged down.** Removed the category-king hero and the `/what-is-case-acquisition-intelligence` page (and its stray `" 2"` macOS dup). `CATEGORY_NAME` kept only as a supporting phrase. Manifesto reframed from category proclamation to a POV essay ("Why intake is where PI firms bleed") that brands the mechanism.

**D5 Competitive counter-positioning (factually bulletproof).** Never claims competitors do nothing post-call. `OBJECTIONS` constant + FAQ item acknowledge AI receptionists/agencies/Lead Docket do real capture-time work; differentiate on the four points + the honest boundary ("If your problem is missed calls, buy an AI receptionist"). `ComparisonTable` rebuilt so competitors get accurate checkmarks (answer live, capture-time scoring, report on their leads) and Intake QA's rows are full-population coverage, outcome reconciliation, independence, forensic recovery.

**D6 Month-6 retention.** `MONTH_6_INTRO` + `MONTH_6_ITEMS` (each STATUS-FLAGGED: trend view / scorecards TODO build status; coaching clips labeled NEW BUILD/in-development; save-protocol tracking gated on A2P; new-leak detection present-only). Homepage strip + How-It-Works section + FAQ item, all with honest "we don't bill for what isn't running yet."

**D7 Intake-manager champion.** `CHAMPION_LINE` ("proof of workload… you're not short on effort, you're short on hours"); deepened on How It Works + FAQ; Gong coaching framing without the policing tone.

## Regression guard — preserved
CA-first compliance (7.1–7.3 inbound-response, 1.6/1.18, 5.3, §632/§632.7, TCPA, A2P honesty, §§6151–6152/SB 37 rationale, Rule 5.4 flat-fee framing) — updated: guarantee note to $25k/first-month-free; GenAI-guidance citation now notes the **May 14, 2026** revision + the Aug 2025 Supreme Court referral (not yet adopted). Flat monthly tiers by call volume STAY (no per-recovered-case fee anywhere — confirmed clean). Tier subscription Stripe links retained. Deletion promise reconciled to ONE line (`DELETION_LINE`: audio at transcription; transcripts/reports within 7 days, or immediately on written request). Subprocessors, provenance-gating, PI lexicon, banned-AI-tell list, State-of-PI-Intake signup all preserved.

## Stat reconciliations (per fact sheet)
- **Answer rate → ONE**: `STAT_ANSWER_RATE` = 48% unreachable (Clio 2024). Dropped the second (40% live) figure. TODO(Ali) confirm.
- **Speed-to-lead → ONE**: `STAT_SPEED_TO_LEAD` = ALM Global 2025 "400% higher conversion within 5 min." Dropped the stacked MIT 100×/21× + HBR 42h. TODO(Ali) confirm which single stat.
- **Cost per signed case**: `STAT_PI_COST_PER_CASE` = $468, re-attributed to the ORIGIN (Pareto Legal "State of Law Firm PPC"), not the aggregator. Added `STAT_PI_PPC_COST_PER_CASE` ($2,500–$3,000, NLR) for PPC-only context.
- **Spanish → ONE**: `STAT_LA_SPANISH` = LA-metro 34.5% speak Spanish at home (USAFacts/ACS 2019–2023). Replaced the ~40% ethnicity figure. TODO(Ali) confirm.

## Consolidated TODO(Ali)
Audit monthly capacity number (or delete the count) · exact tier prices (confirm v3 didn't change $500/$900/$1,500) · coaching-clip build status · scorecard/trend-view build status · A2P 10DLC status (no date published) · cohort-benchmark timing · one speed-to-lead stat choice · answer-rate figure choice · Spanish figure/vintage confirm · calibration precision/recall currency · "Ali reviews 100% of statements" claim at scale · orphaned $500 audit Stripe product can be archived.

## Quality gates
Wince: no per-case pricing, every stat sourced to origin, guarantee conditions stated in-block. Intake-manager: champion framing (proof of workload, credit, coaching). Ethics-counsel: flat-fee/free-audit/$25k-diagnostic structure keeps clear of §§6151–6152/SB 37, Rule 5.4, §17500; win-backs are 7.3 inbound-response; GenAI citation current. Coherence: one funnel (free audit→readout→free pilot→flat monthly), pricing purely flat, guarantee attached to a real threshold, "free" is truly free, every competitor claim accurate.
