import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import {
  PRICING_TIERS,
  PRICING_COMPLIANCE_ARGUMENT,
  PRICING_ANCHOR_LINE,
  STAKE_LINE,
  CTA_PRIMARY,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Pricing: a free founding pilot, then flat monthly | Intake QA",
  description:
    "The founding pilot is free: five Northern California PI firms, a 30-day Leak Audit, no fee. If you continue, a flat monthly fee tiered by call volume, never per case and never a share of any recovery.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Pricing</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        A flat monthly fee to analyze your calls. Nothing tied to a recovery.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">
        No per-case fee. No percentage of any recovery. No charge tied to whether you sign a
        client. You pay a flat monthly subscription to have your intake calls analyzed, the same
        way you pay your answering service or your CRM, whether or not any given call becomes a
        client.
      </p>
      <p className="mt-5 max-w-[60ch] font-display text-2xl font-semibold text-ink">
        One flat monthly fee. Never per case, never a percentage. That&apos;s the whole point.
      </p>

      {/* STAGE 1 — the free founding pilot */}
      <section className="mt-12 border-t border-hairline pt-8">
        <p className="eyebrow">Stage 1 · The founding pilot (free)</p>
        <h2 className="mt-2 max-w-[28ch] font-display text-3xl font-semibold text-ink text-balance">
          Five founding firms. Thirty days. No fee.
        </h2>
        <p className="mt-4 max-w-[72ch] text-ink-muted">
          A free 30-day Leak Audit of your real recorded intake calls, everything included, ending in
          a signed Missed-Revenue Statement. This is not a trial with features withheld. It is the
          full engagement, free, because the first five firms are how the number earns its
          reputation. {STAKE_LINE}
        </p>
        <div className="mt-6">
          <PilotCohortBanner />
        </div>
      </section>

      {/* STAGE 2 — after the pilot, flat monthly */}
      <section className="mt-12 border-t border-hairline pt-8">
        <p className="eyebrow">Stage 2 · After the pilot (flat monthly, optional)</p>
        <h2 className="mt-2 max-w-[30ch] font-display text-3xl font-semibold text-ink text-balance">
          If the Statement earns its keep, this is what continuing costs.
        </h2>
        <p className="mt-4 max-w-[72ch] text-ink-muted">
          Flat, tiered by call volume, and never tied to cases signed, cases recovered, or any
          outcome. Optional, cancel anytime. Nothing here is owed unless you choose to continue after
          the free pilot.
        </p>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {PRICING_TIERS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-card border bg-surface p-7 ${p.featured ? "border-accent shadow-card" : "border-hairline"}`}
          >
            {p.featured && (
              <span className="mb-3 self-start rounded-pill bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
                Where most firms start
              </span>
            )}
            <h2 className="font-display text-xl font-semibold text-ink">{p.name}</h2>
            <p className="tnum mt-2 font-display text-2xl font-semibold text-ink">{p.price}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-faint">{p.volume}</p>
            <p className="mt-3 flex-1 text-sm text-ink-muted">{p.sub}</p>
            {p.checkoutUrl ? (
              <a
                href={p.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 inline-flex justify-center rounded-pill px-5 py-2.5 text-sm font-semibold ${p.featured ? "bg-accent text-white hover:bg-accent-hover" : "border border-hairline text-ink hover:border-accent"}`}
              >
                Subscribe · {p.price}
              </a>
            ) : (
              <Link
                href="/audit"
                className={`mt-6 inline-flex justify-center rounded-pill px-5 py-2.5 text-sm font-semibold ${p.featured ? "bg-accent text-white hover:bg-accent-hover" : "border border-hairline text-ink hover:border-accent"}`}
              >
                {CTA_PRIMARY}
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[72ch] text-sm text-faint">
        Founding-cohort firms start with the free 30-day pilot. A flat monthly fee begins only if you
        choose to continue, and it is quoted to you in writing before your pilot ends.
      </p>

      {/* The why: the compliance argument, in lawyer-grade language */}
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

      <p className="mt-8 max-w-[72ch] text-ink-muted">{PRICING_ANCHOR_LINE}</p>
    </div>
  );
}
