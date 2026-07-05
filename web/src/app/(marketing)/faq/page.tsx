import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, type QA } from "@/components/marketing/FAQAccordion";

export const metadata: Metadata = {
  title: "FAQ — Intake QA",
  description:
    "Rule 5.4, Rule 7.3, TCPA, California §632, AI accuracy, staff scoring, CRM fit, data training, the find-it-free guarantee, and ROI — answered.",
  alternates: { canonical: "/faq" },
};

const ITEMS: QA[] = [
  { q: "Is this fee-splitting under Rule 5.4?", a: "No. You pay a flat fee per case, set in advance, that is invariant to the size of any recovery. Because our compensation never changes with your fee, there is nothing to split. We enforce it with an automated fee-invariance test that fails our build if pricing ever becomes contingent on a recovery." },
  { q: "Is texting old leads solicitation under Rule 7.3?", a: "We only help you respond to people who contacted YOUR firm. ABA Model Rule 7.3 Comment [1] says responding to a request for information isn't solicitation. A human on your team approves every message, and we log the consent basis for each contact." },
  { q: "Is this TCPA-compliant?", a: "Seven gates enforce compliance in order, including quiet hours (8pm–8am local) and instant opt-out — including Spanish keywords — with revocation by any reasonable means per the April 2025 FCC rule. Texting stays off until your A2P 10DLC registration clears." },
  { q: "Can I even share call recordings with a vendor in California?", a: "California §632 requires all-party consent to record. We never ask you to do anything with a recording you couldn't already do: audio is deleted at transcription, transcripts are purged on a 72-hour window, and a BAA/DPA is available. Our AI vendor runs a zero-retention posture." },
  { q: "AI hallucinates — how do I know it's accurate?", a: "We publish our numbers: 77% flag precision, 68% recall, and a full list of the cases our model missed and wrongly flagged — with dollar amounts — on the Honesty page." },
  { q: "My staff will hate being scored.", a: "It's a coaching tool, not a gotcha. The rep scoreboard exists to improve callback speed — the single metric that recovers the most fees — not to punish." },
  { q: "We already use Lead Docket / Filevine / Clio.", a: "Intake QA is post-call QA + recovery, not a CRM replacement. It sits alongside your system of record and pushes findings into it." },
  { q: "Isn't this just another dashboard nobody checks?", a: "The work comes to you: a weekly emailed statement, a 5-minute daily triage queue, and real-time hot-lead alerts. You don't have to go looking." },
  { q: "Is my data training the AI?", a: "No. Under Anthropic's commercial terms your inputs and outputs are not used to train models, and zero-data-retention agreements are available." },
  { q: "What if you find nothing?", a: "The find-it-free guarantee: if your Leak Audit doesn't identify at least $25,000 in recoverable signable fees, you owe nothing." },
  { q: "How does this pay for itself?", a: "One serious signed PI case earns $25,000–$150,000 in fees. Recovering a single leaked case covers the software many times over." },
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
          Run my free Leak Audit
        </Link>
      </div>
    </div>
  );
}
