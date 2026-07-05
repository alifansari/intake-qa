# CHANGELOG-COPY-3.md — category-king repositioning (round 3)

Strategic repositioning from a product website into the category-king website for
**Case Acquisition Intelligence (CAI)**, plus two offer changes: the audit becomes
a **paid $500 (credited)** and the guarantee becomes a **$50,000 Find-It Guarantee**
on the deliverable. Copy + new static pages only — no product-logic changes; the
132/130 test suite is untouched. `next build` compiles (45 static pages). Rounds 1–2
compliance/lexicon/honesty rules preserved (see Regression Guard at the end).

## Report finding → files → change

**§1 Category claim (CAI).**
- `site-constants.ts`: `CATEGORY_NAME`, `CATEGORY_ABBR`, `BRAND_LOCKUP`, `CATEGORY_DEFINITION` (one-sentence, deliverable-grounded), `COUNTER_POSITION_LINE`, `COMPETITOR_NOTE`.
- Homepage (`(marketing)/page.tsx`): category eyebrow + definition-grounded subhead + gold H1; category-definition mini-block; counter-positioning block. Category term is grounded in a concrete deliverable within one sentence of every use (category-king discipline).
- New SEO page `(marketing)/what-is-case-acquisition-intelligence/page.tsx`: the ownable "What is CAI?" definition + what-it-does + how-it-differs.
- Brand lockup keeps "Intake QA" and subordinates it (no rename).

**§1 Manifesto.** New `(marketing)/manifesto/page.tsx` — arc = enemy → shift → new way → stakes, using the gold-standard passages. Linked from nav + homepage; short form carried in Ali's voice on the Founder page.

**§1 Vocabulary reframe (sitewide).** "call scoring" → "signable-case detection"; "win-back SMS" → "same-day save protocol (staff-sent)"; "dashboard" → "missed-revenue statement"; "QA/quality assurance" as category → dropped (kept only in the brand lockup). Applied on homepage, How It Works pipeline, ComparisonTable, Compliance, and the audit report/sample pages.

**§2 Offer A — $500 Leak Audit, credited.**
- `site-constants.ts`: `AUDIT_NAME`, `AUDIT_PRICE`, `AUDIT_PRICE_NUM`, `AUDIT_WHY_PAID`, `AUDIT_CREDIT_LINE`, `CTA_PRIMARY` ("Book your $500 Leak Audit").
- Stated identically on Homepage, Leak Audit page, Pricing, FAQ. `/audit` rebuilt around the paid+credited offer with itemized deliverables (leaked-case list, intake performance readout, save-protocol drafts, benchmark context). TODO(Ali): wire the actual $500 collection/booking step (payment is a product/ops task, not built here).

**§3 Offer B — $50,000 Find-It Guarantee (conditional, on the deliverable).**
- `site-constants.ts`: `GUARANTEE_THRESHOLD` ($25,000 → **$50,000**), `GUARANTEE_REMEDY` ($500 refund), `GUARANTEE_CANONICAL` (verbatim), `GUARANTEE_BADGE_LINE`, `GUARANTEE_METHODOLOGY`.
- Hero-adjacent one-line badge on the homepage (conditions stated, not buried — FTC Guides). Full mechanics on `/audit`. Methodology on Honesty. `GuaranteeBadge` component rewritten to the $50k / $500-refund wording. Triggers on estimated value IDENTIFIED in the firm's own calls, never on recovered fees (FTC §5 / CA §17500; §§6151–6152 / SB 37).

**§4 Cut list.** Removed "free audit"/"Run your free Intake Quality Audit" CTA sitewide (nav, sticky, footer, cohort banner, every page CTA, 404, OG image, root metadata) → `CTA_PRIMARY`. "win-back SMS" → same-day save protocol. Per-recovered-case pricing already removed in round 2 (ROI calculator flat-monthly). No scarcity strings.

**§5 Add list.**
- Monthly Missed-Revenue Statement artifact — mocked block on the homepage with clearly-labeled ILLUSTRATIVE figures; step in the How It Works pipeline.
- Marketing-agency accountability section (homepage) + FAQ, citing WEBRIS (`STAT_WEBRIS_DISTRUST`) by name and PI cost-per-case (`STAT_PI_COST_PER_CASE`). TODO(Ali) for the firm-specific ad-spend "$40K/month" number.
- Speed-to-lead measurement copy on How It Works (`STAT_SPEED_CONTACT` 100× + `STAT_SPEED_TO_LEAD` 21× → MIT/InsideSales 2007; `STAT_RESPONSE_TIME` → HBR 2011). Cites originals, not aggregators.
- Spanish-language capability reframed to LA-County figure (`STAT_LA_SPANISH` ~20% speak Spanish at home, U.S. Census est.); founder bilingual tie-in. TODO(Ali) exact figure/vintage.
- State of PI Intake — new `StateOfIntakeSignup` component (homepage), honest forthcoming framing + mailto capture. TODO(Ali) timing.
- Counter-positioning block + FAQ (neutral, no disparagement).

**§6 Reframe list.** Staff-as-beneficiaries framing from round 2 preserved and extended (How It Works "For the intake team: this is on your side"; FAQ intake-manager Q).

**§7 Constants & consistency.** All new offer numbers live in `site-constants.ts` and render from there. Final grep sweep passes: no `$25,000`, no "free audit"/"Run your free", no "win-back" in rendered copy, no per-recovered-case pricing, no scarcity strings. (Two matches remain and are intentional CODE COMMENTS in ROICalculator and PilotCohortBanner.)

**§8 Page architecture.** New: Manifesto, What-is-CAI, State-of-PI-Intake block. Updated: Homepage, Leak Audit, How It Works, Pricing, Honesty, Compliance, Founder, FAQ, Security, Concierge, Terms, 404, OG, root layout. Nav reordered (Manifesto added).

## Quality gates
- **Wince:** every stat carries its named source inline; no unsourced figure ships; illustrative statement figures are labeled "Example."
- **Intake-manager:** staff-as-beneficiary framing intact.
- **Ethics-counsel:** the $500 fee and $50k guarantee both attach to a deliverable, never a recovery; restated on Compliance (§§6151–6152 / SB 37) with a guarantee-ethics note; guarantee conditions stated in full at every mention (no illusory-guarantee trap).
- **Category-king:** every CAI mention is grounded in a concrete deliverable within one sentence.

## TODO(Ali) — must confirm
| Location | Confirm |
|---|---|
| `site-constants.ts` `AUDIT_*` | Wire the actual **$500 collection/booking** step (product/ops, not built here). |
| `compliance/page.tsx` | Current **A2P 10DLC** registration status/date. |
| `site-constants.ts` guarantee | Collect **each firm's average fee per case type** (guarantee methodology input). |
| `StateOfIntakeSignup.tsx` | **Timing** for the first State of PI Intake edition. |
| `site-constants.ts` `STAT_ANSWERED_LIVE`/`STAT_UNREACHABLE` | Exact Clio secret-shopper figure/phrasing (kept the 40%/48% distinct framing). |
| Homepage agency section | Firm-specific **ad-spend** number for the "$40K/month" framing (only realistic for a multi-market firm). |
| `site-constants.ts` `STAT_LA_SPANISH` | Exact **SoCal Spanish** percentage + vintage. |
| Honesty / homepage teaser | **Test corpus** (N + composition + date), then publish precision/recall with the corpus label. |
| Subscription tiers | Prices confirmed round 2 ($500/$900/$1,500); still TODO to assign each pilot firm to a tier. |
