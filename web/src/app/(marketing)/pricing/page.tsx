import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import {
  BETA_FREE_LINE,
  BETA_WHO_LINE,
  BETA_CONDITIONS,
  BETA_GROUND_RULES,
  BETA_PRICING_LINE,
  BETA_PRICING_HONESTY,
  PRICING_COMPLIANCE_ARGUMENT,
  STAKE_LINE,
  CTA_PRIMARY,
  FOUNDER_EMAIL,
} from "@/lib/site-constants";

// BETA WINDOW: no dollar figures in public copy. The underlying pricing objects
// (PRICING_TIERS, CHARTER_*, billing plans) are untouched — this page just stops
// rendering them. Checkout resumes from those objects when the beta ends.

export const metadata: Metadata = {
  title: "Pricing: free during the beta, flat monthly at launch | Intake QA",
  description:
    "Intake QA is free during the beta for a small founding cohort of California PI firms: sign an NDA, share a sample of your recorded intake calls, give structured feedback. At launch the fee is flat monthly, never per case; founding testers lock in preferred pricing.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Pricing</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Free during the beta.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">{BETA_WHO_LINE}</p>
      <p className="mt-5 max-w-[60ch] font-display text-2xl font-semibold text-ink">
        {BETA_FREE_LINE}
      </p>

      {/* The beta conditions — what we ask of a tester, spelled out. */}
      <section className="mt-12 rounded-card border border-accent bg-surface p-7 shadow-card sm:p-9">
        <p className="eyebrow">The conditions</p>
        <h2 className="mt-1 font-display text-3xl font-semibold text-ink text-balance">
          The beta asks three things of your firm.
        </h2>
        <ol className="mt-6 max-w-[72ch] list-decimal space-y-4 pl-5 text-ink-muted">
          {BETA_CONDITIONS.map((c) => (
            <li key={c} className="pl-1">
              {c}
            </li>
          ))}
        </ol>
        <p className="mt-6 border-t border-hairline pt-4 max-w-[72ch] text-sm text-ink-muted">
          {BETA_GROUND_RULES}
        </p>
        <div className="mt-6 max-w-md">
          <Link
            href="/audit"
            className="inline-flex w-full justify-center rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {CTA_PRIMARY}
          </Link>
          <p className="mt-2 text-sm text-faint">
            The free Leak Audit is step one of the beta. {STAKE_LINE}
          </p>
        </div>
      </section>

      {/* What it costs after the beta — a real price, deferred honestly. */}
      <section className="mt-8 border-t border-hairline pt-8">
        <p className="eyebrow">After the beta</p>
        <h2 className="mt-2 max-w-[34ch] font-display text-2xl font-semibold text-ink text-balance">
          There is a price. Here is how it works, and when you&apos;ll hear the number.
        </h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">{BETA_PRICING_LINE}</p>
        <p className="mt-3 max-w-[72ch] text-sm text-ink-muted">
          {BETA_PRICING_HONESTY}{" "}
          <a
            href={`mailto:${FOUNDER_EMAIL}`}
            className="font-semibold text-accent hover:text-accent-hover"
          >
            {FOUNDER_EMAIL}
          </a>
        </p>
      </section>

      {/* The free Leak Audit — value before any pricing conversation. */}
      <section className="mt-8 rounded-card border border-hairline bg-canvas p-7">
        <p className="eyebrow">Start here, free</p>
        <h2 className="mt-2 max-w-[30ch] font-display text-2xl font-semibold text-ink text-balance">
          Send us 10 calls. We find what walked. Free.
        </h2>
        <p className="mt-3 max-w-[72ch] text-sm text-ink-muted">
          Send up to 10 of your own recorded intake calls. A real analyst scores them and walks you
          through the signable cases that slipped, live and free, and you keep the written report
          whether or not we ever work together. No card, no obligation. Any pricing conversation
          happens after you&apos;ve seen what the audit found in your own calls.
        </p>
        <div className="mt-5">
          <Link
            href="/audit"
            className="inline-flex rounded-pill border border-hairline bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
          >
            {CTA_PRIMARY}
          </Link>
        </div>
        <div className="mt-6">
          <PilotCohortBanner />
        </div>
      </section>

      {/* The why: the fee model, in lawyer-grade language (no dollar figures). */}
      <section className="mt-10 rounded-card border border-hairline bg-canvas p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Why the fee is flat, and never tied to a case
        </h2>
        <p className="mt-3 max-w-[72ch] text-ink-muted">{PRICING_COMPLIANCE_ARGUMENT}</p>
        <p className="mt-3 text-sm text-faint">
          The full California analysis, with citations, is on the{" "}
          <Link href="/compliance" className="font-semibold text-accent hover:text-accent-hover">
            compliance page
          </Link>
          . Your counsel makes the final call.
        </p>
      </section>
    </div>
  );
}
