"use client";

// A single leaked-case row for the queue. Confidence badge + save-status control
// use the finalized vocabulary. Save-status is local state for now (a demo of the
// workflow); persistence + the illegal-transition guard land with the save-status
// state-machine gate (item 11). TODO(Ali): wire to /api/drafts save-status.

import { useState } from "react";
import { fmtDate } from "@/pdf/doc-helpers.mjs";

export type Leak = {
  id: number | string;
  caseType: string | null;
  callDate: string;
  initials: string;
  displayId: string;
  score: number | null;
  tier: "strong" | "moderate" | null;
  feeRange: string | null;
  citationCount: number;
  reason: string | null;
  phone: string | null;
};

const CONFIDENCE_TEXT: Record<string, string> = {
  strong: "The qualifying facts were captured clearly on the call, and the PNC does not appear to have signed.",
  moderate: "The qualifying facts are mostly there, but something was incomplete or unclear on the call. Worth a human look.",
};

// Allowed forward transitions (display-only mirror of the state machine).
// Labels are what an intake coordinator would actually say, not workflow-ese.
const NEXT: Record<string, { label: string; to: string }[]> = {
  "Needs a callback": [{ label: "We reached out", to: "We reached out" }],
  "We reached out": [{ label: "They responded", to: "Back in touch" }],
  "Back in touch": [
    { label: "They signed", to: "Signed" },
    { label: "They passed", to: "Didn't sign" },
  ],
  Signed: [],
  "Didn't sign": [],
};

export function LeakCard({ leak }: { leak: Leak }) {
  const [status, setStatus] = useState("Needs a callback");
  const terminal = status === "Signed" || status === "Didn't sign";
  const badge = leak.tier ? (leak.tier === "strong" ? "Strong flag" : "Moderate flag") : "Unrated";

  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-ink">
            {leak.initials} · {leak.displayId}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {leak.caseType ?? "Signable case"} · {fmtDate(leak.callDate)}
          </p>
        </div>
        <span
          title={leak.tier ? CONFIDENCE_TEXT[leak.tier] : undefined}
          className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
            leak.tier === "strong" ? "bg-accent-tint text-accent" : "bg-canvas text-ink-muted"
          }`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        {leak.feeRange ? (
          <span>
            Est. fee value: <span className="font-semibold text-ink">{leak.feeRange}</span>
            <sup>1</sup>
          </span>
        ) : null}
        {leak.score != null ? <span>Score: {leak.score}</span> : null}
        <span>{leak.citationCount} cited fact{leak.citationCount === 1 ? "" : "s"}</span>
      </div>

      {leak.reason ? <p className="mt-2 text-sm text-ink-muted">{leak.reason}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        {/* THE one action on this screen (P5: one screen, one verb). Tap-to-dial
            on phones; on desktop it shows the number to dial. */}
        {leak.phone && status === "Needs a callback" ? (
          <a
            href={`tel:${leak.phone.replace(/[^+\d]/g, "")}`}
            className="rounded-pill bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent-hover"
          >
            Call back now · {leak.phone}
          </a>
        ) : null}
        <span className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">{status}</span>
        {!terminal &&
          (NEXT[status] ?? []).map((n) => (
            <button
              key={n.to}
              type="button"
              onClick={() => setStatus(n.to)}
              className="rounded-pill border border-hairline px-3 py-1 text-xs font-semibold text-ink hover:border-accent"
            >
              {n.label}
            </button>
          ))}
        {terminal ? <span className="text-xs text-faint">Done — nothing further here.</span> : null}
      </div>
    </div>
  );
}
