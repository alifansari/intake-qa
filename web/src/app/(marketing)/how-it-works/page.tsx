import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";
import {
  CTA_PRIMARY,
  STAT_LA_SPANISH,
  MONTH_6_INTRO,
  MONTH_6_ITEMS,
  CHAMPION_LINE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "How it works: what lands on your desk | Intake QA",
  description:
    "How Intake QA works: we score every intake call, flag the signable cases that slipped, send a same-day Recoverable-Lead Alert your team approves before anything sends, and hand you a monthly Missed-Revenue Statement that reads like a P&L for your intake.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS: [string, string, string][] = [
  ["Month-Zero Baseline, co-signed", "Before we change anything, we co-sign a Baseline that records where your intake stands today, so every later number is measured against a line we both agreed to.", "You approve the starting point; nobody moves the goalposts later."],
  ["Call arrives", "Every intake call comes in through your existing phone system or a manual upload.", "Nothing changes about how your clients reach you."],
  ["Transcribed", "Our transcription model produces a speaker-separated transcript.", "The audio is deleted the moment the transcript exists."],
  ["Scored, and placed in a tier", "Each call is scored against a frozen, calibrated rubric and placed in one of five plain-English signability tiers.", "The rubric is version-locked, so a Tier 4 means the same thing every month."],
  ["Signable-case detection", "A case is flagged when it reaches Tier 4 or above, it wasn't converted, and it's within 72 hours.", "Pure, inspectable logic, not a black box."],
  ["Ali reviews every flagged call", "A named analyst reviews every flag and the transcript moment behind it before it reaches your queue.", "Not an autonomous model deciding on its own; a person who knows what a signable case sounds like."],
  ["Same-day Recoverable-Lead Alert", "You get a one-screen Alert the same day. Lead value fades fast, so the play is a callback within the hour.", "A specific, same-day SLA, because speed is the biggest lever on recovery."],
  ["A human approves the follow-up", "Your staff reviews, edits, or rejects every ≤320-character follow-up (with “Reply STOP”) before anything sends, and each message clears seven compliance gates in order.", "No autonomous sends, ever, in pilot. The first failed gate stops the message."],
  ["Monthly Missed-Revenue Statement", "A two-page monthly Statement, signed by the analyst, shows what walked in dollars, the trend, and the Saved-Case Ledger. A standing 15-minute review call and a Right of Reply come with it.", "Challenge any finding; your correction runs, unedited, in the next Statement's Corrections column."],
  ["Flat monthly fee", "You pay one flat monthly fee tiered by call volume, the same whether you sign zero cases or fifty.", "Never per case, per client, or per recovered dollar (Cal. B&P §§6151-6152)."],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">How it works</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance sm:text-5xl">
        What lands on your desk, the whole loop.
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
              {i === 7 && (
                <div className="mt-5">
                  <ComplianceGateDiagram />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Staff-facing reassurance: the intake manager is the champion, not the target */}
      <section className="mt-14 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">For the intake team: this is on your side</h2>
        <p className="mt-2 max-w-[70ch] text-ink-muted">
          We score the call and the process, not the individual&apos;s job security. When the phones
          spike after a campaign, even a great intake team can&apos;t catch every callback. That&apos;s
          a staffing-and-timing problem, not a people problem, and the report says so. Scoring 100% of
          calls replaces the unfair 2% spot-check with an even standard for everyone.
        </p>
        <p className="mt-3 max-w-[70ch] text-ink-muted">{CHAMPION_LINE}</p>
        <p className="mt-3 max-w-[70ch] text-ink-muted">
          It&apos;s proof of workload, the case an office manager usually has to make from memory:
          you&apos;re not short on effort, you&apos;re short on hours. The team sees its own numbers
          first, and a person on staff approves every send. It protects careers; it doesn&apos;t
          threaten them.
        </p>
      </section>

      {/* Your first 30 days, by the clock (Change 12) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Your first 30 days, by the clock</h2>
        <ul className="mt-3 flex flex-col gap-2 text-ink-muted">
          <li><b className="text-ink">Owner:</b> about 20 minutes total, a kickoff call and sign-off.</li>
          <li><b className="text-ink">Office manager:</b> about 2 hours of setup, mostly exporting or forwarding call recordings.</li>
          <li><b className="text-ink">Intake team:</b> about 5 minutes a day on the triage queue.</li>
        </ul>
        <p className="mt-2 text-sm text-faint">That&apos;s the whole lift.</p>
      </section>

      {/* Speed-to-lead measurement (from your own recordings): ONE stat */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">We measure speed, from your own recordings</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">
          We measure time-to-answer and time-to-callback on your own calls, because speed decides
          conversions: the faster a firm responds to a new inquiry (minutes, not hours) the more of
          those callers sign. We show you where your own response times are costing you signable cases.
        </p>
      </section>

      {/* What months 2-12 look like (retention story; status-flagged) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">What months 2-12 look like</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">{MONTH_6_INTRO}</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
          {MONTH_6_ITEMS.map((m) => (
            <li key={m.title}>
              <b className="text-ink">{m.title}:</b> {m.body}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          Some of the above is live today and some is rolling out with the founding cohort. We label
          which is which in your kickoff, and we never bill for something that isn&apos;t running yet.
        </p>
      </section>

      {/* Spanish-language intake (SoCal edge) */}
      <section className="mt-6 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Spanish-language calls, analyzed natively</h2>
        <p className="mt-2 max-w-[72ch] text-ink-muted">
          We analyze Spanish-language intake calls natively, not translated afterward. In the Los
          Angeles metro, {STAT_LA_SPANISH.value} of people age 5 and older speak Spanish at home
          ({STAT_LA_SPANISH.source}), and a signable Spanish-speaking caller is worth exactly as much
          as any other. Ali is bilingual and built the scoring against real calls in both languages.
        </p>
      </section>

      <div className="mt-12 rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
        <h2 className="font-display text-2xl font-semibold">See it on your own calls.</h2>
        <p className="mt-3 max-w-[60ch] text-white/75">
          Upload up to 10 recent intake calls and get a dollar-quantified report of the signable
          cases that didn&apos;t sign, with the evidence behind every flag.
        </p>
        <Link href="/audit" className="mt-6 inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
