import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";
import { COHORT_MIN, COHORT_MAX, PILOT_DAYS, DELETION_DAYS, CTA_PRIMARY } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "FAQ | Intake QA",
  description:
    "Why the audit costs $500, how the $50,000 Find-It Guarantee works, what counts as a leaked signable case, whether we replace your answering service, and whether your marketing agency will hate this.",
  alternates: { canonical: "/faq" },
};

// Ordered by the questions a skeptical partner asks first.
const ITEMS: QA[] = [
  {
    q: "Why does the Leak Audit cost $500?",
    a: "Because it's real diagnostic work with real deliverables — a leaked-case list with an estimated fee value on each, an intake performance readout from your own recordings, and sample save-protocol drafts — not a sales call. A serious firm and a serious analysis both put something on the table. And the $500 is credited in full against your first subscription invoice, so a subscribing firm pays nothing on net. Don't subscribe, and you keep the full report — no pitch, no obligation.",
  },
  {
    q: "How does the $50,000 Find-It Guarantee work?",
    a: "If your Leak Audit doesn't identify at least $50,000 in estimated missed signable-case value in your firm's own recent intake calls, we refund your $500 audit fee in full. Read the conditions plainly: the guarantee is on what the audit FINDS in your calls — not on any revenue you recover. We don't promise you'll win cases back; we promise the audit will show you at least $50,000 worth looking at, or you don't pay for it. Exactly how we estimate that value is on the calibration page.",
  },
  {
    q: "What counts as a leaked signable case?",
    a: "A recorded intake call our model scores at or above the signability threshold (≥60 on a fixed rubric) where the caller didn't sign and the call is still inside the callback window. Every flag carries the transcript evidence behind it, so you can check the call yourself. Estimated value = the count of those flagged cases multiplied by your firm's own average fee per signed case for that case type (or a conservative, labeled benchmark where you haven't given us your average).",
  },
  {
    q: "Do you replace my answering service or AI receptionist?",
    a: "No. Tools like Smith.ai and AI receptionists optimize answering the next call. Case Acquisition Intelligence works after the call: it proves which signable cases didn't sign and helps your staff recover them. Keep your receptionist — we tell you what it produced.",
  },
  {
    q: "Will my marketing agency hate this?",
    a: "It shouldn't — but it will make everyone more accountable. Your agency reports clicks, calls, and cost-per-lead. We report what happened after the phone rang: how many callers were actually signable, how many signed, and what the misses were worth. One legal-marketing agency (WEBRIS) reports that after auditing 500+ PI firms, fewer than 10% could state their true client-acquisition cost with confidence. A good agency uses that to prove its leads convert; only an agency hiding weak lead quality has something to fear.",
  },
  {
    q: "The AI could be wrong — won't it embarrass me?",
    a: "You check its work before anything happens. Every call is scored against a fixed rubric, and every flag shows the transcript evidence behind it, so you can verify the call yourself. A person on your team approves every callback before it goes out — the AI drafts, it never sends. We won't print a precision or recall number until we can name the exact test corpus it came from; the calibration page explains the method and the two ways a model like this gets it wrong.",
  },
  {
    q: "Will this get me a bar complaint?",
    a: "The design is built to avoid one, on California authority. Our fee is a flat monthly subscription to analyze your calls — never per case, per signed client, or per recovered dollar — so it can't be characterized as paying an agent to procure or recover business under B&P §§6151–6152 (the capping framework, now backed by SB 37's private right of action). We only help you re-contact people who already called your firm, so responding to their own inquiry isn't soliciting a stranger (Rule 7.3). A person at your firm approves every message (Rule 5.3). The full analysis, with citations, is on the compliance page — and your counsel makes the final call.",
  },
  {
    q: "The audit is $500 — but the pilot is free? What's the catch?",
    a: `Two different things. The $500 Leak Audit is the diagnostic, and it's credited back against your first invoice if you subscribe. The pilot is the subscription itself: we're taking a founding cohort of ${COHORT_MIN}–${COHORT_MAX} Southern California PI firms onto free ${PILOT_DAYS}-day pilots because I need a handful of firms to use it on real calls and tell me where it's wrong — and, only with your written permission, the right to publish an anonymized case study. You get direct access to me and a say in what it becomes. That's the whole trade. — Ali`,
  },
  {
    q: "What happens to my prospective clients' data?",
    a: `We treat every call as confidential prospective-client information (Cal. Rule 1.18). Your recordings and transcripts are deleted within ${DELETION_DAYS} days of your audit readout — and immediately if you ask in writing. Your calls are handled by Intake QA; we use infrastructure providers under contract (the same category your CRM and transcription tools already use), none of whom train AI on your data, and we remain the single party accountable to you. The named providers and their postures are on the security page. We'll sign your NDA and a DPA.`,
  },
  {
    q: "What if my intake manager objects to being monitored?",
    a: "Fair concern, and worth raising with her directly. This scores the call and the process, not her job security. Scoring 100% of calls replaces the unfair 2% spot-check with one even standard, and the report becomes her proof of workload — it documents how many PNCs the team is actually handling and where the volume justifies another hire. Every flag ties to a specific moment with a coaching note, the team sees its own numbers first, and a person on staff approves every send. Most managers who screen this end up championing it because it makes their case for staffing.",
  },
  {
    q: "You're a solo founder — will this be around in a year?",
    a: "Straight answer: it's early, and I'm honest about it — no logos, no case studies yet. The product logic is complete and version-locked, so the scoring doesn't drift under you. The founding cohort is small on purpose, you get direct access to me, and the pilot is free and cancel-anytime, so you can prove the value before you commit a dollar. Your data is deletable on request at any point, so you're never locked in. — Ali",
    // TODO(Ali): confirm the continuity/commitment language you want here (e.g. runway, escrow of scoring config, data-export guarantee).
  },
  {
    q: "Isn't our fee to you basically fee-splitting?",
    a: "No. You pay a fixed monthly subscription to analyze your calls, the same whether you sign zero cases or fifty. It isn't a percentage of any recovery and it isn't per signed case, so there's nothing to split. That's a deliberate choice: a fee tied to whether a case is signed or recovered is what raises the runner/capper question under §§6151–6152, so we don't structure it that way.",
  },
  {
    q: "Is texting old callers solicitation, or a TCPA problem?",
    a: "Win-back texts go only to people who already called your firm — responding to an inbound inquiry is treated differently from soliciting a stranger under Rule 7.3. On the TCPA: the FCC's one-to-one consent rule was vacated (Insurance Marketing Coalition v. FCC, Jan. 2025) and the prior rules reinstated, so bundled consent is again permissible; marketing texts still require prior express written consent and must honor opt-out. That's exactly why win-back SMS is compliance-gated: every draft includes 'Reply STOP,' nothing sends until A2P 10DLC registration clears, and a person approves each one. Confirm your consent basis with counsel.",
  },
  {
    q: "Can I even share call recordings with a vendor in California?",
    a: "California is all-party consent (Penal Code §632; §632.7 for cell calls). Intake QA processes calls your firm already recorded — we don't obtain consent for you. Under Kearney v. Salomon Smith Barney, telling callers 'this call is being recorded for quality assurance' at the outset is the standard pattern. Your firm confirms its own consent process.",
  },
  {
    q: "Isn't this just call tracking, an answering service, or what my marketing agency does?",
    a: "No. CallRail tracks calls, Smith.ai answers them, Lead Docket and Filevine route the PNC — all at the moment of contact. Intake QA works after the call: it scores 100% of completed calls against a fixed rubric and quantifies the fee dollars that didn't convert. It sits on top of whatever you already use and doesn't replace it.",
  },
  {
    q: "How much staff time does this take?",
    a: "About 20 minutes from the owner (a kickoff and sign-off), roughly 2 hours from the office manager to export or forward recordings, and about 5 minutes a day from the intake team on the triage queue. That's the whole lift.",
  },
  {
    q: "My malpractice carrier asks about AI — does this help or hurt?",
    a: "Carriers increasingly ask about AI governance and vendor due diligence. Intake QA is built for that answer: a human at the firm approves every send, the AI makes no legal judgments, the providers we use are named, and your data isn't used to train AI. We don't give insurance or coverage advice — bring the specifics to your carrier.",
  },
  {
    q: "Do you handle Spanish-language calls?",
    a: "Yes — the tool scores and drafts in English and Spanish. In Southern California that matters: Latino residents are the largest ethnic group in California, roughly 40% of the population (U.S. Census / Public Policy Institute of California), and Spanish-speaking callers are easy to lose at intake. Ali built the scoring against real calls in both languages.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">FAQ</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Questions your partners will ask.
      </h1>
      <div className="mt-10">
        <FAQAccordion items={ITEMS} />
      </div>
      <div className="mt-10">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
