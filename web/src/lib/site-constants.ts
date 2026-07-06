// Single source of truth for every repeated fact in the marketing site.
//
// Rule: no page or component hard-codes a repeated number, benchmark, price,
// or legal-status line inline. It imports it from here. Keeps offer numbers and
// citations consistent and makes the consistency sweep a one-file edit.
//
// This module is plain data (no `server-only`) so both server components
// (marketing pages) and client components (ROICalculator, PilotCohortBanner)
// can import it.
//
// ROUND 4 (v3 report): the Leak Audit is FREE again (no $500/credit); the
// guarantee is a $25k find-it-free / first-month-free structure; positioning is
// "the independent recovery desk" (service with software inside, Ali as analyst
// of record); the "Case Acquisition Intelligence" category is staged DOWN to a
// supporting phrase, not a hero-level claim.

// ─── Positioning: the independent recovery desk ──────────────────────────────
export const DESK_NAME = "the independent recovery desk";
export const INDEPENDENCE_LINE =
  "The AI receptionist grades its own calls. The agency grades its own leads. Your staff grade their own follow-up. Nobody checks the whole board against what actually got signed. Intake QA is the independent desk that does — and finds the signable cases that walked.";
// The four things that differentiate the desk (state precisely; no disparagement).
export const DIFFERENTIATORS: { title: string; body: string }[] = [
  {
    title: "Independence",
    body: "We have no stake in the answer. We're paid the same flat fee regardless of what the audit finds — unlike the AI receptionist grading its own calls, the agency grading its own leads, or staff grading their own follow-up.",
  },
  {
    title: "Full-population coverage",
    body: "We score 100% of your intake calls across every channel — including the ones your team answered live at 2pm — not just the calls one tool happened to handle.",
  },
  {
    title: "Outcome reconciliation",
    body: "We reconcile calls against the fee agreements that actually got signed weeks later — so a flag means a signable case that truly walked, not a self-graded guess at capture time.",
  },
  {
    title: "Forensic recovery",
    body: "We surface already-paid-for PNCs whose statute is still live, and hand your staff a compliant, human-reviewed play to win them back.",
  },
];
// Honest category boundary — state plainly; never claim competitors do nothing.
export const CATEGORY_BOUNDARY_LINE =
  "If your problem is missed calls, buy an AI receptionist. Our work starts where the phone gets answered.";
// Objection/comparison lines (competitors legitimately do post-call work in 2026).
export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "My AI receptionist already scores calls.",
    a: "It scores the calls it answered, and it's grading its own homework. We score 100% of your calls across every channel — including the ones your team answered live at 2pm — and we reconcile them against who actually signed.",
  },
  {
    q: "My agency reports on lead quality.",
    a: "Your agency has a stake in the answer. We don't: we're paid the same flat fee no matter what we find.",
  },
  {
    q: "Lead Docket already tracks this.",
    a: "Lead Docket routes and tracks at capture. We start after the call ends and ask the one question none of them answer: which qualified callers never signed, and how much was that?",
  },
];

// ─── Who does the work (productized service; name Ali) ───────────────────────
export const WHO_DOES_THE_WORK =
  "Every audit and every monthly statement is reviewed by Ali — Intake QA's founder and analyst of record, a former PI paralegal who sat in the intake seat. The software does the listening at scale; a human who knows what a signable case sounds like decides what to flag and signs off on what you read.";
// Confirmed by Ali (July 2026): he personally reviews 100% of statements/readouts
// at current cohort size. Revisit this wording if that stops holding at scale.

// ─── Category (staged DOWN to a supporting phrase — NOT a hero claim) ────────
// Use only as descriptive supporting vocabulary, grounded in a deliverable.
// Do not proclaim it as an established market category from a pre-revenue start.
export const CATEGORY_NAME = "Case Acquisition Intelligence";
export const CATEGORY_DEFINITION =
  "measuring what happens to a signable case after the phone rings: which qualified callers didn't sign, across every channel, and what that walked-away fee revenue is worth.";

// ─── The Leak Audit offer (FREE) ─────────────────────────────────────────────
export const AUDIT_NAME = "Intake Quality Audit";
// Single primary CTA sitewide.
export const CTA_PRIMARY = "Run your free Intake Quality Audit";
export const AUDIT_FREE_LINE =
  "Send us up to 10 recent intake calls. A real analyst — not just a model — reviews every one against our calibrated PI rubric and hands you a written report: the signable cases that didn't sign, the evidence behind each flag, and what that walked-away fee revenue is worth in dollars. You keep the report whether or not we ever work together.";
// Honest capacity, not fake scarcity.
// TODO(Ali): insert the true monthly audit capacity number, or delete the count
// entirely. Never invent it; no countdown timers.
export const AUDIT_CAPACITY_LINE =
  "Because a real analyst reviews every call, we take on a limited number of audits each month.";
export const AUDIT_DELIVERABLES: string[] = [
  "A per-call score on our frozen, calibrated PI rubric.",
  "The signable cases that didn't sign, with the transcript evidence behind each flag.",
  "A dollar figure for the estimated missed signable fee revenue.",
  "A watermarked sample of the staff-sent win-back message we'd recommend.",
  "A shareable written report your firm keeps.",
];
// The one funnel (present as a single path, no competing offers).
export const FUNNEL_LINE =
  "Free Intake Quality Audit → a live readout with Ali → a free 30-day founding-cohort pilot → a flat monthly subscription.";

// ─── The $25,000 find-it-free guarantee (backs the diagnostic + first month) ──
// Attaches to the SUBSCRIPTION decision, never to recovered fees (keeps clear of
// FTC §5 / CA §17500 earnings claims and §§6151–6152 / SB 37 outcome-fee optics).
export const GUARANTEE_THRESHOLD = "$25,000";
export const GUARANTEE_CANONICAL =
  "The $25,000 find-it-free guarantee: if your free Intake Quality Audit doesn't identify at least $25,000 in estimated missed signable case value, we won't pitch you a subscription — and if you start one anyway, your first month is free. “Estimated missed signable case value” is an estimate of what walked, calculated from your own average fee per case type (or named industry benchmarks where we don't have it) — not a promise of what we'll recover.";
export const GUARANTEE_BADGE_LINE =
  "$25,000 find-it-free guarantee — if the audit doesn't surface at least $25k in estimated missed signable case value, we won't pitch you, and if you subscribe anyway your first month is free. An estimate of what walked, not a promise of recovery.";
export const GUARANTEE_METHODOLOGY =
  "How we estimate missed signable case value: we count the signable cases our model flags that didn't sign, then multiply by your firm's own average fee per signed case for that case type. Where you haven't given us your average fee, we substitute a named, sourced benchmark (e.g., auto soft-tissue ~$16,000; serious injuries $55,000+) and label every substituted figure. Estimates are estimates, not a promise of recovered fees; our model's precision and recall are published on this page.";
// TODO(Ali): collect each firm's average fee per case type (guarantee methodology input).

// ─── Founding cohort (honest, durable language — no countdown, no "N seats left") ───
export const COHORT_MIN = 3;
export const COHORT_MAX = 5;
export const PILOT_DAYS = 30;
export const COHORT_LINE = `We're taking a founding cohort of ${COHORT_MIN}–${COHORT_MAX} Southern California PI firms onto free ${PILOT_DAYS}-day pilots.`;

// ─── Data handling (one reconciled promise) ──────────────────────────────────
export const DELETION_DAYS = 7;
// Audio is deleted at transcription; transcripts/reports within DELETION_DAYS of
// the readout, or immediately on written request.
export const DELETION_LINE = `Call audio is deleted the moment it's transcribed; transcripts and reports are deleted within ${DELETION_DAYS} days of your readout, or immediately if you ask in writing.`;
// TODO(Ali): confirm the breach-notification timeline you can actually commit to.
export const BREACH_NOTICE_HOURS = 72;

// ─── The accountable-party line (subprocessor reframe) ───
export const ACCOUNTABLE_PARTY_LINE =
  "Your calls are handled by Intake QA. We use three infrastructure providers under contract — the same category of vendors your CRM and transcription tools already rely on — and we remain the single party accountable to you.";

// ─── Named subprocessors (detail lives on the Security page only) ───
export type Subprocessor = { name: string; role: string; posture: string };
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: "Anthropic (Claude API)",
    role: "Analysis & drafting",
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
  "Texting activates only after your A2P 10DLC registration is approved — and even then, nothing sends without a person on your team approving it first.";

// ─── PI-intake benchmarks (each carries its named ORIGIN source) ─────────────

// Phone-answer rate — reconciled to ONE figure (Clio 2024 Legal Trends Report).
// TODO(Ali): confirm this is the figure/edition you want; do not also show the
// other Clio figure elsewhere.
export const STAT_ANSWER_RATE = {
  value: "48%",
  label: "of firms were essentially unreachable by phone — never answered a call and never called back",
  source: "Clio 2024 Legal Trends Report (Lux secret-shopper study of 500 US firms)",
};

// Speed-to-lead — reconciled to ONE stat with its correct citation.
// TODO(Ali): pick the single speed-to-lead stat you want to run. Options from the
// v3 fact sheet: ALM Global 2025 "400% higher conversion within 5 minutes"
// (conversion lift, used below); Hennessey Digital 2025 (response-time behavior,
// no conversion figure); MIT/InsideSales 2007 "21× to qualify" (older). Do NOT
// merge a response-time study with a conversion-lift study under one source.
export const STAT_SPEED_TO_LEAD = {
  value: "400%",
  label: "higher conversion when a firm responds within the first five minutes of an inquiry",
  source: "ALM Global, 2025",
};

// PI acquisition economics — cite the ORIGIN (Pareto Legal), not the aggregator.
export const STAT_PI_COST_PER_CASE = {
  value: "$468",
  label: "blended cost to acquire one signed PI case (at $284 per lead and a 7% conversion rate; blends channels)",
  source: "Pareto Legal, \"State of Law Firm PPC\" — 13 plaintiff-side firms, $3.3M combined Google Ads + LSA spend, 2025",
};
export const STAT_PI_PPC_COST_PER_CASE = {
  value: "$2,500–$3,000",
  label: "cost to acquire one signed PI case in competitive PPC-only markets",
  source: "The National Law Review, 2025",
};
// Agency-reporting distrust — attribute to WEBRIS by name; NOT an industry statistic.
export const STAT_WEBRIS_DISTRUST = {
  value: "<10%",
  label: "of PI firms one legal-marketing agency audited could state their true client-acquisition cost with confidence",
  source: "WEBRIS, \"Personal Injury Leads: How Much Should They Cost?\" (after auditing 500+ PI firms)",
};
// Spanish-language / SoCal — ONE figure, LA-metro (SoCal relevance).
// TODO(Ali): confirm LA-metro 34.5% is the figure to publish (USAFacts/ACS).
export const STAT_LA_SPANISH = {
  value: "34.5%",
  label: "of people age 5+ in the Los Angeles–Long Beach–Anaheim metro speak Spanish at home (~4.2M people)",
  source: "USAFacts, 2019–2023 American Community Survey",
};

// ─── Calibration / test corpus ───
export const TEST_CORPUS_PRECISION: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_RECALL: string | null = null; // TODO(Ali): publish only with corpus label
export const TEST_CORPUS_LABEL = "on our test corpus"; // never "in the field"

// ─── What months 2–12 look like (retention story; STATUS-FLAGGED) ────────────
// Presentation-only vs new-build must be labeled. Never market vaporware.
export const MONTH_6_INTRO =
  "The first audit finds the biggest leaks. After that, the desk becomes your standing intake QA function: every month your statement shows whether the leak is shrinking, your intake team gets credit for the improvement, and new leaks get caught as your marketing and staffing change.";
export const MONTH_6_ITEMS: { title: string; body: string; status: string }[] = [
  {
    title: "A statement that trends over time",
    body: "Your monthly missed-revenue statement shows the leak shrinking, not just a static snapshot.",
    status: "TODO(Ali): confirm the trend view exists; present-only otherwise.",
  },
  {
    title: "Intake-team scorecards",
    body: "Improvement trending that makes the manager look good — credit lands where it's earned.",
    status: "TODO(Ali): build status — label \"rolling out to the founding cohort\" only if true.",
  },
  {
    title: "Coaching clips from real calls",
    body: "Short training clips built from your team's own best calls.",
    status: "TODO(Ali): NEW BUILD — do not present as live; label \"in development with the founding cohort\" if shown.",
  },
  {
    title: "New-leak detection",
    body: "As your marketing and staffing change, new leaks get caught.",
    status: "Present-only (existing capability).",
  },
  {
    title: "Save-protocol conversion tracking",
    body: "Once A2P 10DLC clears, we track how many saved cases the protocol actually recovers.",
    status: "Gated on A2P 10DLC approval — pending.",
  },
];

// ─── Intake-manager champion framing ─────────────────────────────────────────
export const CHAMPION_LINE =
  "This isn't a gotcha. High-volume intake means good cases slip — that's math, not a character flaw. The desk gives your manager proof of the workload, coaching clips built from your team's own best calls, and a monthly scorecard that shows the improvement so the credit lands where it's earned.";

// ─── Pricing (outcome-decoupled: flat monthly, tiered by analyzed-call volume) ───
// NEVER a per-recovered-case, per-signed-client, or percentage-of-recovery fee.
// Source of truth for the billing plans seeded in db/migrations/0013 +
// supabase/migrations/0013 (keep in sync). TODO(Ali): confirm the v3 report did
// not change these tier prices.
export type PricingTier = {
  name: string;
  planName: string | null;
  price: string;
  priceCents: number;
  callCap: number | null;
  volume: string;
  sub: string;
  featured: boolean;
  // Stripe subscription Payment Link for this tier (empty = no direct checkout).
  // TODO(Ali): confirm each link is LIVE mode and its monthly amount matches `price`.
  checkoutUrl: string;
};
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Founding pilot",
    planName: "pilot",
    price: "$0",
    priceCents: 0,
    callCap: null,
    volume: `${PILOT_DAYS}-day pilot`,
    sub: "Free 30-day pilot for the founding cohort, after your free audit. Then a locked founding rate. Cancel anytime.",
    featured: false,
    checkoutUrl: "", // the pilot starts with the free audit, not a subscription checkout
  },
  {
    name: "Tier 1",
    planName: "tier_1",
    price: "$500/mo",
    priceCents: 50000,
    callCap: 150,
    volume: "up to ~150 analyzed calls/mo",
    sub: "For smaller-volume firms who want every call reviewed.",
    featured: true,
    checkoutUrl: "https://buy.stripe.com/3cIcN5bqafZL4M69Dlebu02",
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
    checkoutUrl: "https://buy.stripe.com/5kQ3cvam6eVH6Ue2aTebu03",
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
    checkoutUrl: "https://buy.stripe.com/aFa28r79U4h31zUg1Jebu04",
  },
];
// Numeric reference monthly fee used only by the ROI calculator (mirrors Tier 2).
export const REF_MONTHLY_USD = 900;
// The compliance argument for the pricing model, in lawyer-grade language.
export const PRICING_COMPLIANCE_ARGUMENT =
  "We deliberately do not charge per case, per signed client, or per recovered dollar. Our fee is a flat monthly subscription for a QA and recovery service on your own existing callers — it does not change whether you sign zero cases or fifty. Because our compensation is not tied to procuring or recovering any case, it isn't a share of a fee under CA Rule 5.4 and can't be characterized as paying a runner or capper under California Business & Professions Code §§6151–6152 (as strengthened by SB 37). You pay us a flat fee for a service, the same way you pay your answering service or your CRM.";

// ─── Cost comparables (2026-verified; anchor the flat monthly fee) ───
export const PRICING_ANCHOR_LINE =
  "For comparison: AI receptionist tools run about $95–$400/mo, call-intelligence add-ons $50–$195/mo, and PI firms commonly spend $500–$2,000/mo on their CRM and intake platforms. A flat monthly desk fee sits inside the tool budget your firm already carries.";

// ─── Accountable human ───
export const FOUNDER_NAME = "Ali";
export const FOUNDER_EMAIL = "ali@plaintiffops.com";

// ─── Copyright ───
export const COPYRIGHT_YEAR = new Date().getFullYear();
