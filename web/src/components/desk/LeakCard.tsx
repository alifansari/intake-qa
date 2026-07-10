"use client";

// A single missed-case row for the queue. Confidence badge + workflow status.
// STATUS IS REAL: every click persists via /api/desk/flag-status (sibling
// table beside the frozen flag) — it survives reload, device changes, and
// colleagues see the same state. Optimistic UI with revert on failure.

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
  saveStatus: string | null; // canonical key from flag_status
};

const CONFIDENCE_TEXT: Record<string, string> = {
  strong: "The qualifying facts were captured clearly on the call, and the PNC does not appear to have signed.",
  moderate: "The qualifying facts are mostly there, but something was incomplete or unclear on the call. Worth a human look.",
};

// Canonical status keys ↔ what an intake coordinator would actually say.
const STATUS_LABEL: Record<string, string> = {
  needs_callback: "Needs a callback",
  reached_out: "We reached out",
  back_in_touch: "Back in touch",
  signed: "Signed",
  didnt_sign: "Didn't sign",
};

// Allowed forward transitions (display-only mirror of the state machine).
const NEXT: Record<string, { label: string; to: string }[]> = {
  needs_callback: [{ label: "We reached out", to: "reached_out" }],
  reached_out: [{ label: "They responded", to: "back_in_touch" }],
  back_in_touch: [
    { label: "They signed", to: "signed" },
    { label: "They passed", to: "didnt_sign" },
  ],
  signed: [],
  didnt_sign: [],
};

export function LeakCard({ leak }: { leak: Leak }) {
  const [status, setStatus] = useState(leak.saveStatus ?? "needs_callback");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminal = status === "signed" || status === "didnt_sign";
  const badge = leak.tier ? (leak.tier === "strong" ? "Strong flag" : "Moderate flag") : "Unrated";

  async function advance(to: string) {
    const prev = status;
    setStatus(to); // optimistic — the click must feel instant
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/desk/flag-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flag_id: leak.id, status: to }),
      });
      if (!r.ok) throw new Error("save failed");
    } catch {
      setStatus(prev); // revert — never silently lie about persistence
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

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
        {/* THE one action on this screen. Tap-to-dial on phones. */}
        {leak.phone && status === "needs_callback" ? (
          <a
            href={`tel:${leak.phone.replace(/[^+\d]/g, "")}`}
            className="rounded-pill bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent-hover"
          >
            Call back now · {leak.phone}
          </a>
        ) : null}
        <span className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">
          {STATUS_LABEL[status] ?? status}
        </span>
        {!terminal &&
          (NEXT[status] ?? []).map((n) => (
            <button
              key={n.to}
              type="button"
              disabled={saving}
              onClick={() => advance(n.to)}
              className="rounded-pill border border-hairline px-3 py-1 text-xs font-semibold text-ink hover:border-accent disabled:opacity-60"
            >
              {n.label}
            </button>
          ))}
        {terminal ? <span className="text-xs text-faint">Done — nothing further here.</span> : null}
        {error ? <span className="text-xs text-red">{error}</span> : null}
      </div>
    </div>
  );
}
