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
  CTA_PRIMARY,
  INDEPENDENCE_LINE,
  DIFFERENTIATORS,
  CATEGORY_BOUNDARY_LINE,
  WHO_DOES_THE_WORK,
  MONTH_6_INTRO,
  FUNNEL_LINE,
  ACCOUNTABLE_PARTY_LINE,
  GUARANTEE_THRESHOLD,
  COHORT_MIN,
  COHORT_MAX,
  STAT_PI_COST_PER_CASE,
  STAT_ANSWER_RATE,
  STAT_SPEED_TO_LEAD,
  STAT_WEBRIS_DISTRUST,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Intake QA — the independent recovery desk for PI firms",
  description:
    "Everyone you pay to handle your intake grades their own work. Intake QA is the independent desk that checks the whole board against what actually got signed — and finds the signable cases that walked. Run your free Intake Quality Audit.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The independent desk that finds the signable cases that walked.",
    description:
      "The AI receptionist grades its own calls. The agency grades its own leads. We check the whole board against what actually got signed. Free Intake Quality Audit.",
    images: ["/og?title=The+independent+recovery+desk"],
  },
};

const STATS = [
  STAT_PI_COST_PER_CASE,
  STAT_ANSWER_RATE,
  STAT_SPEED_TO_LEAD,
  STAT_WEBRIS_DISTRUST,
];

// The closed loop, in plain steps.
const STEPS = [
  "Send us your recorded intake calls — from every channel: your team, your answering service, your AI receptionist",
  "Transcribed and scored 0–100 on a frozen, calibrated PI rubric",
  "Signable-case detection: qualified callers who didn’t sign are flagged, with the evidence behind each",
  "Reconciled against the fee agreements that actually got signed — so a flag is a real miss, not a guess",
  "Ali reviews the readout and signs off on what you see",
  "A staff-sent, human-reviewed save protocol for the recoverable ones (texting gated on A2P 10DLC)",
  "A monthly missed-revenue statement — what walked, in dollars, trending over time",
];

// Illustrative Monthly Missed-Revenue Statement — every figure is a labeled EXAMPLE.
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
      {/* HERO — independence + closed-loop recovery (no category-king claim) */}
      <Section className="pt-16 pb-12 sm:pt-24">
        <p className="eyebrow">The independent recovery desk for personal injury firms</p>
        <h1 className="mt-3 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl">
          Everyone you pay to handle your intake tells you they&apos;re doing a great job.
        </h1>
        <p className="mt-6 max-w-[66ch] text-lg text-ink-muted">
          The AI receptionist grades its own calls. The agency grades its own leads. Your staff grade
          their own follow-up. Nobody checks the whole board against what actually got signed. Intake
          QA is the independent desk that does — and finds the signable cases that walked.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <CTA />
          <Link href="/how-it-works" className="text-sm font-semibold text-accent hover:text-accent-hover">
            See how the desk works →
          </Link>
        </div>
        <p className="mt-4 text-sm text-faint">
          Free for qualifying Southern California PI firms. A real analyst reviews every call. You
          keep the report whether or not we work together.
        </p>
      </Section>

      {/* STAT BAR */}
      <Section className="pb-16">
        <StatBar stats={STATS} />
      </Section>

      {/* INDEPENDENCE / self-graded homework */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            Every report you get on your intake is self-graded homework.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            {INDEPENDENCE_LINE} We have no stake in the answer — we&apos;re paid the same flat fee no
            matter what we find. That independence is the whole point: a QA function that grades the
            people it reports on isn&apos;t a QA function.
          </p>
        </div>
      </Section>

      {/* FOUR-POINT DIFFERENTIATION */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="mb-7 max-w-[24ch] font-display text-3xl font-semibold text-ink text-balance">
          What the desk does that the tools handling your calls don&apos;t.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="rounded-card border border-hairline bg-surface p-6">
              <p className="font-display text-lg font-semibold text-ink">{d.title}</p>
              <p className="mt-2 text-sm text-ink-muted">{d.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[68ch] rounded-card border border-hairline bg-canvas p-5 text-sm text-ink-muted">
          <b className="text-ink">The honest boundary:</b> {CATEGORY_BOUNDARY_LINE}
        </p>
      </Section>

      {/* CLOSED LOOP / mechanism */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="max-w-[26ch] font-display text-3xl font-semibold text-ink text-balance">
          The closed loop: read every call, reconcile against what signed, recover what walked.
        </h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 bg-surface p-5">
              <span className="tnum text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-ink">{s}</span>
            </li>
          ))}
        </ol>
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
            auditing 500+ PI firms, fewer than 10% could state their true client-acquisition cost with
            confidence.
          </p>
          <p className="mt-3 text-sm text-faint">
            {STAT_WEBRIS_DISTRUST.source}. Cost-per-signed-case benchmark: {STAT_PI_COST_PER_CASE.source}.
            {/* TODO(Ali): plug a firm-specific monthly ad-spend number here only for a multi-market firm profile; otherwise leave as "your ad spend." */}
          </p>
        </div>
      </Section>

      {/* MONTHLY MISSED-REVENUE STATEMENT — flagship deliverable (illustrative) */}
      <Section className="py-14 border-t border-hairline">
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center">
          <div className="max-w-[60ch]">
            <p className="eyebrow">The deliverable</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink text-balance">
              Your monthly missed-revenue statement.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Every month you get one readout that reads like a P&amp;L for your intake: signable
              calls analyzed, cases that signed, cases that walked, estimated missed fee value, the
              saves your team recovered, and the trend line. A written deliverable — not another
              dashboard to log into.
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

      {/* MONTHS 2–12 value strip */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[72ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            What months 2–12 look like.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{MONTH_6_INTRO}</p>
          <Link href="/how-it-works" className="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            See the ongoing work →
          </Link>
        </div>
      </Section>

      {/* AUDIT CTA */}
      <Section className="py-14">
        <div className="rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
          <h2 className="max-w-[24ch] font-display text-3xl font-semibold text-balance">
            Start with a free Intake Quality Audit.
          </h2>
          <p className="mt-4 max-w-[64ch] text-white/75">
            Send up to 10 recent intake calls. A real analyst reviews every one and shows you, in
            dollars, how much signable fee revenue didn&apos;t convert — with a per-call breakdown and
            the evidence behind each flag. You keep the report either way. Then: {FUNNEL_LINE}
          </p>
          <div className="mt-7">
            <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
              {CTA_PRIMARY}
            </Link>
          </div>
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
        <h2 className="mb-3 font-display text-3xl font-semibold text-ink text-balance">
          Where the desk fits alongside what you already run.
        </h2>
        <p className="mb-7 max-w-[68ch] text-sm text-ink-muted">
          Your answering service and AI receptionist do real work — they answer, summarize, and score
          the calls they handle. The desk does the part none of them do: score 100% of calls across
          every channel and reconcile them against who actually signed.
        </p>
        <ComparisonTable />
      </Section>

      {/* GUARANTEE */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            The {GUARANTEE_THRESHOLD} find-it-free guarantee.
          </h2>
          <p className="mt-5 mb-6 text-lg leading-relaxed text-ink-muted">
            If your free audit doesn&apos;t surface at least {GUARANTEE_THRESHOLD} in estimated missed
            signable case value, we won&apos;t pitch you a subscription — and if you start one anyway,
            your first month is free. It&apos;s an estimate of what walked, not a promise of what
            we&apos;ll recover.
          </p>
          <GuaranteeBadge />
        </div>
      </Section>

      {/* WHO DOES THE WORK */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">Who does the work.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{WHO_DOES_THE_WORK}</p>
          <Link href="/founder" className="mt-5 inline-flex text-sm font-semibold text-accent hover:text-accent-hover">
            More about Ali →
          </Link>
        </div>
      </Section>

      {/* COMPLIANCE STRIP */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="mb-7 font-display text-3xl font-semibold text-ink text-balance">
          Built to survive your ethics counsel.
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["A flat fee for a service — never a share of a fee", "We're paid the same flat monthly fee no matter what we find, so it isn't a share of a fee under CA Rule 5.4 and can't be characterized as paying a runner or capper under B&P §§6151–6152 (strengthened by SB 37). The audit is free and the guarantee backs a diagnostic threshold, never a recovery."],
            ["We only help you answer your own callers", "Win-back messages respond to people who already called your firm. Under CA Rule 7.3, a communication in response to a request for information is not solicitation. We never contact strangers on your behalf."],
            ["A human verifies and sends", "The desk drafts; a person at your firm reviews and sends. Nothing goes out on its own (CA Rule 5.3; the CA State Bar's GenAI guidance, updated May 2026; ABA Formal Op. 512's verification duty). Your callers' words are never used to train AI."],
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
            Free audit, free 30-day pilot, locked founding-cohort pricing, and a say in what the desk
            becomes. We&apos;ll even work your first recovered saves alongside you.
          </p>
          <CTA />
        </div>
      </Section>
    </>
  );
}
