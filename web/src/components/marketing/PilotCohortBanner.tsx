// Real scarcity — reads spots from lib/pilot-config.ts. No fake countdown timer.

import Link from "next/link";
import { SPOTS_OPEN, SPOTS_TOTAL } from "@/lib/pilot-config";

export function PilotCohortBanner() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-navy/20 bg-navy-tint px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="tnum rounded-pill bg-navy px-3 py-1 text-sm font-semibold text-white">
          {SPOTS_OPEN} / {SPOTS_TOTAL}
        </span>
        <p className="text-sm font-medium text-ink">
          Founding cohort — {SPOTS_OPEN} of {SPOTS_TOTAL} Southern California PI firms open.
          <span className="text-ink-muted"> Free 30-day pilot · find-it-free guarantee.</span>
        </p>
      </div>
      <Link
        href="/audit"
        className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Claim a spot
      </Link>
    </div>
  );
}
