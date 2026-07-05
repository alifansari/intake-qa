import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";

export const metadata: Metadata = {
  title: "How Intake QA recovers cases — all 8 steps",
  description:
    "From call to recovered fee: transcribe, score on a calibrated rubric, flag signable leaks, draft a compliant win-back, human approval, 7 gates, outcome tracking, flat per-case billing.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS: [string, string, string][] = [
  ["Call arrives", "Every intake call comes in through your existing phone system or a manual upload.", "Nothing changes about how your clients reach you."],
  ["Transcribed", "AssemblyAI produces a speaker-separated transcript.", "The audio is deleted the moment the transcript exists."],
  ["Scored 0–100", "Claude scores the call against a frozen, calibrated rubric with gold-standard examples.", "The rubric is version-locked — scores don't drift under you."],
  ["Signable leaks flagged", "A case is flagged when signability ≥60, it wasn't converted, and it's within 72 hours.", "Pure, inspectable logic — not a black box."],
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

      <div className="mt-12 rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
        <h2 className="font-display text-2xl font-semibold">See it on your own calls.</h2>
        <p className="mt-3 max-w-[60ch] text-white/75">
          Upload up to 10 recent intake calls and get a dollar-quantified leak report in minutes.
        </p>
        <Link href="/audit" className="mt-6 inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run my free Leak Audit
        </Link>
      </div>
    </div>
  );
}
