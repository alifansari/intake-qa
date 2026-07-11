// Founding-cohort banner. Real scarcity only: the seat count comes from the single
// manually-updated constant in lib/cohort.ts. No countdown, no faked number. When
// the cohort is full, the CTA flips to a waitlist state automatically.

import Link from "next/link";
import { SEAT_LINE, COHORT_CTA_LABEL, COHORT_CTA_HREF, COHORT_FULL } from "@/lib/cohort";

export function PilotCohortBanner() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-navy/20 bg-navy-tint px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="rounded-pill bg-navy px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Founding beta
        </span>
        <p className="text-sm font-medium text-ink">
          Start with a free Leak Audit; a small founding cohort then tests the full desk, free
          during the beta, with preferred pricing locked in at launch.{" "}
          <span className="tnum font-semibold text-ink">{SEAT_LINE}</span>
        </p>
      </div>
      <Link
        href={COHORT_CTA_HREF}
        className="flex-none rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        aria-disabled={COHORT_FULL || undefined}
      >
        {COHORT_CTA_LABEL}
      </Link>
    </div>
  );
}
