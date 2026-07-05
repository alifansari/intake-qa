import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";
import {
  CTA_PRIMARY,
  STAT_SPEED_TO_LEAD,
  STAT_LA_SPANISH,
  MONTH_6_INTRO,
  MONTH_6_ITEMS,
  CHAMPION_LINE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "How it works — what lands on your desk | Intake QA",
  description:
    "Case Acquisition Intelligence in practice: signable-case detection on every call, a staff-sent same-day save protocol, and a monthly missed-revenue statement that reads like a P&L for your intake.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS: [string, string, string][] = [
  ["Call arrives", "Every intake call comes in through your existing phone system or a manual upload.", "Nothing changes about how your clients reach you."],
  ["Transcribed", "AssemblyAI produces a speaker-separated transcript.", "The audio is deleted the moment the transcript exists."],
  ["Scored 0–100", "Claude scores the call against a frozen, calibrated rubric with gold-standard examples.", "The rubric is version-locked — scores don't drift under you."],
  ["Signable-case detection", "A case is flagged when signability ≥60, it wasn't converted, and it's within 72 hours.", "Pure, inspectable logic — not a black box."],
  ["Same-day save protocol drafted", "We draft a ≤320-char follow-up that names your firm and includes “Reply STOP” — a follow-up your staff reviews and sends, never automated.", "A banned-content guard blocks guarantees, legal advice, and fee claims."],
  ["A human approves", "Someone on your team approves, edits, or rejects every message before anything sends.", "No autonomous sends — ever, in pilot."],
  ["7 compliance gates", "Each approved message passes seven gates, in order, before it can leave.", "Shown in full below — the first failed gate stops the message."],
  ["Missed-revenue statement updates", "Your monthly statement records signable calls analyzed, cases that signed, cases that walked, estimated missed fee value, and saves recovered.", "One artifact that reads like a P&L for your intake — not another dashboard to log into."],
  ["Flat monthly subscription", "You pay a flat monthly fee tiered by call volume — the same whether you sign zero cases or fifty.", "Never per case, per client, or per recovered dollar (Cal. B&P §§6151–6152)."],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">How it works</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance sm:text-5xl">
        What lands on your desk — all 8 steps.
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

      {/* Staff-facing reassurance — the intake manager is the champion, not the target */}
      <section className="mt-14 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">For the intake team: this is on your side</h2>
        <p className="mt-2 max-w-[70ch] text-ink-muted">
          We score the call and the process, not the individual&apos;s job security. When the phones
          spike after a campaign, even a great intake team can&apos;t catch every callback — that&apos;s
          a staffing-and-timing problem, not a people problem, and the report says so. Scoring 100% of
          calls replaces the unfair 2% spot-check with an even standard for everyone.
        </p>
        <p className="mt-3 max-w-[70ch] text-ink-muted">{CHAMPION_LINE}</p>
        <p className="mt-3 max-w-[70ch] text-ink-muted">
          It&apos;s proof of workload — the case an office manager usually has to make from memory:
          you&apos;re not short on effort, you&apos;re short on hours. The team sees its own numbers
          first, and a person on staff approves every send. It protects careers; it doesn&apos;t
          threaten them.
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

      {/* Speed-to-lead measurement (from your own recordings) — ONE stat */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">We measure speed, from your own recordings</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">
          We measure time-to-answer and time-to-callback on your own calls, because speed decides
          conversions: firms that respond within the first five minutes of an inquiry see a{" "}
          <b className="text-ink">{STAT_SPEED_TO_LEAD.value}</b> higher conversion rate
          ({STAT_SPEED_TO_LEAD.source}).
          {/* TODO(Ali): confirm this is the single speed-to-lead stat you want; do not stack it with a response-time study. */}
        </p>
      </section>

      {/* What months 2–12 look like (retention story; status-flagged) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">What months 2–12 look like</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">{MONTH_6_INTRO}</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
          {MONTH_6_ITEMS.map((m) => (
            <li key={m.title}>
              <b className="text-ink">{m.title}:</b> {m.body}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          Some of the above is live today and some is rolling out with the founding cohort — we label
          which is which in your kickoff, and we never bill for something that isn&apos;t running yet.
          {/* TODO(Ali): confirm build status of each MONTH_6_ITEMS entry (trend view, scorecards, coaching clips, cohort benchmark) before presenting any as live. */}
        </p>
      </section>

      {/* Spanish-language intake (SoCal edge) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Spanish-language calls, analyzed natively</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">
          We analyze Spanish-language intake calls natively — not translated afterward. In the Los
          Angeles metro, {STAT_LA_SPANISH.value} of people age 5 and older speak Spanish at home
          ({STAT_LA_SPANISH.source}), and a signable Spanish-speaking caller is worth exactly as much
          as any other. Ali is bilingual and built the scoring against real calls in both languages.
          {/* TODO(Ali): confirm the LA-metro Spanish-at-home figure/vintage (USAFacts/ACS). */}
        </p>
      </section>

      <div className="mt-12 rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
        <h2 className="font-display text-2xl font-semibold">See it on your own calls.</h2>
        <p className="mt-3 max-w-[60ch] text-white/75">
          Upload up to 10 recent intake calls and get a dollar-quantified report of the signable
          cases that didn&apos;t sign — with the evidence behind every flag.
        </p>
        <Link href="/audit" className="mt-6 inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
