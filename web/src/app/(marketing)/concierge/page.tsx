import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { CTA_PRIMARY } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Concierge setup | Intake QA",
  description:
    "We handle setup so your team barely lifts a finger. Start with a free Leak Audit, then the founding beta.",
  alternates: { canonical: "/concierge" },
};

export default function ConciergePage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Concierge</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Setup is on us.
      </h1>
      <p className="mt-6 max-w-[68ch] text-lg leading-relaxed text-ink-muted">
        Once you join the founding beta, we don’t just hand you a dashboard. We’ll sit
        with your staff while they work the first callback list. Your team makes every call; we
        make sure the setup, the scripts, and the ledger are working, so you see signed cases early.
      </p>
      <div className="mt-10">
        <PilotCohortBanner />
      </div>
      <div className="mt-8">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
