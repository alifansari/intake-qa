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
//
// ROUND 4 (v3 report): the Leak Audit is FREE again (no $500/credit); the
// guarantee is a $25k find-it-free / first-month-free structure; positioning is
// "the independent intake desk" (service with software inside, Ali as analyst
// of record); the "Case Acquisition Intelligence" category is staged DOWN to a
// supporting phrase, not a hero-level claim.
//
// RENAME (2026-07-12, Ali-approved, copy-power-pass): the category label moved
// from "the independent recovery desk" to "the independent intake desk". Reason:
// to a CA plaintiff lawyer "recovery" primarily means the CLIENT’s recovery, so
// the old label carried avoidable §I fee-participation optics and forced the
// letter to burn a paragraph defusing it. The compliance NEGATIONS that use the
// word "recovery" to mean the client’s settlement ("never a share of any
// recovery") are LOAD-BEARING and deliberately left unchanged.

import { isSampledReviewEnabled } from "./flags";

// Tiered "sampled review" model flag, evaluated once at module load (server-side).
// DEFAULT OFF. Every gated const below picks its OFF branch when the flag is off,
// and each OFF branch is byte-identical to the string that shipped before this flag
// existed — so flag-off output is unchanged. The gated constants here are rendered
// ONLY by server components (the marketing pages), so a client bundle (where a
// non-NEXT_PUBLIC env var is undefined and the flag reads off) never diverges
// visibly, and there is no hydration hazard. Do NOT read this in a client component.
// Flipping the flag is a novel regulated change (§IV/§V) — Ali's decision + Yang.
const SAMPLED_REVIEW = isSampledReviewEnabled();

// ─── Positioning: the independent intake desk ────────────────────────────────
export const DESK_NAME = "the independent intake desk";
// Certified forwardable Independence Statement (Round 7 Gold iii). Use verbatim.
export const INDEPENDENCE_STATEMENT =
  "Intake QA is an independent quality-control service that scores a PI firm’s own intake calls, flags signable cases that slipped, and hands the firm a compliant way to follow up, for a flat monthly fee that never varies with any recovery. We take no referral fees and no contingent compensation.";
// Certified gold-standard sentences (Round 7 Section G). Use verbatim. No em-dashes.
export const GOLD_ALTERNATIVE_VIEW =
  "Here’s the strongest case against our flag, the reading under which this case is not signable, so you can weigh both before you spend a callback.";
export const GOLD_RIGHT_OF_REPLY =
  "You can dispute anything in this Statement. Tell us what we got wrong and your correction is printed, unedited, in the next Statement’s Corrections column and logged against the original finding. We’d rather be corrected than trusted blindly.";
export const GOLD_VALUATION_DISCLAIMER =
  "Any dollar figure here is a conservative, case-within-a-case estimate of potential fee value, using an expected-value method described in the appendix. It is an operations estimate, not a legal opinion, a promise, or a guarantee. The merits are your firm’s call.";
export const GOLD_ATTESTATION =
  "This is a record of the procedures we performed and the fidelity of the transcripts we reviewed. It is not an opinion on the value or legal merit of any case, and it carries no penalty-of-perjury attestation. Where we judge, we show the transcript moment behind the judgment so you can check it yourself.";
export const INDEPENDENCE_LINE =
  "The AI receptionist grades its own calls. The agency grades its own leads. Your staff grade their own follow-up. Nobody checks the whole board against what actually got signed. Intake QA is the independent desk that does, and finds the signable cases that walked.";
// The four things that differentiate the desk (state precisely; no disparagement).
export const DIFFERENTIATORS: { title: string; body: string }[] = [
  {
    title: "Independence",
    body: "We have no stake in the answer. We’re paid the same flat fee regardless of what the audit finds, unlike the AI receptionist grading its own calls, the agency grading its own leads, or staff grading their own follow-up.",
  },
  {
    title: "Full-population coverage",
    body: "We score 100% of your intake calls across every channel, including the ones your team answered live at 2pm, not just the calls one tool happened to handle.",
  },
  {
    title: "Outcome reconciliation",
    body: "We reconcile calls against the fee agreements that actually got signed weeks later, so a flag means a signable case that truly walked, not a self-graded guess at capture time.",
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
    a: "It scores the calls it answered, and it’s grading its own homework. We score 100% of your calls across every channel, including the ones your team answered live at 2pm, and we reconcile them against who actually signed.",
  },
  {
    q: "My agency reports on lead quality.",
    a: "Your agency has a stake in the answer. We don’t: we’re paid the same flat fee no matter what we find.",
  },
  {
    q: "Lead Docket already tracks this.",
    a: "Lead Docket routes and tracks at capture. We start after the call ends and ask the one question none of them answer: which qualified callers never signed, and how much was that?",
  },
];

// ─── Who does the work (productized service; name Ali) ───────────────────────
export const WHO_DOES_THE_WORK =
  "Every audit and every monthly statement is reviewed by Ali, Intake QA’s founder and analyst of record, a former PI paralegal who sat in the intake seat. The software does the listening at scale; a human who knows what a signable case sounds like decides what to flag and signs off on what you read.";
// Confirmed by Ali (July 2026): he personally reviews 100% of statements/readouts
// at current cohort size. Revisit this wording if that stops holding at scale.

// ─── What we do (plain description; the "Case Acquisition Intelligence" category
// label is retired per the Round 7 master edit — banned as jargon). ────────────
export const WHAT_WE_DO =
  "We measure what happens to a signable case after the phone rings: which qualified callers didn’t sign, across every channel, and what that walked-away fee revenue is worth.";

// ─── Additive-to-your-stack (the load-bearing "no migration" line) ────────────
// Names the CMS platforms as factual interoperability, not a comparative claim
// (§V-safe). The point for a high-volume buyer: nothing to rip out, nothing to
// re-train the department on.
export const ADDITIVE_LINE =
  "Intake QA sits on top of the case-management system you already run, whether that’s Filevine, CasePeer, Litify, or your own stack. There is nothing to rip out and nothing to migrate: we read the intake calls your phones already record, and hand the signable cases that walked back to the same team and the same CRM you use today.";

// ─── Volume / multi-office framing (the buyer is a department, not a coordinator) ─
// Directional, carries no stat. Speaks to the Director of Intake + COO, and frames
// the fee against the value of a single recovered signable case (never per-case
// PRICING — this is a value comparison, not a fee structure; see §I).
export const VOLUME_LINE =
  "Built for high-volume intake: multi-office firms and dedicated intake departments where the phones ring hundreds of times a week, and a single signable case that walks can outweigh a year of the flat subscription. One board covers every office, for the Director of Intake and the COO who answer for the number.";

// The named "reason why" (copy-power-pass 2026-07-12): the four transcript-
// observable failure modes. Actuarial, not vibes; blames the process, not a
// person (matches CHAMPION_LINE). Directional, carries no stat.
export const FOUR_FAILURE_MODES =
  "A signable case walks for one of four reasons: the caller reached voicemail, the injury question never got asked, the callback came a day late, or a Spanish-speaking caller hit an English wall. We tell you which one, per case.";

// ─── The Leak Audit offer (FREE) ─────────────────────────────────────────────
// ONE public wedge name sitewide: the "Leak Audit". (The internal "10-Call
// Autopsy" is the same thing — public copy always says "Leak Audit".)
export const AUDIT_NAME = "Leak Audit";
// Single primary CTA sitewide: the free audit is step one of the beta.
export const CTA_PRIMARY = "Get your free Leak Audit";
// Persistent SECONDARY action: the honest pricing answer during the beta.
// Not "call for pricing" — /pricing states plainly: free during beta, flat
// monthly at launch, number shared individually after the free audit.
export const CTA_SECONDARY = "Pricing & the beta →";
export const CTA_SECONDARY_HREF = "/pricing";
// Risk-reversal sub-CTA line, leads with what the buyer keeps. Flat-fee-safe:
// no outcome promise, no card required to start.
export const SUB_CTA_LINE = SAMPLED_REVIEW
  ? "A real analyst reviews the flags that carry the dollars, and signs the report. You keep the report whether or not you continue. No card, no contract to start."
  : "A real analyst reviews every call. You keep the report whether or not you continue. No card, no contract to start.";
// One-line reassurance shown under each paid buy button.
export const CHECKOUT_REASSURANCE =
  "Flat monthly, cancel anytime. You’ll get a login link by email and a kickoff with Ali before your first statement.";
// The lift line (staff time), pulled near pricing/audit CTAs.
export const LIFT_LINE =
  "About 20 minutes from you and a one-time ~2 hours from your office manager to forward recordings. Built to make your intake manager look good.";
// Trust strip: points at the calibration page. Copy-audit 2026-07-11: must not
// promise a published error rate until /honesty actually publishes one (the page
// currently, correctly, withholds precision/recall until the corpus is documented).
export const HONESTY_STRIP_LINE = "We publish how accurate we are, sample size and all.";
// Reviewer line near buy buttons (role, not a named person — see compliance §V).
// Matches WHO_DOES_THE_WORK: Ali is a former PI paralegal who sat in the intake seat.
export const REVIEWER_LINE = SAMPLED_REVIEW
  ? "A former PI paralegal who sat in the intake seat reviews the flags that matter most and signs off."
  : "A former PI paralegal who sat in the intake seat reviews every score.";
// The stake: free is not a discount, it is the wager. Anchor line, used verbatim.
export const STAKE_LINE = "I charge nothing until the number survives your scrutiny.";
// The FREE Leak Audit (10 calls) is hand-reviewed end to end in BOTH modes — the
// tiered model applies to the ongoing high-volume desk, not this wedge. The ON
// branch therefore KEEPS the hand-review claim ("reviews every one"); it only adds
// the "signs the report" provenance framing. (This deviates deliberately from the
// proposal's weakening ON text, on §V grounds: the free audit really is 100%
// hand-reviewed, so understating it would be less truthful. Flagged in the summary.)
export const AUDIT_FREE_LINE = SAMPLED_REVIEW
  ? "Send us up to 10 of your own recorded intake calls. A real analyst, not just a model, reviews every one against our calibrated PI rubric and signs the report that walks you through the signable cases that slipped, live and free. You keep the written report whether or not we ever work together."
  : "Send us up to 10 of your own recorded intake calls. A real analyst, not just a model, scores every one against our calibrated PI rubric and walks you through the signable cases that slipped, live and free. You keep the written report whether or not we ever work together.";
// Honest capacity, not fake scarcity. Confirmed by Ali (July 2026): 8/month.
export const AUDIT_CAPACITY = 8;
// NOT flag-gated: this renders on the CLIENT audit page (audit/page.tsx, "use
// client"), where a server-evaluated flag would create a hydration mismatch when
// flipped; and "a real analyst reviews every call" is TRUE for the free audit,
// which stays 100% hand-reviewed in both modes. Kept byte-identical. Flagged.
export const AUDIT_CAPACITY_LINE = `Because a real analyst reviews every call, we take on up to ${AUDIT_CAPACITY} audits each month.`;
// ─── Sampled-review page copy (flag-gated; server-rendered only) ─────────────
// Centralized OFF/ON variants for the marketing-page inline strings the tiered
// model touches. OFF branch = the exact current text (byte-identical render); ON
// branch = the honest tiered wording. Each of these renders inside a SERVER
// component (marketing homepage / founder / faq / accuracy), so evaluating the
// flag at module load is safe. Rendered whitespace is unchanged (JSX collapsed
// the source line breaks to single spaces already).

// Homepage step: the ONGOING desk ("we hand back the signable cases that walked").
export const HOME_DESK_SCORING_LINE = SAMPLED_REVIEW
  ? "The engine scores every call; a real analyst reviews the flags that matter and hands you a signed report: which signable callers you already paid for didn’t sign, the evidence for each, and an estimated dollar figure so your team can win them back."
  : "A real analyst scores every call and hands you a signed report: which signable callers you already paid for didn’t sign, the evidence for each, and an estimated dollar figure so your team can win them back.";

// Founder page: Ali's analyst-of-record paragraph (ongoing statements).
export const FOUNDER_ANALYST_PARAGRAPH = SAMPLED_REVIEW
  ? "I’m the analyst of record. The software does the listening at scale, but on every statement I review every high-value and lower-confidence flag, and a sample of the rest, and sign off on what you read, because I know what a signable case sounds like, and a QA function that doesn’t have a human who does isn’t worth much."
  : "I’m the analyst of record. The software does the listening at scale, but I review every audit and every monthly statement and sign off on what you read, because I know what a signable case sounds like, and a QA function that doesn’t have a human who does isn’t worth much.";

// FAQ "Why is the Leak Audit free?" — the free audit stays hand-reviewed; only the
// capacity sentence changes to distinguish the ongoing desk from the free audit.
export const FAQ_WHY_FREE_ANSWER = SAMPLED_REVIEW
  ? "Because we’re early and honest about it: I’d rather earn your trust with a real report than ask for money and trust at the same time. The Leak Audit is free for qualifying California PI firms. A real analyst scores up to 10 of your own recorded calls and walks you through the signable cases that slipped, live, and hands you a written report you keep whether or not we ever work together. Your free audit is hand-reviewed; on the ongoing desk the engine reads everything and I review the flags that carry the dollars. Ali"
  : "Because we’re early and honest about it: I’d rather earn your trust with a real report than ask for money and trust at the same time. The Leak Audit is free for qualifying California PI firms. A real analyst scores up to 10 of your own recorded calls and walks you through the signable cases that slipped, live, and hands you a written report you keep whether or not we ever work together. Because each audit takes real analyst hours, we take on up to 8 a month. Ali";

// Accuracy page: the "how the grade is built" review step (ongoing desk).
export const ACCURACY_REVIEW_LINE = SAMPLED_REVIEW
  ? "Every flag carries the transcript evidence behind it, so you can check the call yourself; a former PI paralegal reviews the flags that carry real dollars or real doubt before you see them, and every finding, reviewed or not, is evidence-checked against the recording."
  : "Every flag carries the transcript evidence behind it, so you can check the call yourself, and a former PI paralegal reviews every score before you see it.";

export const AUDIT_DELIVERABLES: string[] = [
  "A per-call score on our frozen, calibrated PI rubric.",
  "The signable cases that didn’t sign, with the transcript evidence behind each flag.",
  "A dollar figure for the estimated missed signable fee revenue.",
  "The same-day callback script we’d hand your staff for the flagged cases.",
  "A shareable written report your firm keeps.",
];
// The one funnel (present as a single path, no competing offers). During the
// beta no dollar figure appears in public copy (see BETA_* block below).
export const FUNNEL_LINE =
  "Free Leak Audit → a live readout with Ali → the founding beta, free while we finish building → founding-member pricing at launch.";

// ─── Beta program framing (public copy during the beta window) ───────────────
// The beta recruits testers, not evaluators of a price tag. Public copy states
// plainly: FREE during the beta, under three conditions, with a real flat price
// at launch that founding testers lock in at a preferred rate. Never evasive,
// never "call for pricing": /pricing answers the question directly, and Ali
// will tell anyone the landing zone by email. Dollar figures return to public
// copy when the beta ends (founder decision).
export const BETA_FREE_LINE = "Free during the beta. Founding testers lock in preferred pricing at launch.";
export const BETA_WHO_LINE =
  "Intake QA is in a working beta with a small founding cohort of California personal-injury firms. Testers run it on their own recorded intake calls and pay nothing.";
// The three conditions, spelled out (what the beta asks of a tester).
// NOTE (2026-07-12, staged for Ali): the BAA-availability clause was removed —
// no BAA document exists in the repo yet, so promising one is a false claim
// (compliance-invariants §V). A plaintiff PI firm representing injured people is
// generally NOT a HIPAA covered entity, so a BAA is likely the wrong LEAD artifact
// anyway (the NDA + DPA carry the real confidentiality weight, under Rule 1.6/1.18).
// Restore a BAA line ONLY once the executed template exists, and offer it on request
// rather than advertising it. Same fix pending in ops/drafts/lacba-beta-post.md.
export const BETA_CONDITIONS: string[] = [
  "Sign a mutual NDA. Your calls and our beta stay confidential in both directions.",
  "Connect your phone system or upload a sample of your recorded intake calls. That’s the material we analyze; setup is measured in hours, not weeks.",
  "Give structured feedback on user experience and utility after each report you receive: were the flagged cases genuinely signable, was the diagnosis right, would you pay for this.",
];
// The unchanged ground rules, stated wherever the conditions appear.
export const BETA_GROUND_RULES =
  "Two things never change, beta or not: your own staff make every callback, and we never contact your callers.";
// How pricing is handled during the beta (transparent deferral, no games).
export const BETA_PRICING_LINE =
  "There is a real price, and it’s flat: a monthly subscription tiered by call volume, never per case, never per signed client, never a share of any recovery. We share the number individually, after your free Leak Audit, so you can weigh it against what the audit found in your own calls.";
export const BETA_PRICING_HONESTY =
  "We’re not hiding the number to play games; we’re finishing the beta before we publish it. If you want to know where pricing is landing before you apply, email Ali and he’ll tell you straight.";

// ─── The $25,000 find-it-free guarantee (backs the diagnostic + first month) ──
// SUSPENDED FOR THE BETA WINDOW (Ali, 2026-07-09): the desk is free, so there is
// no fee to waive; no public page renders these constants during the beta. They
// return with published pricing at launch. GUARANTEE_METHODOLOGY (below) is the
// exception: it is pure estimation methodology and stays live on /honesty.
// Attaches to the SUBSCRIPTION decision, never to recovered fees (keeps clear of
// FTC §5 / CA §17500 earnings claims and §§6151–6152 / SB 37 outcome-fee optics).
export const GUARANTEE_THRESHOLD = "$25,000";
export const GUARANTEE_CANONICAL =
  "The $25,000 find-it-free guarantee: if your free Leak Audit doesn’t identify at least $25,000 in estimated missed signable case value, we won’t pitch you a subscription, and if you start one anyway, your first month is free. “Estimated missed signable case value” is an estimate of what walked, calculated from your own average fee per case type (or named industry benchmarks where we don’t have it). It is not a promise of what we’ll recover.";
export const GUARANTEE_BADGE_LINE =
  "$25,000 find-it-free guarantee: if the audit doesn’t surface at least $25k in estimated missed signable case value, we won’t pitch you, and if you subscribe anyway your first month is free. An estimate of what walked, not a promise of recovery.";
export const GUARANTEE_METHODOLOGY =
  "How we estimate missed signable case value: we count the signable cases our model flags that didn’t sign, then multiply by your firm’s own average fee per signed case for that case type. Where you haven’t given us your average fee, we substitute a named, sourced benchmark (e.g., auto soft-tissue ~$16,000; serious injuries $55,000+) and label every substituted figure. Estimates are estimates, not a promise of recovered fees; our model’s precision and recall will be published on this page the day the test corpus is documented, and not before.";
// TODO(Ali): collect each firm’s average fee per case type (guarantee methodology input).

// ─── Founding cohort (honest, durable language — no countdown, no "N seats left") ───
// BETA WINDOW: the founding cohort is the free beta (NDA + call access +
// structured feedback), not the paid Charter. The Charter block below is kept
// for launch but is not rendered publicly during the beta.
export const COHORT_MAX = 5;
export const COHORT_LINE = `We’re taking a founding cohort of ${COHORT_MAX} California PI firms into the beta, after each firm’s free Leak Audit.`;

// ─── Data handling (one reconciled promise) ──────────────────────────────────
// Canonical retention, reconciled to what the code actually does (2026-07-10):
// audio deleted at transcription (true everywhere); the 72-hour purge is true for
// the FREE AUDIT pipeline (demo TTL); firm desk data purges on the rolling
// DATA_RETENTION_DAYS sweep (default 90 — keep FIRM_RETENTION_DAYS in sync with
// the env default in inngest/functions.mjs), plus immediate deletion on request.
export const DELETION_HOURS = 72;
export const FIRM_RETENTION_DAYS = 90;
export const DELETION_LINE = `Call audio is deleted the moment it’s transcribed. Free Leak Audit transcripts and reports are purged within ${DELETION_HOURS} hours of your readout; for firms on the desk, transcripts are kept only while we serve you, purged on a rolling ${FIRM_RETENTION_DAYS}-day window, and deleted immediately if you ask in writing.`;
// Breach-notification commitment confirmed by Ali (July 2026): within 72 hours.
export const BREACH_NOTICE_HOURS = 72;

// ─── The accountable-party line (single-accountable-party framing) ───
export const ACCOUNTABLE_PARTY_LINE =
  "Your calls are handled by Intake QA, and we’re the single party accountable to you for them. Transcription and analysis run on specialist engines under our data-processing agreement (every subprocessor is named in the DPA), encrypted in transit and at rest, and your callers’ words are never used to train AI models.";

// ─── SMS / texting posture ───
export const A2P_LINE =
  "Texting activates only after your A2P 10DLC registration is approved, and even then nothing sends without a person on your team approving it first.";

// ─── PI-intake benchmarks (each carries its named ORIGIN source) ─────────────

// Phone-answer rate (Clio 2024 Legal Trends Report). Ali-confirmed 2026-07-12 to
// carry the decline trend alongside the 48% unreachable figure. All three numbers
// (48% unreachable, 40% answer, 56% in 2019) are from the SAME Lux secret-shop and
// coexist by definition (40% answered live + ~12% called back = 52% reachable;
// 48% did neither). Verification: CONFIRMED across Clio’s own PR + blog + independent
// write-ups; direct clio.com PDF fetch was 403-blocked, so page-number rigor pending
// a human opening the 2024 report PDF. Keep to this ONE stat; do not also cite a
// different Clio figure elsewhere.
export const STAT_ANSWER_RATE = {
  value: "48%",
  label: "of firms are essentially unreachable by phone: they never answer a call and never call back. Only 40% answer at all, down from 56% in 2019.",
  source: "Clio 2024 Legal Trends Report (Lux secret-shopper study of 500 US firms)",
};

// Speed-to-lead. REFUTED — DO NOT RENDER, EVER (copy-audit 2026-07-11): the
// "5 minutes = 400%" multiplier failed independent 3-vote verification; it traces
// to recycled vendor lineage, not a checkable primary source. Speed claims stay
// GENERIC and directional (as How-It-Works already phrases it). The constant is
// kept only so nobody re-adds the number from memory without seeing this note.
export const STAT_SPEED_TO_LEAD_REFUTED_DO_NOT_RENDER = {
  value: "400%",
  label: "higher conversion when a firm responds within the first five minutes of an inquiry",
  source: "ALM Global, 2025 — REFUTED in verification, never cite",
};

// PI acquisition economics — cite the ORIGIN (Pareto Legal), not the aggregator.
// Copy-audit 2026-07-11: the old "$468 per signed case" figure printed a broken
// derivation ($284/lead at 7% conversion ≈ $4,057, not $468) and cost-per-signed-
// case dollar benchmarks failed verification as a class. Use the clean, verified
// per-LEAD anchor and let the reader do their own signed-case math.
export const STAT_PI_COST_PER_CASE = {
  value: "$284",
  label: "average cost of a single PI lead, paid before your intake team ever picks up the phone",
  source: "Pareto Legal, \"State of Law Firm PPC\": 13 plaintiff-side firms, $3.3M combined Google Ads + LSA spend, 2025",
};
// REMOVED (copy-audit 2026-07-11): STAT_PI_PPC_COST_PER_CASE ("$2,500 to $3,000
// per signed PI case", National Law Review 2025) — same refuted benchmark class;
// do not reintroduce a cost-per-signed-case dollar figure without a primary source.
// Agency-reporting distrust — attribute to WEBRIS by name; NOT an industry statistic.
export const STAT_WEBRIS_DISTRUST = {
  value: "<10%",
  label: "of PI firms one legal-marketing agency audited could state their true client-acquisition cost with confidence",
  source: "WEBRIS, \"Personal Injury Leads: How Much Should They Cost?\" (after auditing 500+ PI firms)",
};
// Spanish-language / Los Angeles — ONE figure, LA County (the beta recruits via
// LACBA, so the region anchor is LA; the product serves all of California).
export const STAT_LA_HISPANIC = {
  value: "48.4%",
  label: "of Los Angeles County residents are Hispanic or Latino (about 4.75 million people)",
  source: "U.S. Census Bureau, 2020 Census redistricting data",
};

// ─── KILL-LIST guards (deep-research verification, 2026-07-12) ────────────────
// These figures FAILED adversarial verification (circular vendor-laundered or
// mis-attributed) and must NEVER render, especially as the voice/bilingual pivot
// copy gets written. Kept as named landmines so nobody re-adds them from memory.
// Full ledger + the SAFE substitutes: ops/drafts/intake-simplicity-research-brief-2026-07-12.md §6.
export const STAT_SPANISH_LIFT_UNVERIFIED_DO_NOT_RENDER = {
  values: ["40% more likely to retain", "15-25% vs 10-18% conversion", "<12% of firms bilingual", "95% capture"],
  label: "Spanish-intake lift figures — all trace to intake-vendor blogs cross-citing each other; no primary source",
  useInstead:
    "ACS: ~16-18M limited-English Spanish speakers in the US; CSA Research 'Can’t Read, Won’t Buy' — the demand is real; the specific % lift is not measured yet (make it the beta’s instrumented metric).",
  source: "REFUTED in verification, never cite",
};
export const STAT_FIRST_LAWYER_MISATTRIBUTED_DO_NOT_RENDER = {
  values: ["79% (general)", "391% (Velocify)"],
  label: "'first to respond wins' multipliers — mis-attributed / non-legal lineage",
  useInstead: "FindLaw’s ~78% hire the first lawyer they actually speak with (legal-specific) is the defensible version.",
  source: "REFUTED in verification, never cite the 79%/391%",
};
export const STAT_LPL_CARRIER_AI_UNVERIFIED_DO_NOT_RENDER = {
  values: ["60%+ of LPL carriers ask about AI", "CNA’s five AI questions"],
  label: "malpractice-carrier AI-diligence stats — circular ecosystem, no primary CNA document locatable",
  useInstead:
    "Frame the Vendor Due-Diligence File as governance-ready without claiming carriers demonstrably demand it. The verified hook is Rule 1.18 confidentiality of prospective-client info (Cal. Formal Op. 2021-205).",
  source: "UNVERIFIED, do not put the % on any customer-facing page",
};

// ─── Calibration / test corpus ───
// Ali’s call (July 2026): keep precision/recall HIDDEN until we can publish them
// with a named, documented corpus (N, composition, date). Never a bare percentage.
export const TEST_CORPUS_PRECISION: string | null = null;
export const TEST_CORPUS_RECALL: string | null = null;
export const TEST_CORPUS_LABEL = "on our test corpus"; // never "in the field"

// ─── The five signability tiers (Round 7 certified, ICD-203 style) ───────────
// Single source of truth. Displayed once (ConfidenceTierTable) and referenced
// everywhere. ICD-203 rule: never combine a confidence level and a likelihood in
// the same sentence; state the transcript basis for each judgment. The operational
// flag threshold (signability >= 60) maps to Tier 4 and above. Bands use hyphens,
// never en/em-dashes.
export type ConfidenceTier = { tier: number; label: string; definition: string; band: string };
export const CONFIDENCE_TIERS: ConfidenceTier[] = [
  { tier: 5, label: "Very likely signable", definition: "Clear liability and injury, no disqualifier heard.", band: "80-95%" },
  { tier: 4, label: "Likely signable", definition: "Strong indicators, one minor open question.", band: "55-80%" },
  { tier: 3, label: "Roughly even", definition: "Genuinely mixed signals.", band: "45-55%" },
  { tier: 2, label: "Unlikely signable", definition: "Weak indicators, or a likely disqualifier.", band: "20-45%" },
  { tier: 1, label: "Very unlikely", definition: "Clear disqualifier: prior counsel, no injury, or property damage only.", band: "5-20%" },
];
export const CONFIDENCE_TIERS_NOTE =
  "We state the transcript moment behind each judgment, and we never mix a confidence level with a likelihood in the same sentence. A call is flagged for follow-up at Tier 4 and above.";

// ─── What months 2–12 look like (retention story; STATUS-FLAGGED) ────────────
// Presentation-only vs new-build must be labeled. Never market vaporware.
export const MONTH_6_INTRO =
  "The first audit finds the biggest leaks. After that, the desk becomes the one number on your intake that isn’t self-graded: an independent monthly scorecard your intake operation is measured against, across every office, the way you’d never drop your malpractice carrier. Every statement shows whether the leak is shrinking, your team gets credit for the improvement, and new leaks get caught as your marketing and staffing change.";
export const MONTH_6_ITEMS: { title: string; body: string; status: string }[] = [
  {
    title: "A statement that trends over time",
    body: "Your monthly Recovered statement shows the leak shrinking, not just a static snapshot.",
    status: "Live: the Recovered statement updates on its own.",
  },
  {
    title: "An accuracy scorecard on us",
    body: "The Our-accuracy page grades our own calls against what your firm actually signed, so the one number on your intake that isn’t self-graded is ours.",
    status: "Live for the founding cohort.",
  },
  {
    title: "Coaching clips from real calls",
    body: "Short training clips built from your team’s own best calls.",
    status: "In development with the founding cohort.",
  },
  {
    title: "New-leak detection",
    body: "As your marketing and staffing change, new leaks get caught.",
    status: "Present-only (existing capability).",
  },
  {
    title: "Save-protocol conversion tracking",
    body: "Once A2P 10DLC clears, we track how many saved cases the protocol actually recovers.",
    status: "Gated on A2P 10DLC approval (pending).",
  },
];

// ─── Intake-manager champion framing ─────────────────────────────────────────
export const CHAMPION_LINE =
  "This isn’t a gotcha, and it isn’t aimed at any one coordinator. At high volume, good cases slip; that’s math, not a character flaw. The desk gives your intake department proof of the workload, coaching clips built from your own team’s best calls, and a monthly scorecard, per office, that shows the improvement so the credit lands where it’s earned.";

// ─── Pricing (outcome-decoupled: FLAT MONTHLY, tiered by capability/volume) ───
// NEVER a per-recovered-case, per-signed-client, or percentage-of-recovery fee.
// Source of truth for the billing plans seeded in db/migrations/0019 +
// supabase/migrations/0019 (keep in sync). DECIDED July 2026:
//   Core $2,500/mo · Pro $5,000/mo · Charter intro $1,500/mo for 90 days -> Core.
// The buy button POSTs `checkoutPlan` to /api/checkout (Stripe subscription-mode
// Checkout); there is no raw Payment Link as the primary path anymore.
export type PricingTier = {
  name: string;
  planName: string | null;
  price: string;
  priceCents: number;
  callCap: number | null;
  volume: string;
  sub: string;
  featured: boolean;
  // Plan id sent to POST /api/checkout ("core" | "pro" | "charter"). Empty string
  // means this card has no direct checkout (e.g. the free Leak Audit) and links to /audit.
  checkoutPlan: "core" | "pro" | "charter" | "";
};
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free Leak Audit",
    planName: "audit",
    price: "$0",
    priceCents: 0,
    callCap: null,
    volume: "the wedge, no card",
    sub: "Send up to 10 of your own recorded intake calls. A real analyst scores them and walks you through the signable cases that slipped, live and free. You keep the report either way.",
    featured: false,
    checkoutPlan: "", // the wedge starts at /audit, not a subscription checkout
  },
  {
    name: "Core",
    planName: "core",
    price: "$2,500/mo",
    priceCents: 250000,
    callCap: 400,
    volume: "independent scoring of your intake calls",
    sub: "Full-population scoring of your intake calls, monthly missed-revenue statement, and the analyst-of-record readout. Where most firms start.",
    featured: true,
    checkoutPlan: "core",
  },
  {
    name: "Pro",
    planName: "pro",
    price: "$5,000/mo",
    priceCents: 500000,
    callCap: 800,
    volume: "everything in Core, plus higher volume",
    sub: "Everything in Core at higher call volume. The lead win-back workflow is included once it is legally cleared (on the roadmap, not yet live).",
    featured: false,
    checkoutPlan: "pro",
  },
  {
    // Volume tier for high-volume firms / multi-office intake departments above
    // Pro’s 800-call cap. Priced PUBLICLY as "Custom" only, we never invent a
    // dollar number for a volume deal, and it stays a FLAT monthly subscription
    // scoped to call volume, never per case or per signed client (§I). No
    // self-serve checkout: volume pricing is scoped on a call, so checkoutPlan
    // is empty and the card links to a contact path.
    name: "Enterprise",
    planName: "enterprise",
    price: "Custom",
    priceCents: 0,
    callCap: null,
    volume: "over 800 calls/mo, multi-office intake",
    sub: "For high-volume firms and multi-office intake departments above Pro’s call volume: every office on one board, a named analyst of record, and onboarding built around your Director of Intake. Flat monthly, scoped to your volume. Contact us for volume.",
    featured: false,
    checkoutPlan: "",
  },
];

// ─── The Charter ("Founding 5") intro offer ──────────────────────────────────
// A flat $1,500/mo for the first 90 days, then the flat $2,500/mo Core price.
// Hard cap of 5 firms; closes at the 5th firm or Aug 31, 2026, whichever first.
// Sold on Core’s INDEPENDENT SCORING value — never on the (gated) Pro recovery
// workflow. Flat monthly at every phase; never outcome-tied.
export const CHARTER_NAME = "Charter (Founding 5)";
export const CHARTER_PLAN_ID = "charter" as const;
export const CHARTER_INTRO_PRICE = "$1,500/mo";
export const CHARTER_INTRO_PRICE_CENTS = 150000;
export const CHARTER_INTRO_DAYS = 90;
export const CHARTER_STEP_UP_PRICE = "$2,500/mo"; // -> Core after the intro window
export const CHARTER_CAP = 5;
export const CHARTER_CLOSES = "August 31, 2026";
export const CHARTER_HEADLINE = `${CHARTER_INTRO_PRICE} for your first ${CHARTER_INTRO_DAYS} days, then the flat ${CHARTER_STEP_UP_PRICE} Core price.`;
export const CHARTER_SUB = `For the first ${CHARTER_CAP} founding firms only. The Charter is our independent intake-call scoring at a flat founding rate; it closes at the ${CHARTER_CAP}th firm or on ${CHARTER_CLOSES}, whichever comes first. Flat monthly, cancel anytime, never a share of any recovery.`;

// Numeric reference monthly fee used only by the ROI calculator (mirrors Core).
export const REF_MONTHLY_USD = 2500;
// The compliance argument for the pricing model, in lawyer-grade language.
export const PRICING_COMPLIANCE_ARGUMENT =
  "We deliberately do not charge per case, per signed client, or per recovered dollar. Our fee is a flat monthly subscription for a QA and recovery service on your own existing callers. It does not change whether you sign zero cases or fifty. Because our compensation is not tied to procuring or recovering any case, it isn’t a share of a fee under CA Rule 5.4 and can’t be characterized as paying a runner or capper under California Business & Professions Code §§6151-6152 (as strengthened by SB 37). You pay us a flat fee for a service, the same way you pay your answering service or your CRM.";

// ─── Cost comparables (2026-verified; anchor the flat monthly fee) ───
export const PRICING_ANCHOR_LINE =
  "For comparison: AI receptionist tools run about $95 to $400/mo, call-intelligence add-ons $50 to $195/mo, and PI firms commonly spend $500 to $2,000/mo on their CRM and intake platforms. A flat monthly desk fee sits inside the tool budget your firm already carries.";

// ─── Accountable human ───
export const FOUNDER_NAME = "Ali";
export const FOUNDER_EMAIL = "ali@plaintiffops.com";

// ─── Legal entity + document dates (single source for the legal pages) ───
// TODO(Ali): confirm the exact registered legal entity name and state of formation.
export const LEGAL_ENTITY = "Plaintiff Ops LLC";
export const LEGAL_DBA = "Intake QA";
export const LEGAL_LAST_UPDATED = "July 6, 2026";
export const LEGAL_GOVERNING_STATE = "California";

// ─── Spanish letter (/carta) readiness ───────────────────────────────────────
// The Spanish translation of /letter is not written yet. While false, /carta
// stays noindexed and the Footer does NOT link it — we never advertise a page
// that says "Próximamente". Flip to true when the human-translated essay is
// pasted into app/carta/page.tsx.
export const CARTA_READY = false;

// ─── Copyright ───
export const COPYRIGHT_YEAR = new Date().getFullYear();
