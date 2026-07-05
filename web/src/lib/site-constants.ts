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

// ─── Calibration / test corpus ───
// We do NOT publish a precision or recall number until the corpus is documented.
// When it is, set these to e.g. "77%" / "68%" and always render them with the
// TEST_CORPUS_LABEL so they can never read as field results.
export const TEST_CORPUS_PRECISION: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_RECALL: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_LABEL = "on our test corpus"; // never "in the field"

// ─── Pricing (outcome-decoupled: flat monthly, tiered by analyzed-call volume) ───
// NEVER a per-recovered-case, per-signed-client, or percentage-of-recovery fee.
// TODO(Ali): confirm final monthly prices before launch — figures below are placeholders.
export type PricingTier = {
  name: string;
  price: string;
  volume: string;
  sub: string;
  featured: boolean;
};
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Founding pilot",
    price: "$0",
    volume: `${PILOT_DAYS}-day pilot`,
    sub: "Free 30-day pilot for the founding cohort, then a locked founding rate. Cancel anytime.",
    featured: false,
  },
  {
    name: "Tier 1",
    price: "$500/mo", // TODO(Ali): confirm final price (≈$500)
    volume: "up to ~150 analyzed calls/mo",
    sub: "For smaller-volume firms who want every call scored.",
    featured: true,
  },
  {
    name: "Tier 2",
    price: "$900/mo", // TODO(Ali): confirm final price (≈$900)
    volume: "up to ~400 analyzed calls/mo",
    sub: "For firms running steady intake volume.",
    featured: false,
  },
  {
    name: "Tier 3",
    price: "$1,500/mo", // TODO(Ali): confirm final price (≈$1,500)
    volume: "up to ~800 analyzed calls/mo",
    sub: "For high-volume intake operations.",
    featured: false,
  },
];
// Numeric reference monthly fee used only by the ROI calculator to estimate net/payback.
// TODO(Ali): keep in sync with the confirmed final Tier-2 monthly price.
export const REF_MONTHLY_USD = 900;
// The compliance argument for the pricing model, in lawyer-grade language.
export const PRICING_COMPLIANCE_ARGUMENT =
  "We deliberately do not charge per case, per signed client, or per recovered dollar. Our fee is a flat monthly subscription for analyzing your calls — it does not change whether you sign zero cases or fifty. Because our compensation is not tied to procuring or recovering any case, it cannot be characterized as payment to an agent for soliciting or procuring clients under California Business & Professions Code §§6151–6152. You pay us for analysis, the same way you pay your answering service or your CRM.";

// ─── Cost comparables (2026-verified; used to anchor the flat monthly fee) ───
export const PRICING_ANCHOR_LINE =
  "For comparison: AI receptionist tools run about $97–$325/mo, call-intelligence add-ons $50–$195/mo, and PI firms commonly spend $500–$2,000/mo on their CRM and intake platforms. A loaded in-house receptionist runs about $54,000–$68,000 a year. A flat monthly analysis fee sits inside the tool budget your firm already carries.";

// ─── Find-it-free audit guarantee ───
// TODO(Ali): confirm the guarantee threshold and terms.
export const GUARANTEE_THRESHOLD = "$25,000";

// ─── Accountable human ───
export const FOUNDER_NAME = "Ali";
export const FOUNDER_EMAIL = "ali@plaintiffops.com";

// ─── Copyright ───
export const COPYRIGHT_YEAR = new Date().getFullYear();
