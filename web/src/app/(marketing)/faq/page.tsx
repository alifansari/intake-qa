import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";
import { DELETION_HOURS, FIRM_RETENTION_DAYS, CTA_PRIMARY, CTA_SECONDARY, CTA_SECONDARY_HREF, LIFT_LINE, FOUNDER_EMAIL, FAQ_WHY_FREE_ANSWER } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "FAQ | Intake QA",
  description:
    "What the beta costs (nothing) and what it asks, why the audit is free, how we differ from your AI receptionist or agency, what months 2-12 look like, and how your data is handled.",
  alternates: { canonical: "/faq" },
};

// Ordered by the new objection stack (v3 report). The top unspoken objection
// leads: does this recover money, or only tell me I’m losing it?
const ITEMS: QA[] = [
  {
    q: "Will this actually recover money, or just tell me I’m losing it?",
    a: "Honest answer: today the desk finds the money and hands it to your team to recover, it doesn’t recover it for you. Every flagged signable lead lands on one screen so your own team can call back the same day, while the lead is still warm, that’s where recovery happens. The monthly statement then shows whether last month’s leak is shrinking, so next month’s intake gets better. The compliant SMS win-back, where the desk drafts a text and a person at your firm approves it, is on the roadmap and gated on A2P 10DLC registration; you don’t pay for it until it’s live and we’ll tell you plainly what’s running versus in development.",
  },
  {
    q: "What does it cost?",
    a: `Nothing during the beta. We’re running a working beta with a small founding cohort of California PI firms, and the deal is explicit: you sign a mutual NDA, connect your phone system or upload a sample of your recorded intake calls, and give structured feedback on user experience and utility after each report. In exchange you use the full desk free, your own staff make every callback, and we never contact your callers. There is a real price at launch, and it’s flat: a monthly subscription tiered by call volume, never per case, never per signed client, never a share of any recovery. We share the number individually after your free Leak Audit, so you can weigh it against what the audit found in your own calls, and founding testers lock in preferred pricing at launch. If you want to know where pricing is landing before you apply, email me at ${FOUNDER_EMAIL} and I’ll tell you straight. Ali`,
  },
  {
    q: "Why is the Leak Audit free?",
    a: FAQ_WHY_FREE_ANSWER,
  },
  {
    q: "I already have an AI receptionist / answering service / Lead Docket / a marketing agency that reports on this.",
    a: "Good, keep them; we don’t replace them. But each of those grades its own work. Your AI receptionist scores the calls it answered. Your agency reports on the leads it sold you. Lead Docket routes and tracks at capture. We’re the independent desk: we score 100% of your calls across every channel (including the ones your team answered live at 2pm), reconcile them against who actually signed weeks later, and we’re paid the same flat fee no matter what we find. If your problem is missed calls, buy an AI receptionist. Our work starts where the phone gets answered.",
  },
  {
    q: "Once you’ve found the big leaks, why keep paying in months 2-12?",
    a: "The first audit finds the biggest leaks; after that the desk becomes your standing intake QA function. Every month your statement shows whether the leak is shrinking, your intake team gets credit for the improvement, and new leaks get caught as your marketing and staffing change. Some of that (trend view, scorecards, coaching clips) is rolling out with the founding cohort and we’ll tell you plainly what’s live versus in development. We don’t bill for what isn’t running.",
  },
  {
    q: "Will our intake department push back on this?",
    a: "They shouldn’t. It’s built to make the department look good, not to single anyone out. This isn’t a gotcha: at high volume good cases slip, and that’s math, not a character flaw. The desk gives your intake leadership proof of the workload (the team isn’t short on effort, it’s short on hours), coaching clips built from your own team’s best calls, and a monthly scorecard, per office, that shows improvement so credit lands where it’s earned. It catches what volume caused, not people.",
  },
  {
    q: "The AI could be wrong. Won’t it embarrass me?",
    a: "You check its work before anything happens. Every call is scored against a fixed rubric, and every flag shows the transcript evidence behind it, so you can verify the call yourself. A person on your team approves every callback before it goes out. The AI drafts, it never sends. We won’t print a precision or recall number until we can name the exact test corpus it came from; the calibration page explains the method and the two ways a model like this gets it wrong.",
  },
  {
    q: "Will this get me a bar complaint?",
    a: "The design is built to avoid one, on California authority. Our fee is a flat monthly subscription to analyze your calls (never per case, per signed client, or per recovered dollar), so it can’t be characterized as paying an agent to procure or recover business under B&P §§6151-6152 (the capping framework, now backed by SB 37’s private right of action). We only help you re-contact people who already called your firm, so responding to their own inquiry isn’t soliciting a stranger (Rule 7.3). A person at your firm approves every message (Rule 5.3). The full analysis, with citations, is on the compliance page, and your counsel makes the final call.",
  },
  {
    q: "What happens to my prospective clients’ data?",
    a: `We treat every call as confidential prospective-client information (Cal. Rule 1.18). Call audio is deleted the moment it’s transcribed. Free Leak Audit transcripts and reports are purged within ${DELETION_HOURS} hours of your readout; for firms on the desk, transcripts are kept only while we serve you (so your team can check the evidence behind each flag), purged on a rolling ${FIRM_RETENTION_DAYS}-day window, and deleted immediately if you ask in writing. Your calls are handled by Intake QA: transcription and analysis run on specialist engines under our DPA (encrypted in transit and at rest, never used to train AI models, never sold or shared), and we’re the single party accountable to you. We’ll sign your NDA and a DPA. The full posture is on the security page.`,
  },
  {
    q: "Will this be reliable at our volume, and are we locked in?",
    a: `Straight answer, without the sales gloss. The scoring logic is complete and version-locked, so a Tier 4 means the same thing across every office and every month; the score doesn’t drift under you. The desk runs on top of the phones and the case-management system you already use (Filevine, CasePeer, Litify, or your own stack), so there’s nothing to migrate and nothing that breaks if you leave. Your data is deletable on request at any point, and the fee is a flat monthly subscription, so you can prove the value on your own calls before you commit and walk away clean if it isn’t worth it. During the beta it’s free; at launch the fee is flat monthly, tiered by call volume, with a custom volume tier for high-call and multi-office firms, and founding firms lock in preferred pricing. Ali`,
  },
  {
    q: "Isn’t our fee to you basically fee-splitting?",
    a: "No. You pay a fixed monthly subscription to analyze your calls, the same whether you sign zero cases or fifty. It isn’t a percentage of any recovery and it isn’t per signed case, so there’s nothing to split. That’s a deliberate choice: a fee tied to whether a case is signed or recovered is what raises the runner/capper question under §§6151-6152, so we don’t structure it that way.",
  },
  {
    q: "Is texting old callers solicitation, or a TCPA problem?",
    a: "First, the beta reality: nothing texts anyone today. During the beta your own staff make every callback, and we never contact your callers. The texting assist is a roadmap feature, and when it arrives the same-day save protocol goes only to people who already called your firm. Responding to an inbound inquiry is treated differently from soliciting a stranger under Rule 7.3. On the TCPA: the FCC’s one-to-one consent rule was vacated (Insurance Marketing Coalition v. FCC, Jan. 2025) and the prior rules reinstated, so bundled consent is again permissible; marketing texts still require prior express written consent and must honor opt-out. That’s exactly why the protocol is compliance-gated: every draft includes ‘Reply STOP,’ nothing sends until A2P 10DLC registration clears, and a person approves each one. Confirm your consent basis with counsel.",
  },
  {
    q: "Can I even share call recordings with a vendor in California?",
    a: "California is all-party consent (Penal Code §632; §632.7 for cell calls). Intake QA processes calls your firm already recorded. We don’t obtain consent for you. Under Kearney v. Salomon Smith Barney, telling callers ‘this call is being recorded for quality assurance’ at the outset is the standard pattern. Your firm confirms its own consent process.",
  },
  {
    q: "How much staff time does this take?",
    a: "About 20 minutes from the owner (a kickoff and sign-off), roughly 2 hours from the office manager to export or forward recordings, and about 5 minutes a day from the intake team on the triage queue. That’s the whole lift.",
  },
  {
    q: "My malpractice carrier asks about AI. Does this help or hurt?",
    a: "Carriers increasingly ask about AI governance and vendor due diligence. Intake QA is built for that answer: a human at the firm approves every send, the AI makes no legal judgments, the providers we use are named, and your data isn’t used to train AI. We don’t give insurance or coverage advice, so bring the specifics to your carrier.",
  },
  {
    q: "Do you handle Spanish-language calls?",
    a: "We detect the call’s language automatically. Today our scoring rubric is calibrated and validated on English-language calls; we won’t claim validated Spanish-language scoring until we can show the test corpus behind it, so during the beta Spanish calls are reviewed personally. In California this matters: 48.4% of Los Angeles County residents are Hispanic or Latino (U.S. Census Bureau, 2020 Census redistricting data), Spanish-first callers are often where English-only intake leaks most, and a signable Spanish-speaking caller is worth exactly as much as any other. Ali is bilingual and reviews flagged Spanish calls himself.",
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
      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
        <Link href={CTA_SECONDARY_HREF} className="text-sm font-medium text-ink-muted hover:text-ink">
          {CTA_SECONDARY}
        </Link>
      </div>
      <p className="mt-3 max-w-[66ch] text-sm text-faint">{LIFT_LINE}</p>
    </div>
  );
}
