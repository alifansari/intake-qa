import type { Metadata } from "next";
import Link from "next/link";
import { StatBar } from "@/components/marketing/StatBar";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { SampleStatement } from "@/components/marketing/SampleStatement";
import { SampleAlert } from "@/components/marketing/SampleAlert";
import { LostCallTape } from "@/components/marketing/LostCallTape";
import { SEAT_LINE } from "@/lib/cohort";
import {
  CTA_PRIMARY,
  SUB_CTA_LINE,
  HOME_DESK_SCORING_LINE,
  HONESTY_STRIP_LINE,
  INDEPENDENCE_LINE,
  WHO_DOES_THE_WORK,
  ACCOUNTABLE_PARTY_LINE,
  STAT_PI_COST_PER_CASE,
  STAT_ANSWER_RATE,
  STAT_LA_HISPANIC,
  STAT_WEBRIS_DISTRUST,
  FOUR_FAILURE_MODES,
  CHAMPION_LINE,
  CATEGORY_BOUNDARY_LINE,
  ADDITIVE_LINE,
  VOLUME_LINE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Intake QA: the independent intake desk for high-volume PI firms",
  description:
    "We read your firm’s intake calls, find the signable cases you already paid for and let walk, put an estimated dollar figure on each, and hand them back to your team to recover. A flat monthly fee, never a share. Sits on top of the CMS you already run. Start with a free Leak Audit.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The signable cases you already paid for, found and handed back to recover.",
    description:
      "The independent desk that checks every intake call against what actually got signed, then hands the walked cases back to your team. Sits on top of your CMS, no migration. Free Leak Audit; you keep the report.",
    images: ["/og?title=The+independent+intake+desk"],
  },
};

// STAT_SPEED_TO_LEAD is intentionally NOT here: site-constants marks it
// "not rendered as a headline number" (speed-to-lead stays a principle, not a stat).
const STATS = [
  STAT_PI_COST_PER_CASE,
  STAT_ANSWER_RATE,
  STAT_LA_HISPANIC,
  STAT_WEBRIS_DISTRUST,
];

// The whole product in three steps — a visitor should get it in one breath.
// (The mechanism detail lives on /how-it-works; this page sells the notebook,
// not the paper mill.)
const THREE_STEPS = [
  {
    title: "Point us at your recorded intake calls",
    body: "Free to start. Any channel and any volume: your team, your answering service, your AI receptionist. It sits on top of the phones and the CMS you already run, so there’s nothing to migrate.",
  },
  {
    title: "We hand back the signable cases that walked, in dollars",
    body: HOME_DESK_SCORING_LINE,
  },
  {
    title: "Every month, on every office, one board",
    body: "The full desk running continuously: every call scored, misses flagged the same day, one monthly statement across all your offices. A flat monthly fee, never a share.",
  },
];

// Two-path CTA: emerald primary (free audit) + apply for the beta.
function CTA({
  children = CTA_PRIMARY,
  href = "/audit",
  onDark = false,
}: {
  children?: string;
  href?: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link
        href={href}
        className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        {children}
      </Link>
      <Link
        href="/apply"
        className={`text-sm font-medium ${onDark ? "text-white/75 hover:text-white" : "text-ink-muted hover:text-ink"}`}
      >
        Apply for the beta →
      </Link>
    </div>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-[1120px] px-5 ${className}`}>{children}</section>;
}

export default function HomePage() {
  return (
    <>
      {/* HERO: what it is, what it costs you not to know, what to do next. */}
      <Section className="pt-16 pb-12 sm:pt-24">
        <p className="eyebrow">The independent intake desk for high-volume personal injury firms</p>
        <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl">
          The signable cases you already paid for and let walk, found and handed back to recover.
        </h1>
        <p className="mt-6 max-w-[66ch] text-lg text-ink-muted">
          You spend real money to make the phones ring across every office. What happens after they
          ring, which signable callers you already paid to acquire didn’t sign and what that
          walked-away fee was worth, is the one number no one in your building can see. We read your
          recorded intake calls, flag the signable callers who walked, put an estimated dollar figure
          on each one, and hand them back to your team to win back. It sits on top of the
          case-management system you already run, so there’s nothing to migrate. A flat monthly fee,
          never a share. Start with a free Leak Audit.
        </p>
        <div className="mt-8">
          <CTA />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/audit/sample" className="text-sm font-medium text-accent hover:text-accent-hover">
              See a sample audit report →
            </Link>
            <Link href="/letter" className="text-sm font-medium text-accent hover:text-accent-hover">
              Read the letter →
            </Link>
          </div>
        </div>
        <p className="mt-4 max-w-[66ch] text-sm text-faint">
          <span className="tnum font-medium text-ink">{SEAT_LINE}</span> {SUB_CTA_LINE}
        </p>
        <p className="mt-2 text-sm text-faint">
          {HONESTY_STRIP_LINE}{" "}
          <Link href="/accuracy" className="font-semibold text-accent hover:text-accent-hover">
            See our accuracy →
          </Link>
        </p>
      </Section>

      {/* HERO ARTIFACT: show the deliverable immediately */}
      <Section className="pb-16">
        <div className="iq-fade-up">
          <SampleStatement />
        </div>
        <p className="mt-3 text-xs text-faint">
          Page one of a sample Missed-Revenue Statement, the monthly document the desk produces.
          Figures are illustrative and names are redacted; yours is built from your calls.
        </p>
      </Section>

      {/* THE TAPE — hear a signable case walk (the most visceral proof) */}
      <Section className="pb-16">
        <LostCallTape />
      </Section>

      {/* HOW IT WORKS — three steps, one breath */}
      <Section className="py-16 border-t border-hairline">
        <h2 className="max-w-[24ch] font-display text-4xl font-semibold leading-[1.1] text-ink text-balance">
          How it works.
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {THREE_STEPS.map((s, i) => (
            <li key={s.title} className="rounded-card border border-hairline bg-surface p-6">
              <span className="tnum font-display text-2xl font-semibold text-accent">
                {i + 1}
              </span>
              <p className="mt-2 font-display text-lg font-semibold text-ink">{s.title}</p>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/how-it-works"
          className="mt-6 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
        >
          The full mechanism, step by step →
        </Link>
      </Section>

      {/* STAT BAR — why this problem is expensive */}
      <Section className="pb-4">
        <StatBar stats={STATS} />
        <p className="mt-3 text-xs text-faint">
          Why these four numbers: what a lead costs, how many firms never connect the call, who’s
          calling, and how few firms know their own number. Sources named under each.
        </p>
        <p className="mt-4 max-w-[68ch] text-sm text-ink">
          {CATEGORY_BOUNDARY_LINE} The number we own is the one after the phone gets answered: the
          signable caller who got through, and still didn’t sign.
        </p>
      </Section>

      {/* ADDITIVE + VOLUME — for the multi-office / intake-department buyer */}
      <Section className="py-16 border-t border-hairline">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Sits on top of your stack</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">
              Nothing to rip out. Nothing to migrate.
            </h2>
            <p className="mt-4 text-ink-muted">{ADDITIVE_LINE}</p>
          </div>
          <div>
            <p className="eyebrow">Built for volume</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">
              Every office on one board.
            </h2>
            <p className="mt-4 text-ink-muted">{VOLUME_LINE}</p>
          </div>
        </div>
      </Section>

      {/* INDEPENDENCE — the one differentiator that matters */}
      <Section className="py-16">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] text-ink text-balance">
            Every report you get on your intake is self-graded homework.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            {INDEPENDENCE_LINE} We have no stake in the answer. We’re paid the same flat fee no
            matter what we find, whether that is nothing or a fortune. That independence is the
            whole point: a QA function that grades the people it reports on isn’t a QA function.
          </p>
        </div>

        {/* Independence comparison table — the show-me object for a math buyer. */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th className="py-3 pr-4 font-normal text-ink-muted"></th>
                <th className="px-3 py-3 text-center font-medium text-ink-muted">AI receptionist</th>
                <th className="px-3 py-3 text-center font-medium text-ink-muted">Your agency</th>
                <th className="px-3 py-3 text-center font-medium text-ink-muted">Your staff</th>
                <th className="px-3 py-3 text-center font-semibold text-ink">Intake QA</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {[
                ["Grades its own work?", true, true, true, false],
                ["Scores calls it didn’t answer?", false, false, false, true],
                ["Reconciles against who actually signed?", false, false, false, true],
                ["Publishes its own accuracy and miss rate?", false, false, false, true],
                ["Paid the same no matter what it finds?", false, false, false, true],
              ].map(([label, a, b, c, iq]) => (
                <tr key={label as string} className="border-b border-hairline">
                  <td className="py-3 pr-4 text-ink-muted">{label}</td>
                  {[a, b, c].map((v, i) => (
                    <td key={i} className="px-3 py-3 text-center text-faint">
                      {v ? "Yes" : "No"}
                    </td>
                  ))}
                  <td className="bg-surface px-3 py-3 text-center font-semibold text-ink">
                    {iq ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 max-w-[70ch] text-sm text-ink-muted">{FOUR_FAILURE_MODES}</p>
        </div>
      </Section>

      {/* WHAT LANDS ON YOUR DESK */}
      <Section className="py-14 border-t border-hairline">
        <p className="eyebrow">What lands on your desk</p>
        <h2 className="mt-2 max-w-[26ch] font-display text-2xl font-semibold text-ink text-balance">
          Four plain deliverables, in the order they matter.
        </h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          <ol className="flex flex-col gap-5">
            {[
              ["Recoverable-Lead Alert", "The lead product. A signable case that didn’t convert today, on one screen, so your team can call back within the hour, while the lead is still warm."],
              ["Missed-Revenue Statement", "A two-page monthly read: the dollar range, the trend, and the saves. Page one is a 90-second boardroom look, signed by the analyst."],
              ["Team Coaching", "The call, not the colleague. One fixable step and the moment it happened, framed to help the team, never to rank people."],
              ["Saved-Case Ledger", "A running record of the cases your team actually recovered, so the value is on paper, not a claim."],
            ].map(([name, body], i) => (
              <li key={name} className="flex gap-4">
                <span className="tnum flex-none font-display text-xl font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{name}</p>
                  <p className="mt-1 text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <SampleAlert />
            <p className="mt-3 text-xs text-faint">
              A sample Recoverable-Lead Alert. Figures illustrative; caller redacted.
            </p>
          </div>
        </div>
      </Section>

      {/* THE CHAMPION — the user is the intake team; make them the hero, not the accused */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[70ch]">
          <p className="eyebrow">For your intake department</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">
            Built to make your intake department look good, not to grade any one coordinator.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{CHAMPION_LINE}</p>
        </div>
      </Section>

      {/* AUDIT CTA */}
      <Section className="py-14">
        <div className="rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
          <h2 className="max-w-[24ch] font-display text-2xl font-semibold text-balance">
            Start with a free Leak Audit.
          </h2>
          <p className="mt-4 max-w-[64ch] text-white/75">
            Send up to 10 recent intake calls. A real analyst reviews every one and shows you, in
            dollars, how much signable fee revenue didn’t convert, with a per-call breakdown and
            the evidence behind each flag. You keep the report either way.
          </p>
          <div className="mt-7">
            <CTA onDark />
          </div>
        </div>
      </Section>

      {/* ROI */}
      <Section className="py-14">
        <h2 className="font-display text-2xl font-semibold text-ink text-balance">
          Do the math on your own numbers.
        </h2>
        <p className="mt-3 mb-7 max-w-[60ch] text-ink-muted">
          Conservative and optimistic estimates, side by side. No email required to run it.
        </p>
        <ROICalculator />
      </Section>

      {/* THE BETA — who does the work + the ask, one section */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[70ch]">
          <p className="eyebrow">The founding beta</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">
            Get your firm on the desk. Free during the beta. Flat monthly fee at launch, never a share.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            {WHO_DOES_THE_WORK}
          </p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2">
            {[
              ["What you get", "The full desk on your own calls: every call scored, misses flagged the same day, the monthly statement, free for the whole beta."],
              ["What it takes", "A mutual NDA, connecting or uploading your recorded intake calls, and candid feedback on what’s useful. Your staff make every callback; we never contact your callers."],
            ].map(([h, b]) => (
              <div key={h} className="bg-surface p-5">
                <p className="font-display text-base font-semibold text-ink">{h}</p>
                <p className="mt-1.5 text-sm text-ink-muted">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/apply"
              className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Apply for a founding seat
            </Link>
            <Link href="/founder" className="text-sm font-medium text-ink-muted hover:text-ink">
              Who does the work →
            </Link>
          </div>
          <div className="mt-6">
            <PilotCohortBanner />
          </div>
        </div>
      </Section>

      {/* COMPLIANCE — one strip, one link */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[72ch]">
          <h2 className="font-display text-2xl font-semibold text-ink text-balance">
            Built to survive your ethics counsel.
          </h2>
          <ul className="mt-5 flex flex-col gap-2 text-lg text-ink-muted">
            <li>· A flat fee for a service, never a share of a fee, never per case.</li>
            <li>· We only help you answer people who already called your firm.</li>
            <li>· The desk drafts; a human at your firm reviews and sends. Always.</li>
          </ul>
          <p className="mt-4 text-sm text-ink-muted">
            {ACCOUNTABLE_PARTY_LINE}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/compliance" className="text-sm font-semibold text-accent hover:text-accent-hover">
              Read the full compliance case →
            </Link>
            <Link href="/security" className="text-sm font-semibold text-accent hover:text-accent-hover">
              How your data is handled →
            </Link>
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-20 border-t border-hairline">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] text-ink text-balance">
            A free Leak Audit. A founding seat on the desk.
          </h2>
          <p className="mt-5 mb-7 text-lg leading-relaxed text-ink-muted">
            A signed report you keep, a say in what the desk becomes, and no obligation to continue.
            {" "}
            <span className="tnum font-medium text-ink">{SEAT_LINE}</span>
          </p>
          <CTA />
        </div>
      </Section>
    </>
  );
}
