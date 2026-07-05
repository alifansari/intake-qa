import type { Metadata } from "next";
import Link from "next/link";
import { StatBar } from "@/components/marketing/StatBar";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { GuaranteeBadge } from "@/components/marketing/GuaranteeBadge";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { FounderNote } from "@/components/marketing/FounderNote";
import {
  STAT_ANSWERED_LIVE,
  STAT_UNREACHABLE,
  STAT_SPEED_TO_LEAD,
  STAT_PI_CLICK_COST,
  ACCOUNTABLE_PARTY_LINE,
  COHORT_MIN,
  COHORT_MAX,
  GUARANTEE_THRESHOLD,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Intake QA — The cases you already paid to get, and didn't sign",
  description:
    "Intake QA scores every recorded intake call on a calibrated PI rubric, shows you the signable callers who didn't convert, and drafts a compliant win-back your team approves. Free audit for Southern California PI firms.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The cases you already paid to get — and didn't sign.",
    description:
      "Score every intake call, see the signable cases that didn't convert, and win them back. Free Intake Quality Audit.",
    images: ["/og?title=The+cases+you+already+paid+to+get"],
  },
};

const STATS = [
  STAT_ANSWERED_LIVE,
  STAT_UNREACHABLE,
  STAT_SPEED_TO_LEAD,
  STAT_PI_CLICK_COST,
];

const STEPS = [
  "Call arrives",
  "Transcribed",
  "Scored 0–100 on a frozen, calibrated rubric",
  "Signable cases that didn’t convert are flagged (score ≥60, not converted, inside 72 hrs)",
  "Compliant win-back SMS drafted (≤320 chars, “Reply STOP”, names your firm)",
  "A human on your team approves every send",
  "7 compliance gates enforced in order",
  "Outcome tracked",
  "You pay a flat monthly subscription — never per case, per client, or per recovered dollar",
];

function CTA({ children = "Run your free Intake Quality Audit", href = "/audit" }: { children?: string; href?: string }) {
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
      {/* HERO */}
      <Section className="pt-16 pb-14 sm:pt-24">
        <p className="eyebrow">Revenue recovery for personal injury firms</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl">
          The cases you already paid to get, and didn&apos;t sign.
        </h1>
        <p className="mt-6 max-w-[64ch] text-lg text-ink-muted">
          Intake QA scores every recorded intake call on a calibrated PI rubric, shows you the
          signable PNCs that didn&apos;t convert, and drafts a compliant win-back your team approves
          before anything sends. You pay a flat monthly subscription — never a share of a fee, never
          per signed case.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <CTA />
          <Link href="/how-it-works" className="text-sm font-semibold text-accent hover:text-accent-hover">
            See how it works →
          </Link>
        </div>
        <p className="mt-4 text-sm text-faint">
          Upload up to 10 recorded calls. Get a dollar figure in minutes. Nothing is ever texted
          without your written approval.
        </p>
      </Section>

      {/* STAT BAR */}
      <Section className="pb-16">
        <StatBar stats={STATS} />
      </Section>

      {/* PROBLEM — population-level, never an accusation about this firm */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            Every firm has calls that don&apos;t turn into cases.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            You spend real money to make an injured person dial your office. Some of those callers
            don&apos;t sign on the first call, and that&apos;s true at every firm. A call lands during
            a lunch rush. A voicemail doesn&apos;t get returned before the caller reaches the next
            name on Google. Clio&apos;s secret shoppers found 48% of firms were essentially
            unreachable by phone. When the phones spike after a campaign, even a great intake team
            can&apos;t catch every callback — that&apos;s a staffing-and-timing problem, not a people
            problem. The signable cases that slip through are the ones worth going back for.
          </p>
        </div>
      </Section>

      {/* MECHANISM */}
      <Section className="py-14 border-t border-hairline">
        <h2 className="max-w-[24ch] font-display text-3xl font-semibold text-ink text-balance">
          We read every call, catch the signable ones that didn&apos;t convert, and hand you the
          follow-up.
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
          Texting goes live the moment your A2P 10DLC registration clears — and nothing sends
          without your approval even then. Until then, the audit and callback workflow already
          recover cases, no texting required.
        </p>
      </Section>

      {/* AUDIT CTA */}
      <Section className="py-14">
        <div className="rounded-card border border-hairline bg-navy px-6 py-10 text-white sm:px-12">
          <h2 className="max-w-[20ch] font-display text-3xl font-semibold text-balance">
            Start with the free Intake Quality Audit.
          </h2>
          <p className="mt-4 max-w-[64ch] text-white/75">
            Upload up to 10 recent intake calls. We&apos;ll show you, in dollars, how much signable
            fee revenue didn&apos;t convert — with a per-call breakdown, the evidence behind each
            flag, and a watermarked sample of the win-back message we&apos;d send. You get a shareable
            report. You decide what to do with it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
              Run your free Intake Quality Audit
            </Link>
            <Link href="/audit/sample" className="text-sm font-semibold text-white/85 underline hover:text-white">
              See a sample report →
            </Link>
          </div>
        </div>
      </Section>

      {/* HONESTY TEASER */}
      <Section className="py-14 border-t border-hairline">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            We publish our own mistakes.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Most vendors show you a demo and hide the error rate. We&apos;ll show you ours. Every
            call is transcribed, then scored 0–100 against a fixed rubric; a case is flagged when it
            scores above the threshold, wasn&apos;t converted, and is still inside the callback
            window. On the calibration page we describe that method and publish the model&apos;s
            failure modes — the calls it missed and the ones it wrongly flagged.
            {/* TODO(Ali): publish precision/recall only with the test-corpus label (see site-constants TEST_CORPUS_*). No naked percentage. */}
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
          Post-call recovery — not another answering service or CRM.
        </h2>
        <ComparisonTable />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <p className="max-w-[60ch] rounded-card border border-hairline bg-surface p-5 text-sm leading-relaxed text-ink-muted">
            This isn&apos;t call tracking and it isn&apos;t a CRM feature. Tools like CallRail and
            Filevine&apos;s Lead Docket score and route callers at the moment of capture. Intake QA is
            post-call recovery: it scores 100% of your calls against a calibrated PI rubric, flags
            the signable ones that didn&apos;t convert, and runs the callback/win-back workflow with
            proof of what came back — on a flat monthly subscription, never a share of the fee, never
            per signed case.
          </p>
          <p className="max-w-[60ch] rounded-card border border-hairline bg-surface p-5 text-sm leading-relaxed text-ink-muted">
            Why not have your best person spot-check calls? Reviewing 10% of calls means about 90% of
            the misses are never seen — and spot-checking singles out whoever gets sampled. Scoring
            100% is fairer and misses none, and your reviewer&apos;s time goes to the flagged calls
            worth a callback.
          </p>
        </div>
      </Section>

      {/* GUARANTEE */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            If we don&apos;t find it, you don&apos;t pay.
          </h2>
          <p className="mt-5 mb-6 text-lg leading-relaxed text-ink-muted">
            The find-it-free guarantee: if your Intake Quality Audit doesn&apos;t identify at least{" "}
            {GUARANTEE_THRESHOLD} in recoverable signable fees, the audit costs you nothing and
            there&apos;s no pitch. We only want firms we can actually make money for.
            {/* TODO(Ali): confirm the guarantee threshold and terms. */}
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
            ["Flat monthly fee — never a share of a fee, never per signed case", "Our compensation doesn't change whether you sign zero cases or fifty, so it can't be characterized as paying an agent to procure or recover business under Cal. B&P §§6151–6152 — now backed by SB 37's private right of action. You pay for analysis, like your CRM or answering service."],
            ["We only help you answer your own callers", "Responding to someone who already called your firm is treated differently from soliciting a stranger under California Rule 7.3. We never contact strangers on your behalf."],
            ["Your staff approves every send", "The AI drafts; a person at your firm sends. Nothing goes out on its own (Cal. Rule 5.3; CA State Bar GenAI guidance). Your callers' words stay confidential prospective-client information (Rule 1.18) and are never used to train AI."],
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

      {/* PILOT COHORT + FINAL CTA */}
      <Section className="py-16 border-t border-hairline">
        <PilotCohortBanner />
        <div className="mt-10 max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            A founding cohort of {COHORT_MIN}–{COHORT_MAX} Southern California PI firms.
          </h2>
          <p className="mt-5 mb-7 text-lg leading-relaxed text-ink-muted">
            Free 30-day pilot. Find-it-free guarantee. Cancel anytime. We&apos;ll even work your first
            recovered callbacks alongside you.
          </p>
          <CTA />
        </div>
      </Section>
    </>
  );
}
