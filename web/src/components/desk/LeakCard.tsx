"use client";

// A single missed-case row for the queue. Confidence badge + workflow status.
// STATUS IS REAL: every click persists via /api/desk/flag-status (sibling
// table beside the frozen flag) — it survives reload, device changes, and
// colleagues see the same state. Optimistic UI with revert on failure.
//
// Designed around the coordinator's actual callback moment (see the intake-staff
// field guide, 2026-07-10): one screen, tap-to-dial, one-tap outcomes that match
// what really happens on the phone (spoke to them / left a message / bad number /
// signed / passed), a two-sentence warm opener, an undo for misclicks, and NO
// grading language — scores live in the attorney's documents, not on the queue.

import { useState } from "react";
import { fmtDate } from "@/pdf/doc-helpers.mjs";

export type Leak = {
  id: number | string;
  caseType: string | null;
  callDate: string;
  initials: string;
  displayId: string;
  score: number | null; // still flows from the server; deliberately not rendered here
  tier: "strong" | "moderate" | null;
  feeRange: string | null;
  citationCount: number;
  reason: string | null;
  quote: string | null; // one transcript-validated verbatim line ("no citation, no claim")
  phone: string | null;
  saveStatus: string | null; // canonical key from flag_status
};

const CONFIDENCE_TEXT: Record<string, string> = {
  strong: "The qualifying facts were captured clearly on the call, and the PNC does not appear to have signed.",
  moderate: "The qualifying facts are mostly there, but something was incomplete or unclear on the call. Worth a human look.",
};

// Canonical status keys ↔ what an intake coordinator would actually say.
// "reached_out" is the tried-but-didn't-connect state (voicemail / no answer) —
// the digest's one-click "We called them" lands here too.
const STATUS_LABEL: Record<string, string> = {
  needs_callback: "Needs a callback",
  reached_out: "Left a message",
  back_in_touch: "Spoke to them",
  signed: "Signed",
  didnt_sign: "Didn't sign",
  bad_number: "Bad number",
};

// One-tap outcomes per state — mirrors the phone call, not a form. Every
// terminal state can be reopened; every active state can be undone.
const NEXT: Record<string, { label: string; to: string }[]> = {
  needs_callback: [
    { label: "Spoke to them", to: "back_in_touch" },
    { label: "Left a message", to: "reached_out" },
    { label: "Bad number", to: "bad_number" },
  ],
  reached_out: [
    { label: "Spoke to them", to: "back_in_touch" },
    { label: "They signed", to: "signed" },
    { label: "They passed", to: "didnt_sign" },
  ],
  back_in_touch: [
    { label: "They signed", to: "signed" },
    { label: "They passed", to: "didnt_sign" },
  ],
  signed: [],
  didnt_sign: [],
  bad_number: [],
};

const TERMINAL = new Set(["signed", "didnt_sign", "bad_number"]);

export function LeakCard({ leak, firmName }: { leak: Leak; firmName?: string }) {
  const [status, setStatus] = useState(leak.saveStatus ?? "needs_callback");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminal = TERMINAL.has(status);
  const badge = leak.tier ? (leak.tier === "strong" ? "Strong flag" : "Moderate flag") : "Unrated";

  async function save(to: string) {
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

  // The warm opener: service framing, references their own call. Two sentences.
  const opener = `Hi, this is [your name] from ${firmName ?? "the firm"} — you called us on ${fmtDate(
    leak.callDate,
  )}${leak.caseType ? ` about your ${leak.caseType.toLowerCase()} case` : ""}. I wanted to make sure you got your questions answered.`;

  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-ink">
            {leak.initials} · {leak.displayId}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {leak.caseType ?? "Signable case"} · called {fmtDate(leak.callDate)}
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

      {leak.reason ? <p className="mt-2 text-sm text-ink-muted">{leak.reason}</p> : null}

      {/* One transcript-validated verbatim line. Turns an arguable tier into
          self-evident evidence: a coordinator argues with "Strong flag" but not
          with the words on the call. Only VALIDATED snippets reach here (the query
          returns status='passed' only), so this never claims what wasn't said.
          Framed "From the call" — the schema doesn't store the speaker, so we don't
          assert it was the caller. */}
      {leak.quote ? (
        <p className="mt-2 border-l-2 border-hairline pl-3 text-sm italic text-ink">
          <span className="mr-1 text-xs font-semibold not-italic text-ink-muted">From the call:</span>
          &ldquo;{leak.quote.length > 200 ? `${leak.quote.slice(0, 200).trimEnd()}…` : leak.quote}&rdquo;
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        {leak.feeRange ? (
          <span>
            Est. fee value: <span className="font-semibold text-ink">{leak.feeRange}</span>
            <sup>1</sup>
          </span>
        ) : null}
      </div>

      {/* The words for the awkward part — a warm two-sentence opener that turns
          the callback into a service call. Openers get used; scripts get ignored. */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-accent hover:text-accent-hover">
          What to say when they pick up
        </summary>
        <p className="mt-1 max-w-[70ch] rounded-base border border-hairline bg-canvas px-3 py-2 text-sm italic text-ink">
          &ldquo;{opener}&rdquo;
        </p>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        {/* THE one action on this screen. Tap-to-dial on phones. Coordinators
            call more than once, so the number stays dialable in every status —
            primary while a callback is needed, quiet afterwards. */}
        {leak.phone ? (
          <a
            href={`tel:${leak.phone.replace(/[^+\d]/g, "")}`}
            className={
              status === "needs_callback" || status === "reached_out"
                ? "rounded-pill bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent-hover"
                : "rounded-pill border border-hairline px-3 py-1 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
            }
          >
            {status === "needs_callback" ? "Call back now" : "Call again"} · {leak.phone}
          </a>
        ) : null}
        <span className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">
          {STATUS_LABEL[status] ?? status}
        </span>
        {(NEXT[status] ?? []).map((n) => (
          <button
            key={n.to}
            type="button"
            disabled={saving}
            onClick={() => save(n.to)}
            className="rounded-pill border border-hairline px-3 py-1 text-xs font-semibold text-ink hover:border-accent disabled:opacity-60"
          >
            {n.label}
          </button>
        ))}
        {terminal ? (
          <>
            <span className="text-xs text-faint">Done — nothing further here.</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => save("needs_callback")}
              className="text-xs font-medium text-faint underline hover:text-ink disabled:opacity-60"
            >
              Reopen
            </button>
          </>
        ) : status !== "needs_callback" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => save("needs_callback")}
            className="text-xs font-medium text-faint underline hover:text-ink disabled:opacity-60"
            title="Misclick? Put it back in the callback queue."
          >
            Undo
          </button>
        ) : null}
        {error ? <span className="text-xs text-red">{error}</span> : null}
      </div>
    </div>
  );
}
