// Getting Started: plain-English guide for non-technical firm staff, shown right
// after onboarding. No data, no client state; a static server component. Explains
// the pilot flow (score -> flag -> approve -> re-engage) and the compliance
// guardrails so staff know exactly what the product does and does not do.

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Getting started · Intake QA" };

const STEPS: { title: string; body: string }[] = [
  {
    title: "1. Your calls get scored",
    body: "Intake calls come in from CallRail (or you upload a recording). Each call is transcribed and scored against your firm's intake rubric. The audio is treated as confidential and purged on schedule.",
  },
  {
    title: "2. Leaked signable cases get flagged",
    body: "When a call looks like a genuinely signable case your team didn't close, it's flagged with the estimated fee at risk and the exact quotes that justify the flag. Weak or out-of-scope calls are honestly left alone.",
  },
  {
    title: "3. You approve every re-engagement text",
    body: "For a flagged case we draft a warm, compliant follow-up text from your approved templates. It lands in your Approval Queue. You approve, edit, or reject each one. Nothing sends on its own.",
  },
  {
    title: "4. The lead signs or books a callback",
    body: "An interested caller gets an e-signature link (Dropbox Sign) or a booked callback. Everything is logged so your weekly report can show recovered fees honestly, signed cases only.",
  },
];

const GUARDRAILS: string[] = [
  "A human approves every outbound text, always.",
  "No texts between 8pm and 8am in the recipient's local time.",
  "STOP / UNSUBSCRIBE opts a number out immediately and forever.",
  "A kill switch can halt all sending instantly; new accounts start halted.",
  "Until your firm is A2P 10DLC approved, all sends are simulated (test mode).",
];

export default function GettingStartedPage() {
  return (
    <PageShell>
      <PageHeader kicker="You're set up" title="Getting started">
        <a href="/queue"><Button variant="primary">Open the approval queue</Button></a>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>How Intake QA works</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-sm border border-line bg-canvas p-4">
                <p className="font-display font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Your compliance guardrails</SectionTitle>
          <div className="rounded-sm border border-amber bg-amber-tint p-4">
            <ul className="space-y-2 text-sm text-ink">
              {GUARDRAILS.map((g) => <li key={g}>• {g}</li>)}
            </ul>
          </div>
          <p className="mt-3 text-xs text-muted">
            These are legal requirements, enforced in code at a single send chokepoint. No part of the
            product can send around them.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <SectionTitle>What to do next</SectionTitle>
          <ol className="ml-4 list-decimal space-y-2 text-sm text-ink">
            <li>Connect CallRail (or upload a recording) so your calls start getting scored.</li>
            <li>Watch the <a className="text-navy underline" href="/queue">Approval Queue</a> for flagged cases and approved-in-advance drafts.</li>
            <li>Review your firm&apos;s message templates anytime. Every change is saved as a new approved version.</li>
            <li>When your A2P 10DLC registration is approved, an operator clears your kill switch to go live.</li>
          </ol>
          <p className="mt-4 text-xs text-faint">
            Want to see the product on one of your own calls first? Try the{" "}
            <a className="text-navy underline" href="/demo">public demo</a>.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
