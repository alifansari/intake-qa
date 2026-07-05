import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";
import { COHORT_MIN, COHORT_MAX, PILOT_DAYS, DELETION_DAYS } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "FAQ | Intake QA",
  description:
    "Whether the AI is accurate, whether it risks a bar complaint, why the pilot is free, what happens to your data, what your intake manager will think, and whether we'll be here next year.",
  alternates: { canonical: "/faq" },
};

// Ordered by objection severity — the questions a skeptical partner asks first.
const ITEMS: QA[] = [
  {
    q: "The AI could be wrong — won't it embarrass me?",
    a: "You check its work before anything happens. Every call is scored against a fixed rubric, and every flag shows the transcript evidence behind it, so you can verify the call yourself. A person on your team approves every callback before it goes out — the AI drafts, it never sends. We won't print a precision or recall number until we can name the exact test corpus it came from; the calibration page explains the method and the two ways a model like this gets it wrong.",
  },
  {
    q: "Will this get me a bar complaint?",
    a: "The design is built to avoid one, on California authority. Our fee is a flat monthly subscription to analyze your calls — never per case, per signed client, or per recovered dollar — so it can't be characterized as paying an agent to procure or recover business under B&P §§6151–6152 (the capping framework, now backed by SB 37's private right of action). We only help you re-contact people who already called your firm, so responding to their own inquiry isn't soliciting a stranger (Rule 7.3). A person at your firm approves every message (Rule 5.3). The full analysis, with citations, is on the compliance page — and your counsel makes the final call.",
  },
  {
    q: "Why is it free? What's the catch?",
    a: `There isn't a hidden one. We're taking a founding cohort of ${COHORT_MIN}–${COHORT_MAX} Southern California PI firms onto free ${PILOT_DAYS}-day pilots because I need a handful of firms to use it on real calls and tell me where it's wrong — and, only with your written permission, the right to publish an anonymized case study. You get direct access to me and a say in what it becomes. That's the whole trade. — Ali`,
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
          Run your free Intake Quality Audit
        </Link>
      </div>
    </div>
  );
}
