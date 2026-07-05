// Public compliance one-pager (Phase 7) — written for a skeptical managing
// partner. States the guardrails as product facts (the 7 send gates, quiet hours,
// opt-out, human approval, audit trail) plus the pricing structure (flat per-case
// fee, Rule 5.4). Static; linked from the demo, audit report, onboarding, and
// /billing. Everything carries a "confirm with your state bar" disclaimer.

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Compliance & pricing — Intake QA",
  description:
    "How Intake QA stays compliant: human approval, quiet hours, opt-out, kill switches, an audit trail, and a flat per-case fee that never touches your legal fees.",
};

const GATES = [
  ["Human approval", "Every outbound text must be approved by a person before it can send. No autonomous sends — ever, in pilot."],
  ["Opt-out honored", "STOP/UNSUBSCRIBE/CANCEL/QUIT/END/REVOKE/OPT OUT (and Spanish ALTO/CANCELAR/PARAR/NO) opt a number out immediately and permanently."],
  ["Global kill switch", "One switch halts ALL sends instantly, across every firm."],
  ["Per-firm autonomy lock", "A firm must be explicitly set to manual approval; there is no autonomous mode in pilot."],
  ["Per-firm kill switch", "Each firm can halt its own sending independently."],
  ["Quiet hours", "No sends 8pm–8am in the recipient's local time."],
  ["Test mode", "Until A2P 10DLC registration is approved, sends are simulated and logged — never transmitted to a real number."],
];

export default function CompliancePage() {
  return (
    <PageShell>
      <PageHeader kicker="For your managing partner" title="Compliance & pricing" />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Every text clears seven gates — in order</SectionTitle>
          <p className="mb-4 mt-1 text-sm text-muted">
            All outbound messaging flows through a single chokepoint in code. The first failed gate
            stops the message. Nothing can send around it.
          </p>
          <ol className="space-y-2">
            {GATES.map(([name, desc], i) => (
              <li key={name} className="flex gap-3 rounded-sm border border-line bg-paper p-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{name}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Consent &amp; audit trail</SectionTitle>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            <li>
              Win-back texts respond to a lead&apos;s <b>own inbound inquiry</b> (an existing-business
              relationship), with the consent basis logged on every message.
            </li>
            <li>Messages are <b>never hard-deleted</b> — the log row (direction, status, approver, timestamps) is retained even after content is purged for retention.</li>
            <li>Recordings and transcripts are treated as confidential and purged on a retention schedule.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Pricing structure (Rule 5.4)</SectionTitle>
          <p className="mt-2 text-sm text-ink">
            Our fee is a <b>flat dollar amount per recovered case</b> that never varies with your
            legal fees — deliberately structured to respect professional-independence rules
            (Rule 5.4 fee-sharing prohibitions). <b>Your fee data is never a billing input.</b> We
            display recovered fees only as an ROI figure; changing them cannot change your invoice.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-faint">
        This page describes how the product is built; it is not legal advice. Confirm all
        marketing, consent, and fee-structure rules with your state bar and ethics counsel before
        going live.
      </p>
    </PageShell>
  );
}
