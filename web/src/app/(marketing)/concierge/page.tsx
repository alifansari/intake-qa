import type { Metadata } from "next";
import Link from "next/link";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";

export const metadata: Metadata = {
  title: "White-glove recovery for founding-cohort firms",
  description:
    "During your pilot we personally help work your first recovered callbacks with you — so you see signed cases before you commit to anything.",
  alternates: { canonical: "/concierge" },
};

export default function ConciergePage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Concierge</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        White-glove recovery for founding-cohort firms.
      </h1>
      <p className="mt-6 max-w-[68ch] text-lg leading-relaxed text-ink-muted">
        During your pilot, we don&apos;t just hand you a dashboard — we&apos;ll personally help work
        your first recovered callbacks with you, so you see signed cases before you commit to
        anything.
      </p>
      <div className="mt-10">
        <PilotCohortBanner />
      </div>
      <div className="mt-8">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Start the pilot with a free Leak Audit
        </Link>
      </div>
    </div>
  );
}
