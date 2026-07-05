import type { Metadata } from "next";
import Link from "next/link";
import { StatBar } from "@/components/marketing/StatBar";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { GuaranteeBadge } from "@/components/marketing/GuaranteeBadge";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { FounderNote } from "@/components/marketing/FounderNote";

export const metadata: Metadata = {
  title: "Intake QA — Recover the signable cases your intake let walk",
  description:
    "Score 100% of your intake calls against a calibrated PI rubric, see the signable cases that walked, and win them back. Free audit for Southern California PI firms.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "You already paid for these cases. Go get them back.",
    description:
      "Score every intake call, see the signable cases that walked, and win them back. Free Intake Quality Audit.",
    images: ["/og?title=You+already+paid+for+these+cases"],
  },
};

const STATS = [
  { value: "48%", label: "of law firms are unreachable by phone", source: "Clio 2024 Legal Trends Report (Lux secret-shopper study, 500 firms)" },
  { value: "21×", label: "more likely a lead qualifies when you respond in 5 min vs 30", source: "MIT Sloan / InsideSales Lead Response Study, Dr. James Oldroyd, 2007" },
  { value: "24% → 82%", label: "sign rate from lowest to highest intake-score band", source: "Intake QA calibrated data" },
  { value: "$100–$500+", label: "what a PI firm pays per Google click to make the phone ring", source: "iLawyer Marketing, 2025 legal keyword analysis" },
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
  "You’re billed a flat fee per case — never a slice of the fee",
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
          You already paid for these cases. Go get them back.
        </h1>
        <p className="mt-6 max-w-[62ch] text-lg text-ink-muted">
          Intake QA scores every intake call, flags the signable cases your team let slip, and
          drafts a compliant lead follow-up. Monetize your marketing dollars and sign more
          cases with Intake QA.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <CTA />
          <Link href="/how-it-works" className="text-sm font-semibold text-accent hover:text-accent-hover">
            See how it works →
          </Link>
        </div>
        <p className="mt-4 text-sm text-faint">
          Upload 10 recent calls. Get a dollar figure in minutes. No texts sent, ever, without your
          approval.
        </p>
      </Section>

      {/* STAT BAR */}
      <Section className="pb-16">
        <StatBar stats={STATS} />
      </Section>

      {/* PROBLEM */}
      <Section className="py-14">
        <div className="max-w-[68ch]">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance">
            The phone rang. Nobody signed. You still paid for it.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            You spend a fortune to make an injured person dial your office. Then the call goes to
            voicemail, or the intake team misses the moment, or the follow-up never happens.
            Clio&apos;s secret shoppers reached a live person at only 40% of firms. The caller dials
            the next name on Google, and once they&apos;ve talked to another firm your odds of
            signing them fall off a cliff. You&apos;re not short on leads. You&apos;re losing good
            cases after the phone rings — and those are the ones worth going back for.
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
          recover cases — no texting required.
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
            fee revenue walked — with a per-call breakdown, the evidence behind each flag, and a
            watermarked sample of the win-back message we&apos;d send. You get a shareable report.
            You decide what to do with it.
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
            Most AI vendors show you a demo and hide the error rate. We publish ours:{" "}
            <span className="tnum font-semibold text-ink">77%</span> flag precision,{" "}
            <span className="tnum font-semibold text-ink">68%</span> recall, and a full list of the
            cases our model missed and the ones it wrongly flagged — with dollar amounts. If
            we&apos;re going to touch your revenue, you should see exactly where we&apos;re right and
            where we&apos;re not.
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
            Filevine&apos;s Lead Docket score and route leads at the moment of capture. Intake QA is
            post-call recovery: it scores 100% of your calls against a calibrated PI rubric, flags
            the signable ones that didn&apos;t convert, and runs the callback/win-back workflow with
            proof of what came back — priced flat per recovered case, never a share of the fee.
          </p>
          <p className="max-w-[60ch] rounded-card border border-hairline bg-surface p-5 text-sm leading-relaxed text-ink-muted">
            Why not have your best person spot-check calls? Spot-checking 10% of calls means about
            90% of the fumbles are never seen. Scoring 100% misses none — and your reviewer&apos;s
            time goes to the flagged calls worth a callback.
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
            The find-it-free guarantee: if your Intake Quality Audit doesn&apos;t identify at least
            $25,000 in recoverable signable fees, the audit costs you nothing and there&apos;s no
            pitch. We only want firms we can actually make money for.
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
            ["Flat per-case fee", "Structurally outside Rule 5.4 — we're paid the same regardless of the recovery."],
            ["Responds to inbound leads", "Not Rule 7.3 solicitation — we only help you answer people who called you."],
            ["Audio deleted at transcription", "§632 all-party consent posture; 72-hour transcript purge; zero-retention AI."],
          ].map(([t, d]) => (
            <Link key={t} href="/compliance" className="rounded-card border border-hairline bg-surface p-6 hover:border-accent">
              <p className="font-display text-lg font-semibold text-ink">{t}</p>
              <p className="mt-2 text-sm text-ink-muted">{d}</p>
              <span className="mt-3 inline-flex text-sm font-semibold text-accent">Read the compliance case →</span>
            </Link>
          ))}
        </div>
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
            Founding cohort: 5 Southern California PI firms.
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
