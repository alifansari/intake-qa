"use client";

// FOUNDER-ONLY affordance (rendered on the founder-gated review console): queue a
// firm+period Monthly Statement for manual analyst review. Creates a 'draft'
// firm_statement_reviews row via /api/admin/statement-queue; the row then appears
// in the queue above and is pushed through Start review → checklist → Release like
// any other. Never auto-releases; a draft is invisible to the firm until released.
import { useState } from "react";

type Firm = { id: string | number; name: string };

export function StatementQueueForm({ firms }: { firms: Firm[] }) {
  const [firmId, setFirmId] = useState<string>(firms[0] ? String(firms[0].id) : "");
  const [period, setPeriod] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/admin/statement-queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firmId, period }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Could not queue the statement.");
      setMsg(
        d.created
          ? "Queued as draft — it’s in the review list. Start review, confirm the checklist, then release."
          : `A statement for that period already exists (status: ${String(d.status).replace("_", " ")}).`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not queue the statement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 rounded-card border border-hairline bg-surface p-5">
      <h2 className="font-display text-sm font-semibold text-ink">Queue a statement for review</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Create a draft statement for a firm + month so you can review and release it by hand
        (independent of the sampled-review flag). A draft is never shown to the firm until you release it.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Firm
          <select
            value={firmId}
            onChange={(e) => setFirmId(e.target.value)}
            className="rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
          >
            {firms.map((f) => (
              <option key={String(f.id)} value={String(f.id)}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Period (YYYY-MM)
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
          />
        </label>
        <button
          type="button"
          disabled={busy || !firmId || !/^\d{4}-\d{2}$/.test(period)}
          onClick={submit}
          className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Queue draft
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-accent">{msg}</p> : null}
      {err ? <p className="mt-2 text-xs text-red">{err}</p> : null}
    </div>
  );
}
