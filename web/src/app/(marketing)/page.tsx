import type { Metadata } from "next";
import Link from "next/link";
import { StatBar } from "@/components/marketing/StatBar";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { GuaranteeBadge } from "@/components/marketing/GuaranteeBadge";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { FounderNote } from "@/components/marketing/FounderNote";
import { StateOfIntakeSignup } from "@/components/marketing/StateOfIntakeSignup";
import {
  CATEGORY_NAME,
  CATEGORY_DEFINITION,
  COUNTER_POSITION_LINE,
  CTA_PRIMARY,
  GUARANTEE_BADGE_LINE,
  ACCOUNTABLE_PARTY_LINE,
  COHORT_MIN,
  COHORT_MAX,
  STAT_PI_COST_PER_CASE,
  STAT_UNREACHABLE,
  STAT_SPEED_TO_LEAD,
  STAT_WEBRIS_DISTRUST,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Intake QA — Case Acquisition Intelligence for personal injury firms",
  description:
    "Case Acquisition Intelligence reads 100% of your intake calls, detects the signable cases that didn't sign, and reports what your intake produced — in dollars. Book your $500 Leak Audit.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "You already paid for these cases. We prove which ones walked.",
    description:
      "Case Acquisition Intelligence for PI firms: detect the signable cases that didn't sign, in dollars. Book your $500 Leak Audit.",
    images: ["/og?title=Case+Acquisition+Intelligence"],
  },
};

const STATS = [
  STAT_PI_COST_PER_CASE,
  STAT_UNREACHABLE,
  STAT_SPEED_TO_LEAD,
  STAT_WEBRIS_DISTRUST,
];

// The intake pipeline, in the reframed vocabulary (signable-case detection,
// same-day save protocol, missed-revenue statement).
const STEPS = [
  "Call arrives",
  "Transcribed",
  "Scored 0–100 on a frozen, calibrated rubric",
  "Signable-case detection: qualified callers who didn’t sign are flagged (score ≥60, not converted, inside 72 hrs)",
  "Same-day save protocol drafted — a follow-up your staff reviews and sends (never automated)",
  "A human on your team approves every send",
  "7 compliance gates enforced in order",
  "Your missed-revenue statement updates — signable calls, cases that walked, dollars at stake",
  "Flat monthly subscription — never per case, per client, or per recovered dollar",
];

// Illustrative Monthly Missed-Revenue Statement — every figure is a clearly
// labeled EXAMPLE, not a claim about any firm.
const STATEMENT_ROWS: [string, string][] = [
  ["Signable calls analyzed", "128"],
  ["Cases that signed", "31"],
  ["Signable cases that walked", "12"],
  ["Estimated missed fee value", "$96,000"],
  ["Saves your team recovered", "4"],
  ["Recovered fee value", "$32,000"],
];

function CTA({ children = CTA_PRIMARY, href = "/audit" }: { children?: string; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
    >
      {children}
    </Link>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-[1120px] px-5 ${className}`}>{children}</section>;
}

export default function HomePage() {
  return (
    <>
      {/* HERO — category in the eyebrow, definition-grounded subhead */}
      <Section className="pt-16 pb-12 sm:pt-24">
        <p className="eyebrow">{CATEGORY_NAME} for personal injury firms</p>
        <h1 className="mt-3 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl">
          You already paid for these cases. We prove which ones walked — and hand your team the play
          to get them back.
        </h1>
        <p className="mt-6 max-w-[66ch] text-lg text-ink-muted">
          {CATEGORY_DEFINITION} Not an answering service. Not a CRM. The intelligence layer on the
          cases you already paid to generate.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <CTA />
          <Link href="/what-is-case-acquisition-intelligence" className="text-sm font-semibold text-accent hover:text-accent-hover">
            What is Case Acquisition Intelligence? →
          </Link>
        </div>
        {/* $50k guarantee badge, hero-adjacent (one line, conditions stated) */}
        <p className="mt-5 max-w-[70ch] rounded-card border border-gold/40 bg-gold-tint/60 px-4 py-3 text-sm text-ink">
          <span className="font-semibold">{GUARANTEE_BADGE_LINE}</span>{" "}
          <Link href="/audit" className="font-semibold text-accent hover:text-accent-hover">
            See how we calculate it →
          </Link>
        </p>
        <p className="mt-4 text-sm text-faint">
          Upload up to 10 recorded calls. Get a dollar figure in days. Nothing is ever texted without
          your written approval.
        </p>
      </Section>

      {/* STAT BAR */}
      <Section className="pb-16">
        <StatBar stats={STATS} />
      </Section>

      {/* PROBLEM / ENEMY — population-level, links to the manifesto */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            The enemy isn&apos;t your intake team. It&apos;s the silence after the call.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Every injured caller who dials your firm cost money to get there — sometimes hundreds of
            dollars a click. Then a call lands during a lunch rush, a voicemail doesn&apos;t get
            returned, or a &ldquo;let me talk to my spouse&rdquo; never gets a follow-up. Firms
            obsess over generating the next lead and stay blind to the ones they already paid for and
            let walk. Every firm has these calls — the question is whether you can see them.
          </p>
          <Link href="/manifesto" className="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            Read the manifesto →
          </Link>
        </div>
      </Section>

      {/* CATEGORY DEFINITION mini-block */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[72ch]">
          <p className="eyebrow">The category</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink text-balance">
            A measurement layer on case acquisition.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            {CATEGORY_DEFINITION} Where speed-to-lead tools optimize answering the next call, and
            litigation-AI tools work the case after it&apos;s signed, {CATEGORY_NAME} owns the gap in
            between — the moment a paid-for case is won or lost at intake.
          </p>
          <Link href="/what-is-case-acquisition-intelligence" className="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            The full definition →
          </Link>
        </div>
      </Section>

      {/* MECHANISM */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="max-w-[26ch] font-display text-3xl font-semibold text-ink text-balance">
          Read every call. Detect the signable ones that didn&apos;t convert. Put a dollar figure on
          what walked.
        </h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 bg-surface p-5">
              <span className="tnum text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-ink">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-[68ch] text-sm text-ink-muted">
          The same-day save protocol is staff-sent and human-reviewed. Texting activates only after
          our A2P 10DLC registration is approved — until then, the audit and callback workflow
          already surface the cases worth going back for.
        </p>
      </Section>

      {/* AGENCY ACCOUNTABILITY */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[72ch]">
          <p className="eyebrow">Marketing-agency accountability</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink text-balance">
            Finally know whether your ad spend produces signable callers or tire-kickers.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Your agency reports clicks, calls, and cost-per-lead. We report what happened{" "}
            <em>after</em> the phone rang: how many callers were actually signable, how many signed,
            and what the misses were worth. One legal-marketing agency (WEBRIS) reports that after
            auditing 500+ PI firms, fewer than 10% could state their true client-acquisition cost
            with confidence. {CATEGORY_NAME} closes that gap.
          </p>
          <p className="mt-3 text-sm text-faint">
            {STAT_WEBRIS_DISTRUST.source}. Cost-per-signed-case benchmark: {STAT_PI_COST_PER_CASE.source}.
            {/* TODO(Ali): plug the firm-specific monthly ad-spend number here for the "$40K/month" framing (only realistic for a multi-market firm). */}
          </p>
        </div>
      </Section>

      {/* MONTHLY MISSED-REVENUE STATEMENT — the flagship artifact (illustrative mock) */}
      <Section className="py-14 border-t border-hairline">
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center">
          <div className="max-w-[60ch]">
            <p className="eyebrow">The deliverable</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink text-balance">
              Your monthly missed-revenue statement.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Every month you get one artifact that reads like a P&amp;L for your intake: signable
              calls analyzed, cases that signed, cases that walked, estimated missed fee value, the
              saves your team recovered, and the trend line. This is what lands on your desk — not
              another dashboard to log into.
            </p>
          </div>
          <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
            <div className="flex items-baseline justify-between border-b border-hairline pb-3">
              <p className="font-display text-sm font-semibold text-ink">Missed-Revenue Statement</p>
              <p className="text-xs text-faint">Example · illustrative figures</p>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              {STATEMENT_ROWS.map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="tnum font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-faint">
              Sample only. Your statement is built from your own recordings; figures are estimates,
              not promises.
            </p>
          </div>
        </div>
      </Section>

      {/* AUDIT CTA */}
      <Section className="py-14">
        <div className="rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
          <h2 className="max-w-[22ch] font-display text-3xl font-semibold text-balance">
            Start with the $500 Leak Audit.
          </h2>
          <p className="mt-4 max-w-[64ch] text-white/75">
            Upload up to 10 recent intake calls. We&apos;ll show you, in dollars, how much signable
            fee revenue didn&apos;t convert — with a per-call breakdown, the evidence behind each
            flag, and watermarked sample save-protocol messages. The $500 is credited in full to your
            first subscription invoice. You keep the report either way.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
              {CTA_PRIMARY}
            </Link>
            <Link href="/audit/sample" className="text-sm font-semibold text-white/85 underline hover:text-white">
              See a sample report →
            </Link>
          </div>
        </div>
      </Section>

      {/* COUNTER-POSITIONING */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[72ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            We don&apos;t replace your answering service. We tell you what it produced.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{COUNTER_POSITION_LINE}</p>
        </div>
      </Section>

      {/* HONESTY TEASER */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            We publish our own mistakes.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Most vendors show you a demo and hide the error rate. We&apos;ll show you ours. Every call
            is transcribed, then scored 0–100 against a fixed rubric; a case is flagged when it scores
            above the threshold, wasn&apos;t converted, and is still inside the callback window. On
            the calibration page we describe that method, publish the model&apos;s failure modes, and
            show exactly how we estimate missed signable-case value for the guarantee.
            {/* TODO(Ali): publish precision/recall only with the test-corpus label (see site-constants TEST_CORPUS_*). */}
          </p>
          <Link href="/honesty" className="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            See the calibration data →
          </Link>
        </div>
      </Section>

      {/* ROI */}
      <Section className="py-14">
        <h2 className="font-display text-3xl font-semibold text-ink text-balance">
          Do the math on your own numbers.
        </h2>
        <p className="mt-3 mb-7 max-w-[60ch] text-ink-muted">
          Conservative and optimistic estimates, side by side. No email required to run it.
        </p>
        <ROICalculator />
      </Section>

      {/* COMPARISON */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="mb-7 font-display text-3xl font-semibold text-ink text-balance">
          Case Acquisition Intelligence — not another answering service or CRM.
        </h2>
        <ComparisonTable />
      </Section>

      {/* GUARANTEE */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            The $50,000 Find-It Guarantee.
          </h2>
          <p className="mt-5 mb-6 text-lg leading-relaxed text-ink-muted">
            If your Leak Audit doesn&apos;t identify at least $50,000 in estimated missed
            signable-case value in your firm&apos;s own recent intake calls, we refund your $500 audit
            fee in full. The guarantee is on what the audit finds in your calls — not on any revenue
            you recover.
          </p>
          <GuaranteeBadge />
        </div>
      </Section>

      {/* COMPLIANCE STRIP */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="mb-7 font-display text-3xl font-semibold text-ink text-balance">
          Built to survive your ethics counsel.
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Flat monthly fee — never a share of a fee, never per signed case", "Our compensation doesn't change whether you sign zero cases or fifty, so it can't be characterized as paying an agent to procure or recover business under Cal. B&P §§6151–6152 — now backed by SB 37's private right of action. The audit fee and guarantee attach to a deliverable, never to a recovery."],
            ["We only help you answer your own callers", "Responding to someone who already called your firm is treated differently from soliciting a stranger under California Rule 7.3. We never contact strangers on your behalf."],
            ["Your staff approves every send", "The same-day save protocol is drafted by AI and sent by a person at your firm. Nothing goes out on its own (Cal. Rule 5.3; CA State Bar GenAI guidance). Your callers' words stay confidential prospective-client information (Rule 1.18) and are never used to train AI."],
          ].map(([t, d]) => (
            <Link key={t} href="/compliance" className="rounded-card border border-hairline bg-surface p-6 hover:border-accent">
              <p className="font-display text-lg font-semibold text-ink">{t}</p>
              <p className="mt-2 text-sm text-ink-muted">{d}</p>
              <span className="mt-3 inline-flex text-sm font-semibold text-accent">Read the compliance case →</span>
            </Link>
          ))}
        </div>
        <p className="mt-6 max-w-[80ch] text-sm text-ink-muted">
          {ACCOUNTABLE_PARTY_LINE}{" "}
          <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">
            See how your data is handled →
          </Link>
        </p>
      </Section>

      {/* FOUNDER */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <FounderNote />
          <Link href="/founder" className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            Why I built Intake QA →
          </Link>
        </div>
      </Section>

      {/* STATE OF PI INTAKE */}
      <Section className="py-14 border-t border-hairline">
        <StateOfIntakeSignup />
      </Section>

      {/* PILOT COHORT + FINAL CTA */}
      <Section className="py-16 border-t border-hairline">
        <PilotCohortBanner />
        <div className="mt-10 max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            A founding cohort of {COHORT_MIN}–{COHORT_MAX} Southern California PI firms.
          </h2>
          <p className="mt-5 mb-7 text-lg leading-relaxed text-ink-muted">
            Free 30-day pilot after your audit, locked founding-cohort pricing, and a say in what the
            category becomes. We&apos;ll even work your first recovered saves alongside you.
          </p>
          <CTA />
        </div>
      </Section>
    </>
  );
}
