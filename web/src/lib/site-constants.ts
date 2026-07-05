// Single source of truth for every repeated fact in the marketing site.
//
// Rule: no page or component hard-codes a repeated number, benchmark, price,
// or legal-status line inline. It imports it from here. This keeps the two
// distinct Clio figures from being confused, keeps pricing consistent, and
// makes the yearly/consistency sweep a one-file edit.
//
// This module is plain data (no `server-only`) so both server components
// (marketing pages) and client components (ROICalculator, PilotCohortBanner)
// can import it.

// ─── Category (Case Acquisition Intelligence) ────────────────────────────────
// DISCIPLINE: every time the category name appears in copy it MUST be grounded
// in a concrete deliverable within one sentence, or it collapses into jargon.
export const CATEGORY_NAME = "Case Acquisition Intelligence";
export const CATEGORY_ABBR = "CAI";
// Brand lockup — keep the product name, subordinate it under the category.
export const BRAND_LOCKUP = "Intake QA — Case Acquisition Intelligence for personal injury firms";
// One-sentence, deliverable-grounded definition (use verbatim as the anchor).
export const CATEGORY_DEFINITION =
  "Case Acquisition Intelligence reads 100% of your intake calls, detects the signable cases that didn't sign, and reports what your intake actually produced — in dollars.";
// Counter-position (neutral, no disparagement).
export const COUNTER_POSITION_LINE =
  "AI receptionists and speed-to-lead tools optimize the next call. Case Acquisition Intelligence recovers the signable cases you already paid for — and proves what your intake actually produced.";

// ─── The Leak Audit offer ($500, credited) ───────────────────────────────────
export const AUDIT_NAME = "Leak Audit";
export const AUDIT_PRICE = "$500";
export const AUDIT_PRICE_NUM = 500;
// Single primary CTA sitewide.
export const CTA_PRIMARY = "Book your $500 Leak Audit";
export const AUDIT_CREDIT_LINE =
  "The $500 Leak Audit fee is credited in full against your first subscription invoice. Subscribe, and the audit is effectively free. Don't subscribe, and you keep the full report — no pitch, no obligation.";
// Stripe Payment Link for the one-time $500 Leak Audit fee (Option A: no-code).
// TODO(Ali): paste the Payment Link URL from Stripe here — Products → "Leak Audit"
// → $500 one-time → Create payment link. Until it's set, the pay button falls back
// to booking by email, so the page is never broken.
export const AUDIT_PAYMENT_URL: string = "";
export const AUDIT_WHY_PAID =
  "The audit costs $500 because it's real diagnostic work with real deliverables — not a sales call. A serious firm and a serious analysis both put something on the table. And because the $500 is credited in full to your first invoice, it costs a subscribing firm nothing on net. If we don't find enough to justify moving forward, you keep the report and we part as friends.";
// TODO(Ali): wire the actual $500 collection/booking step — presented as an offer
// in copy; the payment mechanism is a product/ops task, not built here.

// ─── The $50,000 Find-It Guarantee (conditional, on the DELIVERABLE) ──────────
// Values must render identically everywhere. The guarantee triggers on estimated
// value IDENTIFIED in the firm's own calls — NEVER on recovered fees (keeps clear
// of FTC §5 / CA §17500 earnings-claim and §§6151–6152 / SB 37 outcome-fee optics).
export const GUARANTEE_THRESHOLD = "$50,000";
export const GUARANTEE_REMEDY = "$500 refund";
export const GUARANTEE_CANONICAL =
  "The $50,000 Find-It Guarantee: if your Leak Audit doesn't identify at least $50,000 in estimated missed signable-case value in your firm's own recent intake calls, we refund your $500 audit fee in full. The guarantee is on what the audit FINDS in your calls — not on any revenue you recover. We don't promise you'll win cases back; we promise the audit will show you at least $50,000 worth looking at, or you don't pay for it.";
export const GUARANTEE_BADGE_LINE =
  "$50,000 Find-It Guarantee — if the audit doesn't find at least $50k in estimated missed signable-case value in your own calls, your $500 is refunded. On what we find, not what you recover.";
export const GUARANTEE_METHODOLOGY =
  "How we estimate missed signable-case value: we count the signable cases our model flags that didn't sign, then multiply by your firm's own average fee per signed case for that case type. Where you haven't given us your average fee, we substitute a conservative, sourced benchmark (the standard PI contingency fee, ~33⅓%, applied to conservative case values) and label every substituted figure. Estimates are estimates, not promises; our model's precision and recall are published on this page.";
// TODO(Ali): collect each firm's average fee per case type (guarantee methodology input).

// ─── Founding cohort (honest, durable language — no countdown, no "N seats left") ───
export const COHORT_MIN = 3;
export const COHORT_MAX = 5;
export const PILOT_DAYS = 30;
// One phrasing, used verbatim everywhere the cohort is described.
export const COHORT_LINE = `We're taking a founding cohort of ${COHORT_MIN}–${COHORT_MAX} Southern California PI firms onto free ${PILOT_DAYS}-day pilots.`;

// ─── Data handling ───
export const DELETION_DAYS = 7;
export const DELETION_LINE = `Your recordings and transcripts are deleted within ${DELETION_DAYS} days of your audit readout — and immediately if you ask in writing.`;
// TODO(Ali): confirm the breach-notification timeline you can actually commit to.
export const BREACH_NOTICE_HOURS = 72;

// ─── The accountable-party line (subprocessor reframe) ───
// Homepage / Compliance use the one-sentence version; Security carries the detail.
export const ACCOUNTABLE_PARTY_LINE =
  "Your calls are handled by Intake QA. We use three infrastructure providers under contract — the same category of vendors your CRM and transcription tools already rely on — and we remain the single party accountable to you.";

// ─── Named subprocessors (detail lives on the Security page only) ───
export type Subprocessor = { name: string; role: string; posture: string };
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: "Anthropic (Claude API)",
    role: "Scoring & drafting",
    posture:
      "Commercial API — inputs and outputs are not used to train models and are deleted after 7 days by default; Zero-Data-Retention and a HIPAA BAA are available (Anthropic Privacy Center / Platform Docs).",
  },
  {
    name: "Supabase",
    role: "Database & storage",
    posture:
      "SOC 2 Type 2 and ISO 27001; AES-256 at rest, TLS in transit; HIPAA-capable under a signed BAA (supabase.com/security).",
  },
  {
    name: "AssemblyAI",
    role: "Transcription",
    posture:
      "SOC 2 Type 2 and PCI-DSS 4.0 Level 1 (as of Mar. 31, 2025), GDPR; AES-256 at rest, TLS 1.3 in transit; paid customers opt out of model-improvement training; will sign a BAA (assemblyai.com/security).",
  },
];

// ─── SMS / texting posture ───
export const A2P_LINE =
  "Texting activates only after our A2P 10DLC registration is approved — and even then, nothing sends without a person on your team approving it first.";

// ─── PI-intake benchmarks (each carries its named source; the two Clio figures ───
//     mean DIFFERENT things and must never be used interchangeably) ─────────────
export const STAT_ANSWERED_LIVE = {
  value: "40%",
  label: "of firms answered the phone live when a prospective client called",
  source: "Clio 2024 Legal Trends Report (Lux secret-shopper study of 500 US firms)",
};
export const STAT_UNREACHABLE = {
  value: "48%",
  label: "of firms were essentially unreachable by phone — never answered and never called back",
  source: "Clio 2024 Legal Trends Report (Lux secret-shopper study of 500 US firms)",
};
export const STAT_SPEED_TO_LEAD = {
  value: "21×",
  label: "better odds of qualifying a caller when you respond in 5 minutes instead of 30",
  source: "MIT Sloan / InsideSales.com Lead Response study, Dr. James Oldroyd, 2007",
};
export const STAT_PI_CLICK_COST = {
  value: "$100–$500+",
  label: "typical cost of a single Google click on personal-injury keywords",
  source: "iLawyer Marketing, 2025 legal keyword analysis",
};
// TODO(Ali): confirm the exact source for the "~62% call a competitor" figure before using it inline.

// Speed-to-lead multipliers — MIT/InsideSales 2007 (NOT HBR; common misquote).
export const STAT_SPEED_CONTACT = {
  value: "100×",
  label: "more likely to reach a lead contacting within 5 minutes vs. 30",
  source: "MIT Sloan / InsideSales.com Lead Response study, Dr. James Oldroyd, 2007",
};
// Response-time reality — Harvard Business Review 2011 (audit of 2,241 US companies).
export const STAT_RESPONSE_TIME = {
  value: "~42 hrs",
  label: "average time a business takes to respond to an inbound web lead; 23% never respond",
  source: "Oldroyd, McElheran & Elkington, \"The Short Life of Online Sales Leads,\" Harvard Business Review, 2011",
};
// PI acquisition economics — used for agency-accountability + ROI copy.
export const STAT_PI_COST_PER_CASE = {
  value: "$468",
  label: "average cost to acquire one signed PI case (at a 7% lead-to-case rate; $284 per lead)",
  source: "Rankings.io, \"How Much Do Personal Injury Leads Cost? [2026]\" — analysis of $3.3M in Google Ads/LSA spend across 13 plaintiff firms",
};
// Agency-reporting distrust — attribute to WEBRIS by name; NOT an industry statistic.
export const STAT_WEBRIS_DISTRUST = {
  value: "<10%",
  label: "of PI firms one legal-marketing agency audited could state their true client-acquisition cost with confidence",
  source: "WEBRIS, \"Personal Injury Leads: How Much Should They Cost?\" (after auditing 500+ PI firms)",
};
// Spanish-language / SoCal.
export const STAT_LA_SPANISH = {
  value: "~20%",
  label: "of Los Angeles County residents age 5+ speak Spanish at home",
  source: "U.S. Census estimates (via Los Angeles Almanac)",
};
// TODO(Ali): confirm the exact LA-County Spanish-at-home percentage and vintage.

// Competitive counter-position facts (neutral, sourced; no disparagement).
export const COMPETITOR_NOTE =
  "Tools like Smith.ai and AI receptionists optimize answering the next call; litigation-AI tools like EvenUp and Supio work the case after it's signed. Case Acquisition Intelligence owns the gap in between — the moment a paid-for case is won or lost at intake.";

// ─── Calibration / test corpus ───
// We do NOT publish a precision or recall number until the corpus is documented.
// When it is, set these to e.g. "77%" / "68%" and always render them with the
// TEST_CORPUS_LABEL so they can never read as field results.
export const TEST_CORPUS_PRECISION: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_RECALL: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_LABEL = "on our test corpus"; // never "in the field"

// ─── Pricing (outcome-decoupled: flat monthly, tiered by analyzed-call volume) ───
// NEVER a per-recovered-case, per-signed-client, or percentage-of-recovery fee.
// Prices confirmed by Ali (July 2026). `callCap` is the analyzed-call volume the
// tier covers; exceeding it flags an upgrade conversation — it is NEVER auto-billed.
// These figures are the source of truth for the billing plans seeded in
// db/migrations/0013 + supabase/migrations/0013 (keep them in sync).
export type PricingTier = {
  name: string;
  planName: string | null; // matches billing_plans.name; null for the free pilot
  price: string;
  priceCents: number;
  callCap: number | null; // analyzed calls/mo the tier covers; null = pilot (uncapped)
  volume: string;
  sub: string;
  featured: boolean;
};
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Founding pilot",
    planName: "pilot",
    price: "$0",
    priceCents: 0,
    callCap: null,
    volume: `${PILOT_DAYS}-day pilot`,
    sub: "Free 30-day pilot for the founding cohort, then a locked founding rate. Cancel anytime.",
    featured: false,
  },
  {
    name: "Tier 1",
    planName: "tier_1",
    price: "$500/mo",
    priceCents: 50000,
    callCap: 150,
    volume: "up to ~150 analyzed calls/mo",
    sub: "For smaller-volume firms who want every call scored.",
    featured: true,
  },
  {
    name: "Tier 2",
    planName: "tier_2",
    price: "$900/mo",
    priceCents: 90000,
    callCap: 400,
    volume: "up to ~400 analyzed calls/mo",
    sub: "For firms running steady intake volume.",
    featured: false,
  },
  {
    name: "Tier 3",
    planName: "tier_3",
    price: "$1,500/mo",
    priceCents: 150000,
    callCap: 800,
    volume: "up to ~800 analyzed calls/mo",
    sub: "For high-volume intake operations.",
    featured: false,
  },
];
// Numeric reference monthly fee used only by the ROI calculator to estimate net/payback.
// Mirrors the confirmed Tier-2 monthly price ($900); keep the two in sync.
export const REF_MONTHLY_USD = 900;
// The compliance argument for the pricing model, in lawyer-grade language.
export const PRICING_COMPLIANCE_ARGUMENT =
  "We deliberately do not charge per case, per signed client, or per recovered dollar. Our fee is a flat monthly subscription for analyzing your calls — it does not change whether you sign zero cases or fifty. Because our compensation is not tied to procuring or recovering any case, it cannot be characterized as payment to an agent for soliciting or procuring clients under California Business & Professions Code §§6151–6152. You pay us for analysis, the same way you pay your answering service or your CRM.";

// ─── Cost comparables (2026-verified; used to anchor the flat monthly fee) ───
export const PRICING_ANCHOR_LINE =
  "For comparison: AI receptionist tools run about $97–$325/mo, call-intelligence add-ons $50–$195/mo, and PI firms commonly spend $500–$2,000/mo on their CRM and intake platforms. A loaded in-house receptionist runs about $54,000–$68,000 a year. A flat monthly analysis fee sits inside the tool budget your firm already carries.";

// ─── Accountable human ───
export const FOUNDER_NAME = "Ali";
export const FOUNDER_EMAIL = "ali@plaintiffops.com";

// ─── Copyright ───
export const COPYRIGHT_YEAR = new Date().getFullYear();
