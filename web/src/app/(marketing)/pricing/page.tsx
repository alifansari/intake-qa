import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { GuaranteeBadge } from "@/components/marketing/GuaranteeBadge";
import {
  PRICING_TIERS,
  PRICING_COMPLIANCE_ARGUMENT,
  PRICING_ANCHOR_LINE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Pricing — flat monthly, never a share of the fee | Intake QA",
  description:
    "A flat monthly subscription tiered by call volume. No per-case fee, no percentage of any recovery, no charge tied to whether you sign a client. The founding-cohort pilot is free.",
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
        client. You pay a flat monthly subscription to have your intake calls analyzed — the same
        way you pay your answering service or your CRM, whether or not any given call becomes a
        client.
      </p>

      <div className="mt-8">
        <PilotCohortBanner />
      </div>

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
            <Link
              href="/audit"
              className={`mt-6 inline-flex justify-center rounded-pill px-5 py-2.5 text-sm font-semibold ${p.featured ? "bg-accent text-white hover:bg-accent-hover" : "border border-hairline text-ink hover:border-accent"}`}
            >
              Run your free audit
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[72ch] text-sm text-faint">
        Prices are being finalized for launch.
        {/* TODO(Ali): confirm final monthly prices; figures above are placeholders. */}
        {" "}Founding-cohort firms start free for 30 days, then lock in a founding rate.
      </p>

      {/* The why — the compliance argument, in lawyer-grade language */}
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

      <div className="mt-8 max-w-[720px]">
        <GuaranteeBadge />
      </div>
    </div>
  );
}
