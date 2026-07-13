"use client";

// Pre-release review panel (Stage 6). Analyst confirms every checklist item before
// the Release button enables; posts transitions to /api/admin/review.
import { useState } from "react";
import { REVIEW_CHECKLIST } from "@/lib/leak-report/copy.mjs";

type Session = { id: number | string; token: string; email: string | null; report_status: string };

export function ReviewPanel({ session }: { session: Session }) {
  const [status, setStatus] = useState(session.report_status);
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKLIST.map(() => false));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allChecked = checks.every(Boolean);

  async function act(to: string, checklist?: boolean[]) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, to, checklist }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Action failed.");
      setStatus(d.status);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-ink">Session {String(session.id)}</p>
          <p className="text-xs text-ink-muted">{session.email ?? "no email"} · token {session.token.slice(0, 8)}…</p>
        </div>
        <span className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-semibold text-ink">{status.replace("_", " ")}</span>
      </div>

      {status === "draft" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => act("analyst_review")}
          className="mt-4 rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-50"
        >
          Start analyst review
        </button>
      ) : null}

      {status === "analyst_review" ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Pre-release review — confirm each item before sign-off:</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {REVIEW_CHECKLIST.map((item, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                    className="mt-0.5"
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !allChecked}
              onClick={() => act("released", checks)}
              className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Sign off &amp; release
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act("draft")}
              className="rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-50"
            >
              Send back to draft
            </button>
          </div>
          {!allChecked ? <p className="mt-2 text-xs text-faint">Release enables once every item is confirmed.</p> : null}
        </div>
      ) : null}

      {status === "released" ? <p className="mt-3 text-sm text-accent">Released — stamped with the analyst’s name and timestamp.</p> : null}
      {err ? <p className="mt-2 text-sm text-red">{err}</p> : null}
    </div>
  );
}
