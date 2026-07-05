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
  { q: "Is this fee-splitting under Rule 5.4?", a: "No. You pay a flat fee per case, set in advance, that is invariant to the size of any recovery. Because our compensation never changes with your fee, there is nothing to split. We enforce it with an automated fee-invariance test that fails our build if pricing ever becomes contingent on a recovery." },
  { q: "Is texting old leads solicitation under Rule 7.3?", a: "We only help you respond to people who contacted YOUR firm. ABA Model Rule 7.3 Comment [1] says responding to a request for information isn't solicitation. A human on your team approves every message, and we log the consent basis for each contact." },
  { q: "Is this TCPA-compliant?", a: "Seven gates enforce compliance in order, including quiet hours (8pm–8am local) and instant opt-out — including Spanish keywords — with revocation by any reasonable means per the April 2025 FCC rule. Texting stays off until your A2P 10DLC registration clears." },
  { q: "Can I even share call recordings with a vendor in California?", a: "California §632 requires all-party consent to record. We never ask you to do anything with a recording you couldn't already do: audio is deleted at transcription, transcripts are purged on a 72-hour window, and a BAA/DPA is available. Our AI vendor runs a zero-retention posture." },
  { q: "AI hallucinates — how do I know it's accurate?", a: "We publish our numbers: 77% flag precision, 68% recall, and a full list of the cases our model missed and wrongly flagged — with dollar amounts — on the Honesty page." },
  { q: "What does my intake team see?", a: "We score the call, not the person. Every flag ties to a specific moment and a coaching note, not a verdict on your staff, and your intake team sees their own numbers first, before anyone else does. The metric that matters is callback speed, because that's what recovers fees — there are no punitive defaults." },
  { q: "We already use Lead Docket / Filevine / Clio.", a: "Intake QA is post-call QA + recovery, not a CRM replacement. It sits alongside your system of record and pushes findings into it." },
  { q: "Isn't this just another dashboard nobody checks?", a: "The work comes to you: a weekly emailed statement, a 5-minute daily triage queue, and real-time hot-lead alerts. You don't have to go looking." },
  { q: "Is my data training the AI?", a: "No. Under Anthropic's commercial terms your inputs and outputs are not used to train models, and zero-data-retention agreements are available." },
  { q: "What if you find nothing?", a: "The find-it-free guarantee: if your Intake Quality Audit doesn't identify at least $25,000 in recoverable signable fees, you owe nothing." },
  { q: "How does this pay for itself?", a: "One serious signed PI case earns $25,000–$150,000 in fees. Recovering a single lost case covers the software many times over." },
  { q: "What's the catch on a free pilot?", a: "There isn't a hidden one. The pilot is free because I need 3–5 reference-able Southern California PI firms and, only with your written permission, the right to publish an anonymized case study. That's the whole trade." },
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
