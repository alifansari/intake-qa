import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";

export const metadata: Metadata = {
  title: "FAQ | Intake QA",
  description:
    "What the pilot costs, what your intake team sees, how sends are approved, and what happens to your data.",
  alternates: { canonical: "/faq" },
};

const ITEMS: QA[] = [
  { q: "Why is it free? What's the catch?", a: "There isn't a hidden one. The pilot is free because I need three to five reference-able Southern California PI firms to use it on real calls and tell me where it's wrong — and, only with your written permission, the right to publish an anonymized case study. You get direct access to me and a say in what it becomes. That's the whole trade. — Ali" },
  { q: "Will this get me a bar complaint?", a: "The whole design is built to avoid one, on California authority. We only help you re-contact people who already called your firm, so it isn't runner/capper (B&P §6152) and responding to someone's own inquiry isn't solicitation (Rule 7.3). Pricing is a flat fee per recovered case, not a percentage and not per-lead. A person at your firm approves every message (Rule 5.3). The full analysis, with citations, is on the compliance page — and your counsel makes the final call." },
  { q: "What happens to my clients' data?", a: "We treat every call as confidential prospective-client information (Cal. Rule 1.18). Calls are stored on Supabase (SOC 2 Type 2, ISO 27001, encrypted), transcribed by AssemblyAI (SOC 2 Type 2), and scored with Anthropic's commercial API, whose terms don't use your data to train AI. We'll sign your NDA and a DPA. One person is accountable: Ali." },
  { q: "The AI could be wrong — how do I know it's accurate?", a: "You check its work. Every call is scored against a fixed rubric, and every flag shows the transcript evidence behind it, so you can verify the call yourself. A person at your firm approves every callback before anything goes out. We won't print a precision or recall number until we can name the exact test corpus it came from — the calibration page explains the method and what we will and won't claim." },
  { q: "Is this fee-splitting?", a: "No. You pay a fixed fee per recovered case, the same whether the case settles for $10,000 or $1,000,000 — not a percentage and not a per-lead fee, so there's nothing to split. That structure also fits the flat-fee carve-out in California's AB 931 (2025)." },
  { q: "Is texting old callers solicitation, or a TCPA problem?", a: "Win-back texts go only to people who already called your firm — responding to an inbound inquiry is not solicitation under Rule 7.3. On TCPA: the FCC's one-to-one consent rule was vacated (Insurance Marketing Coalition v. FCC, Jan. 2025) and repealed; texts still require the right consent basis and honor opt-out, they include 'Reply STOP', and nothing sends until A2P 10DLC registration clears and a person approves. Confirm your consent basis with counsel." },
  { q: "Can I even share call recordings with a vendor in California?", a: "California is all-party consent (Penal Code §632). Intake QA processes calls your firm already recorded — we don't obtain consent for you. Under Kearney v. Salomon Smith Barney, telling callers 'this call is being recorded for quality assurance' at the outset is sufficient. Your firm confirms its own consent process." },
  { q: "Isn't this just call tracking, an answering service, or what my marketing agency does?", a: "No. CallRail tracks calls, Smith.ai answers them, Lead Docket and Filevine route the lead — all at the moment of contact. Intake QA works after the call: it scores 100% of completed calls against a fixed rubric and quantifies the fee dollars that walked. It sits on top of whatever you already use and doesn't replace it." },
  { q: "How much staff time does this take?", a: "About 20 minutes from the owner (a kickoff and sign-off), roughly 2 hours from the office manager to export or forward recordings, and about 5 minutes a day from the intake team on the triage queue. That's the whole lift." },
  { q: "What does my intake team see?", a: "We score the call, not the person. Every flag ties to a specific moment, not a verdict on your staff, and it scores 100% of calls instead of spot-checking a fraction — so it routes attention to the calls worth a callback. It's workload triage, not surveillance." },
  { q: "My malpractice carrier asks about AI — does this help or hurt?", a: "Carriers increasingly ask about AI governance and vendor due diligence. Intake QA is built for that answer: a human at the firm approves every send, the AI makes no legal judgments, subprocessors are named, and your data isn't used to train AI. We don't give insurance or coverage advice — bring the specifics to your carrier." },
  { q: "Do you handle Spanish-language calls?", a: "Yes — the tool scores and drafts in English and Spanish. In Southern California that matters: Latinos were 41% of California's population by 2024 (Public Policy Institute of California; Pew Research Center, 2025), and Spanish-speaking callers are easy to lose at intake." },
  { q: "Who's behind this, and will it be around in six months?", a: "Ali — a former PI intake paralegal, based in Orange County. It's early and honest about it: no logos, no case studies yet. The founding cohort is small on purpose, you get direct access to me, and the product is shaped with the firms using it. — Ali" },
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
