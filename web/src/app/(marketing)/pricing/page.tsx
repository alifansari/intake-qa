import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { GuaranteeBadge } from "@/components/marketing/GuaranteeBadge";

export const metadata: Metadata = {
  title: "Pricing — flat fees, never a percentage",
  description:
    "Pilot ($0), Core ($1,500/mo + $500/case), Pro ($2,500/mo + $350/case, capped $7,000/mo). Every plan bills a flat fee per recovered case — never a slice of your fee (Rule 5.4).",
  alternates: { canonical: "/pricing" },
};

const PLANS = [
  { name: "Pilot", price: "$0", sub: "30-day founding-cohort pilot. Find-it-free guarantee. Cancel anytime.", cta: "Start the pilot", featured: false },
  { name: "Core", price: "$1,500/mo + $500/case", sub: "For firms recovering a steady stream of leaked cases.", cta: "Run a Leak Audit", featured: true },
  { name: "Pro", price: "$2,500/mo + $350/case", sub: "For higher volume; per-case cost drops and is capped at $7,000/mo.", cta: "Run a Leak Audit", featured: false },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Pricing</p>
      <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Flat fees. Never a percentage. That&apos;s the whole point.
      </h1>

      <div className="mt-8">
        <PilotCohortBanner />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-card border bg-surface p-7 ${p.featured ? "border-accent shadow-card" : "border-hairline"}`}
          >
            {p.featured && (
              <span className="mb-3 self-start rounded-pill bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
                Most firms
              </span>
            )}
            <h2 className="font-display text-xl font-semibold text-ink">{p.name}</h2>
            <p className="tnum mt-2 font-display text-2xl font-semibold text-ink">{p.price}</p>
            <p className="mt-3 flex-1 text-sm text-ink-muted">{p.sub}</p>
            <Link
              href="/audit"
              className={`mt-6 inline-flex justify-center rounded-pill px-5 py-2.5 text-sm font-semibold ${p.featured ? "bg-accent text-white hover:bg-accent-hover" : "border border-hairline text-ink hover:border-accent"}`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-[72ch] text-ink-muted">
        Every plan bills a flat fee per case. We are paid the same whether your case settles for
        <span className="tnum"> $10,000</span> or <span className="tnum">$1,000,000</span> — by
        design, under Rule 5.4.
      </p>

      <div className="mt-6 max-w-[720px]">
        <GuaranteeBadge />
      </div>

      <p className="mt-8 max-w-[72ch] rounded-card border border-hairline bg-canvas p-5 text-sm text-ink-muted">
        For context: one serious signed PI case commonly earns a firm{" "}
        <span className="tnum font-semibold text-ink">$25,000–$150,000</span> in contingency fees
        (ABA: one-third to 40%; Martindale-Nolo: represented clients averaged{" "}
        <span className="tnum">$77,600</span> in recovery). Recovering a single leaked case pays for
        the software many times over.
      </p>
    </div>
  );
}
