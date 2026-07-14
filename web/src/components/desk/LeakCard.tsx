"use client";

// A single missed-case row for the queue. Confidence badge + workflow status.
// STATUS IS REAL: every click persists via /api/desk/flag-status (sibling
// table beside the frozen flag) — it survives reload, device changes, and
// colleagues see the same state. Optimistic UI with revert on failure.
//
// Designed around the coordinator’s actual callback moment (see the intake-staff
// field guide, 2026-07-10): one screen, tap-to-dial, one-tap outcomes that match
// what really happens on the phone (spoke to them / left a message / bad number /
// signed / passed), a two-sentence warm opener, an undo for misclicks, and NO
// grading language — scores live in the attorney’s documents, not on the queue.
//
// This card also carries the queue’s honesty features (view logic shared with
// the server page via lib/desk/queue-view.mjs):
//   * B-013 — an elapsed-time urgency line ("Waiting 5 days — still very
//     winnable"). Time since the call ONLY; never a statute deadline date.
//   * B-011 — after each logged attempt, one line of encouragement grounded in
//     the callback science (93% of conversions happen by call 6; most firms
//     stop at 2). Encouragement, never surveillance; silent once terminal.
//   * B-010 — a `compact` mode for the done pile: terminal cards render as one
//     slim row (with Reopen); a reopened card expands back in place.

import { useState } from "react";
import { fmtDate } from "@/pdf/doc-helpers.mjs";
import { attemptNudge } from "@/lib/desk/queue-view.mjs";
import { fmtKRange } from "@/lib/desk/money.mjs";

export type Leak = {
  id: number | string;
  caseType: string | null;
  callDate: string;
  initials: string;
  displayId: string;
  score: number | null; // still flows from the server; deliberately not rendered here
  tier: "strong" | "moderate" | null;
  feeRange: string | null;
  // Numeric fee band (cents) for the compact header money chip. Optional so
  // callers that only have the formatted string still type-check.
  feeLowCents?: number | null;
  feeHighCents?: number | null;
  citationCount: number;
  reason: string | null;
  quote: string | null; // one transcript-validated verbatim line ("no citation, no claim")
  phone: string | null;
  saveStatus: string | null; // canonical key from flag_status
  attempts: number; // logged touches from flag_status.attempts (B-011)
  // Per-agent ownership (multi-user firms). `assigneeUserId` is the owning user
  // (null = unclaimed); `assigneeLabel` is the already-resolved display name,
  // "you" when it is the signed-in user. Absent on single-user/pilot firms.
  assigneeUserId?: string | null;
  assigneeLabel?: string | null;
  // B-013 — computed on the SERVER (one clock, no hydration drift) by
  // callUrgency() in lib/desk/queue-view.mjs. Elapsed time only, never a
  // statute deadline.
  urgency: { days: number; tone: "fresh" | "aging" | "urgent"; label: string } | null;
  // Sampled-review provenance (tiered model). Set by the SERVER only when
  // SAMPLED_REVIEW_ENABLED is on; the flag gating lives server-side (desk/page.tsx),
  // so this is simply absent when the flag is off and no badge renders (byte-identical
  // to today). "analyst_reviewed" = a human personally reviewed this flag and signed;
  // "engine_scored" = calibrated engine + citation guard (every excerpt machine-checked
  // against the recording), not individually human-reviewed. Never implies review that
  // didn't happen (§IV).
  provenance?: "analyst_reviewed" | "engine_scored";
};

// Firm-facing provenance badge copy (tiered model). Honest under §IV: the
// engine_scored label never claims human review; it asserts only what the citation
// guard guarantees — every quoted excerpt was machine-checked against the recording.
const PROVENANCE: Record<string, { label: string; title: string }> = {
  analyst_reviewed: {
    label: "Analyst-reviewed",
    title: "A human personally reviewed this flag and the analyst's signature covers it.",
  },
  engine_scored: {
    label: "Engine-scored · evidence-verified",
    title:
      "Scored by the calibrated engine; every quoted excerpt was machine-checked against the recording (citation guard). Not individually human-reviewed.",
  },
};

const CONFIDENCE_TEXT: Record<string, string> = {
  strong: "The qualifying facts were captured clearly on the call, and the PNC does not appear to have signed.",
  moderate: "The qualifying facts are mostly there, but something was incomplete or unclear on the call. Worth a human look.",
};

// Canonical status keys ↔ what an intake coordinator would actually say.
// "reached_out" is the tried-but-didn’t-connect state (voicemail / no answer) —
// the digest’s one-click "We called them" lands here too.
const STATUS_LABEL: Record<string, string> = {
  needs_callback: "Needs a callback",
  reached_out: "Left a message",
  back_in_touch: "Spoke to them",
  signed: "Signed",
  didnt_sign: "Didn’t sign",
  bad_number: "Bad number",
};

// One-tap outcomes per state — mirrors the phone call, not a form. Every
// terminal state can be reopened; every active state can be undone.
// "Left another message" (reached_out → reached_out) exists so the second,
// third… voicemail is loggable — that’s what makes the attempt count real.
const NEXT: Record<string, { label: string; to: string }[]> = {
  needs_callback: [
    { label: "Spoke to them", to: "back_in_touch" },
    { label: "Left a message", to: "reached_out" },
    { label: "Bad number", to: "bad_number" },
  ],
  reached_out: [
    { label: "Spoke to them", to: "back_in_touch" },
    { label: "Left another message", to: "reached_out" },
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
const ATTEMPT = new Set(["reached_out", "back_in_touch"]);

// Escalating visual weight for the elapsed-time line (B-013). Never red: the
// path to green — the call button — is on the same card, and amber is as far
// as honest urgency needs to go.
const URGENCY_CLASS: Record<string, string> = {
  fresh: "text-faint",
  aging: "font-medium text-amber",
  urgent: "inline-block rounded-pill bg-amber-tint px-2 py-0.5 font-semibold text-amber",
};

export function LeakCard({
  leak,
  firmName,
  compact = false,
  demo = false,
}: {
  leak: Leak;
  firmName?: string;
  compact?: boolean;
  // Sample/demo cards update local state only — never POST to the real
  // flag-status API (the ids aren’t real). The tap-to-dial button still works,
  // so a live demo stays fully interactive without erroring.
  demo?: boolean;
}) {
  const [status, setStatus] = useState(leak.saveStatus ?? "needs_callback");
  const [attempts, setAttempts] = useState(Number(leak.attempts) || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ownership: who is on this callback. Optimistic on claim; reverts on failure.
  const [assignee, setAssignee] = useState<{ id: string | null; label: string | null }>({
    id: leak.assigneeUserId ?? null,
    label: leak.assigneeLabel ?? null,
  });
  const terminal = TERMINAL.has(status);
  const badge = leak.tier ? (leak.tier === "strong" ? "Strong flag" : "Moderate flag") : "Needs a look";
  // The money this callback is worth — the reason to pick up the phone. A compact
  // emerald chip in the header so the queue scans as dollars. Estimate only (¹).
  // A dollar figure appears ONLY when a confidence tier backs it — never pair a
  // money claim with an unrated card (compliance §IV: no basis, no claim).
  const feeChip =
    leak.tier && leak.feeLowCents != null && (leak.feeLowCents > 0 || (leak.feeHighCents ?? 0) > 0)
      ? fmtKRange(leak.feeLowCents, leak.feeHighCents ?? leak.feeLowCents)
      : null;
  const urgency = leak.urgency;
  const nudge = attemptNudge(attempts, status);

  async function save(to: string) {
    const prev = status;
    const prevAttempts = attempts;
    setStatus(to); // optimistic — the click must feel instant
    if (ATTEMPT.has(to)) setAttempts(prevAttempts + 1); // optimistic tally too
    // Demo cards persist nowhere — the click just moves the card so the flow is
    // demonstrable, but no real record is written and no error can surface.
    if (demo) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/desk/flag-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flag_id: leak.id, status: to }),
      });
      if (!r.ok) throw new Error("save failed");
      // Reconcile the tally with the server’s authoritative count.
      const data = await r.json().catch(() => null);
      if (data && typeof data.attempts === "number") setAttempts(data.attempts);
    } catch {
      setStatus(prev); // revert — never silently lie about persistence
      setAttempts(prevAttempts);
      setError("Couldn’t save — try again.");
    } finally {
      setSaving(false);
    }
  }

  // Claim this callback for the signed-in user (multi-user firms). Sends the
  // current status unchanged plus assignee = "me"; the server resolves "me" to
  // the caller's id and records ownership. Demo cards just flip the label.
  async function claim() {
    const prev = assignee;
    setAssignee({ id: "me", label: "you" }); // optimistic
    if (demo) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/desk/flag-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flag_id: leak.id, status, assignee_user_id: "me" }),
      });
      if (!r.ok) throw new Error("claim failed");
    } catch {
      setAssignee(prev); // revert — never lie about ownership
      setError("Couldn’t claim — try again.");
    } finally {
      setSaving(false);
    }
  }

  // A compact ownership control shared by both card layouts.
  const ownership = assignee.label ? (
    <span
      className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-muted"
      title="Who is on this callback."
    >
      {assignee.label === "you" ? "Yours" : `On it: ${assignee.label}`}
    </span>
  ) : (
    <button
      type="button"
      disabled={saving}
      onClick={claim}
      className="rounded-pill border border-hairline px-3 py-1 text-xs font-semibold text-ink hover:border-accent disabled:opacity-60"
      title="Take this callback so your team knows it’s covered."
    >
      Claim this callback
    </button>
  );

  // B-010 — the done pile renders slim: one line, status, Reopen. A reopened
  // card (status back to needs_callback) falls out of `terminal` and expands
  // back into the full card in place.
  if (compact && terminal) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-hairline bg-canvas px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-muted">
          {leak.initials} · {leak.displayId}
        </span>
        <span className="text-xs text-faint">
          {leak.caseType ?? "Signable case"} · called {fmtDate(leak.callDate)}
        </span>
        <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
          {STATUS_LABEL[status] ?? status}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => save("needs_callback")}
          className="text-xs font-medium text-faint underline hover:text-ink disabled:opacity-60"
          title="Put it back in the callback queue."
        >
          Reopen
        </button>
        {error ? <span className="text-xs text-red">{error}</span> : null}
      </div>
    );
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
          {/* B-013 — honest urgency: elapsed time since THEIR call, escalating
              weight, and the fix is one tap away. Never a statute deadline —
              the firm’s lawyer owns deadlines, this line never computes one. */}
          {!terminal && urgency ? (
            <p className="mt-1 text-xs">
              <span className={URGENCY_CLASS[urgency.tone] ?? "text-faint"}>{urgency.label}</span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {feeChip ? (
            <span
              title="Estimated fee if this case signs — a range under the methodology on the honesty page, not a guarantee."
              className="rounded-pill bg-accent-tint px-3 py-1 font-display text-base font-semibold text-accent tnum"
            >
              {feeChip}
              <sup className="text-[0.55em]">1</sup>
            </span>
          ) : null}
          <span
            title={leak.tier ? CONFIDENCE_TEXT[leak.tier] : undefined}
            className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
              leak.tier === "strong" ? "bg-surface text-accent" : "bg-canvas text-ink-muted"
            }`}
          >
            {badge}
          </span>
          {/* Sampled-review provenance badge. Rendered ONLY when the server set
              `provenance` (i.e. SAMPLED_REVIEW_ENABLED is on). Absent when the flag
              is off → no badge → byte-identical to today. */}
          {leak.provenance && PROVENANCE[leak.provenance] ? (
            <span
              title={PROVENANCE[leak.provenance].title}
              className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
                leak.provenance === "analyst_reviewed" ? "bg-surface text-accent" : "bg-canvas text-ink-muted"
              }`}
            >
              {PROVENANCE[leak.provenance].label}
            </span>
          ) : null}
        </div>
      </div>

      {leak.reason ? <p className="mt-2 text-sm text-ink-muted">{leak.reason}</p> : null}

      {/* One transcript-validated verbatim line. Turns an arguable tier into
          self-evident evidence: a coordinator argues with "Strong flag" but not
          with the words on the call. Only VALIDATED snippets reach here (the query
          returns status='passed' only), so this never claims what wasn’t said.
          Framed "From the call" — the schema doesn’t store the speaker, so we don’t
          assert it was the caller. */}
      {leak.quote ? (
        <p className="mt-2 border-l-2 border-hairline pl-3 text-sm italic text-ink">
          <span className="mr-1 text-xs font-semibold not-italic text-ink-muted">From the call:</span>
          &ldquo;{leak.quote.length > 200 ? `${leak.quote.slice(0, 200).trimEnd()}…` : leak.quote}&rdquo;
        </p>
      ) : null}

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
        {!terminal ? ownership : null}
        {(NEXT[status] ?? []).map((n) => (
          <button
            key={`${n.to}:${n.label}`}
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

      {/* B-011 — encouragement after a logged try, grounded in the callback
          science. Reads as "keep going", never "you’ve only called twice";
          disappears the moment the case is decided. */}
      {nudge ? <p className="mt-2 text-xs font-medium text-accent">{nudge}</p> : null}
    </div>
  );
}
