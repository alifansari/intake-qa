import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";
import { COHORT_MIN, COHORT_MAX, PILOT_DAYS, DELETION_DAYS, CTA_PRIMARY, GUARANTEE_THRESHOLD } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "FAQ | Intake QA",
  description:
    "Why the audit is free, what the $25,000 find-it-free guarantee actually backs, how we differ from your AI receptionist or agency, what months 2-12 look like, and how your data is handled.",
  alternates: { canonical: "/faq" },
};

// Ordered by the new objection stack (v3 report).
const ITEMS: QA[] = [
  {
    q: "Why is the audit free?",
    a: "Because we're early and honest about it: I'd rather earn your trust with a real report than ask for money and trust at the same time. The Intake Quality Audit is free for qualifying Southern California PI firms. A real analyst reviews up to 10 of your recent calls and hands you a written report you keep whether or not we ever work together. Because each audit takes real analyst hours, we take on up to 8 a month. Ali",
  },
  {
    q: `What does the ${GUARANTEE_THRESHOLD} find-it-free guarantee actually back?`,
    a: `A diagnostic threshold, not a case outcome. If the free audit doesn't surface at least ${GUARANTEE_THRESHOLD} in estimated missed signable case value in your own calls, we won't pitch you a subscription, and if you start one anyway, your first month is free. "Estimated missed signable case value" is calculated from your own average fee per case type (or named industry benchmarks where we don't have it), and it's an estimate of what walked, never a promise of what we'll recover. That distinction is deliberate: a promise tied to recovered fees would raise runner/capper and earnings-claim problems. See how we calculate it on the calibration page.`,
  },
  {
    q: "I already have an AI receptionist / answering service / Lead Docket / a marketing agency that reports on this.",
    a: "Good, keep them; we don't replace them. But each of those grades its own work. Your AI receptionist scores the calls it answered. Your agency reports on the leads it sold you. Lead Docket routes and tracks at capture. We're the independent desk: we score 100% of your calls across every channel (including the ones your team answered live at 2pm), reconcile them against who actually signed weeks later, and we're paid the same flat fee no matter what we find. If your problem is missed calls, buy an AI receptionist. Our work starts where the phone gets answered.",
  },
  {
    q: "Once you've found the big leaks, why keep paying in months 2-12?",
    a: "The first audit finds the biggest leaks; after that the desk becomes your standing intake QA function. Every month your statement shows whether the leak is shrinking, your intake team gets credit for the improvement, and new leaks get caught as your marketing and staffing change. Some of that (trend view, scorecards, coaching clips) is rolling out with the founding cohort and we'll tell you plainly what's live versus in development. We don't bill for what isn't running.",
  },
  {
    q: "Will my intake manager hate this?",
    a: "She shouldn't. It's built to make her a champion, not a target. This isn't a gotcha: high-volume intake means good cases slip, and that's math, not a character flaw. The desk gives her proof of the workload (you're not short on effort, you're short on hours), coaching clips built from the team's own best calls, and a monthly scorecard that shows improvement so credit lands where it's earned. It catches what volume caused, not people.",
  },
  {
    q: "The AI could be wrong. Won't it embarrass me?",
    a: "You check its work before anything happens. Every call is scored against a fixed rubric, and every flag shows the transcript evidence behind it, so you can verify the call yourself. A person on your team approves every callback before it goes out. The AI drafts, it never sends. We won't print a precision or recall number until we can name the exact test corpus it came from; the calibration page explains the method and the two ways a model like this gets it wrong.",
  },
  {
    q: "Will this get me a bar complaint?",
    a: "The design is built to avoid one, on California authority. Our fee is a flat monthly subscription to analyze your calls (never per case, per signed client, or per recovered dollar), so it can't be characterized as paying an agent to procure or recover business under B&P §§6151-6152 (the capping framework, now backed by SB 37's private right of action). We only help you re-contact people who already called your firm, so responding to their own inquiry isn't soliciting a stranger (Rule 7.3). A person at your firm approves every message (Rule 5.3). The full analysis, with citations, is on the compliance page, and your counsel makes the final call.",
  },
  {
    q: "What happens to my prospective clients' data?",
    a: `We treat every call as confidential prospective-client information (Cal. Rule 1.18). Call audio is deleted the moment it's transcribed; transcripts and reports are deleted within ${DELETION_DAYS} days of your readout, or immediately if you ask in writing. Your calls are handled by Intake QA and analyzed by our own models (encrypted in transit and at rest, never used to train our models, never sold or shared), and we're the single party accountable to you. We'll sign your NDA and a DPA. The full posture is on the security page.`,
  },
  {
    q: "You're a solo founder. Will this be around in a year?",
    a: `Straight answer: it's early, and I'm honest about it. No logos, no case studies yet. The product logic is complete and version-locked, so the scoring doesn't drift under you. The founding cohort is ${COHORT_MIN}-${COHORT_MAX} firms on purpose, you get direct access to me, and the ${PILOT_DAYS}-day pilot is free and cancel-anytime, so you can prove the value before you commit a dollar. Your data is deletable on request at any point, so you're never locked in. Ali`,
  },
  {
    q: "Isn't our fee to you basically fee-splitting?",
    a: "No. You pay a fixed monthly subscription to analyze your calls, the same whether you sign zero cases or fifty. It isn't a percentage of any recovery and it isn't per signed case, so there's nothing to split. That's a deliberate choice: a fee tied to whether a case is signed or recovered is what raises the runner/capper question under §§6151-6152, so we don't structure it that way.",
  },
  {
    q: "Is texting old callers solicitation, or a TCPA problem?",
    a: "The same-day save protocol goes only to people who already called your firm. Responding to an inbound inquiry is treated differently from soliciting a stranger under Rule 7.3. On the TCPA: the FCC's one-to-one consent rule was vacated (Insurance Marketing Coalition v. FCC, Jan. 2025) and the prior rules reinstated, so bundled consent is again permissible; marketing texts still require prior express written consent and must honor opt-out. That's exactly why the protocol is compliance-gated: every draft includes 'Reply STOP,' nothing sends until A2P 10DLC registration clears, and a person approves each one. Confirm your consent basis with counsel.",
  },
  {
    q: "Can I even share call recordings with a vendor in California?",
    a: "California is all-party consent (Penal Code §632; §632.7 for cell calls). Intake QA processes calls your firm already recorded. We don't obtain consent for you. Under Kearney v. Salomon Smith Barney, telling callers 'this call is being recorded for quality assurance' at the outset is the standard pattern. Your firm confirms its own consent process.",
  },
  {
    q: "How much staff time does this take?",
    a: "About 20 minutes from the owner (a kickoff and sign-off), roughly 2 hours from the office manager to export or forward recordings, and about 5 minutes a day from the intake team on the triage queue. That's the whole lift.",
  },
  {
    q: "My malpractice carrier asks about AI. Does this help or hurt?",
    a: "Carriers increasingly ask about AI governance and vendor due diligence. Intake QA is built for that answer: a human at the firm approves every send, the AI makes no legal judgments, the providers we use are named, and your data isn't used to train AI. We don't give insurance or coverage advice, so bring the specifics to your carrier.",
  },
  {
    q: "Do you handle Spanish-language calls?",
    a: "Yes, the desk analyzes and drafts in English and Spanish, natively, not translated afterward. In Southern California that matters: in the Los Angeles metro, 34.5% of people age 5 and older speak Spanish at home (USAFacts, 2019-2023 American Community Survey), and a signable Spanish-speaking caller is worth exactly as much as any other. Ali is bilingual and built the scoring against real calls in both languages.",
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
