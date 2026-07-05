import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";

export const metadata: Metadata = {
  title: "How it works — from recording to recovered case | Intake QA",
  description:
    "Upload your intake calls, get a scored report of the signable cases that walked, then run the callback workflow with human approval on every send.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS: [string, string, string][] = [
  ["Call arrives", "Every intake call comes in through your existing phone system or a manual upload.", "Nothing changes about how your clients reach you."],
  ["Transcribed", "AssemblyAI produces a speaker-separated transcript.", "The audio is deleted the moment the transcript exists."],
  ["Scored 0–100", "Claude scores the call against a frozen, calibrated rubric with gold-standard examples.", "The rubric is version-locked — scores don't drift under you."],
  ["Signable, not converted — flagged", "A case is flagged when signability ≥60, it wasn't converted, and it's within 72 hours.", "Pure, inspectable logic — not a black box."],
  ["Compliant win-back drafted", "Claude drafts a ≤320-char message that names your firm and includes “Reply STOP”.", "A banned-content guard blocks guarantees, legal advice, and fee claims."],
  ["A human approves", "Someone on your team approves, edits, or rejects every message before anything sends.", "No autonomous sends — ever, in pilot."],
  ["7 compliance gates", "Each approved message passes seven gates, in order, before it can leave.", "Shown in full below — the first failed gate stops the message."],
  ["Outcome tracked → billed flat", "Signed, booked, lost — the outcome is recorded, and you're billed a flat fee per recovered case.", "Never a percentage of your fee (Rule 5.4)."],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">How it works</p>
      <h1 className="mt-3 max-w-[20ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance sm:text-5xl">
        How Intake QA recovers cases — all 8 steps.
      </h1>

      <ol className="mt-12 flex flex-col gap-4">
        {STEPS.map(([title, plain, safeguard], i) => (
          <li key={title} className="flex gap-5 rounded-card border border-hairline bg-surface p-6">
            <span className="tnum flex-none font-display text-2xl font-semibold text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
              <p className="mt-1.5 text-ink-muted">{plain}</p>
              <p className="mt-1 text-sm text-faint">Safeguard: {safeguard}</p>
              {i === 6 && (
                <div className="mt-5">
                  <ComplianceGateDiagram />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Staff-facing reassurance (Change 10) */}
      <section className="mt-14 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">What your intake team sees</h2>
        <p className="mt-2 max-w-[70ch] text-ink-muted">
          We score the call, not the person. Every flag is tied to a specific moment and a coaching
          note, not a verdict on your staff. Your intake team sees their own numbers first, before
          anyone else does. There are no punitive defaults — the point is to get good cases back and
          make the next call better.
        </p>
      </section>

      {/* Your first 30 days, by the clock (Change 12) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Your first 30 days, by the clock</h2>
        <ul className="mt-3 flex flex-col gap-2 text-ink-muted">
          <li><b className="text-ink">Owner:</b> about 20 minutes total — a kickoff call and sign-off.</li>
          <li><b className="text-ink">Office manager:</b> about 2 hours of setup, mostly exporting or forwarding call recordings.</li>
          <li><b className="text-ink">Intake team:</b> about 5 minutes a day on the triage queue.</li>
        </ul>
        <p className="mt-2 text-sm text-faint">That&apos;s the whole lift.</p>
      </section>

      <div className="mt-12 rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
        <h2 className="font-display text-2xl font-semibold">See it on your own calls.</h2>
        <p className="mt-3 max-w-[60ch] text-white/75">
          Upload up to 10 recent intake calls and get a dollar-quantified report of the signable
          cases that walked — in minutes.
        </p>
        <Link href="/audit" className="mt-6 inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
      </div>
    </div>
  );
}
