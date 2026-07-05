// Founding-cohort banner. Honest, durable language — no countdown, no "N seats
// left" that stops being true in six months. Copy comes from site-constants.

import Link from "next/link";
import { COHORT_LINE } from "@/lib/site-constants";

export function PilotCohortBanner() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-navy/20 bg-navy-tint px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="rounded-pill bg-navy px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Founding cohort
        </span>
        <p className="text-sm font-medium text-ink">
          {COHORT_LINE}
          <span className="text-ink-muted"> Find-it-free guarantee. Cancel anytime.</span>
        </p>
      </div>
      <Link
        href="/audit"
        className="flex-none rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Run your free audit
      </Link>
    </div>
  );
}
