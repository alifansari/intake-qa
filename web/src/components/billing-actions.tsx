"use client";

// Operator billing controls: close a period, and dispute/void events or void an
// invoice. Each posts to /api/admin/billing and reloads on success. Kept small;
// the heavy logic lives server-side.

import { useState } from "react";

async function post(body: Record<string, unknown>): Promise<void> {
  const r = await fetch("/api/admin/billing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error ?? `HTTP ${r.status}`);
  }
}

export function ClosePeriodForm({ firmId, defaultPeriod }: { firmId: number | string; defaultPeriod: string }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await post({ action: "close_period", firm_id: firmId, period });
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        placeholder="YYYY-MM"
        className="w-28 rounded-sm border border-line bg-paper px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-sm bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Closing…" : "Close period"}
      </button>
      {err && <span className="text-xs text-red">{err}</span>}
    </div>
  );
}

export function ActionButton({
  label,
  body,
  confirm,
  tone = "muted",
}: {
  label: string;
  body: Record<string, unknown>;
  confirm?: string;
  tone?: "muted" | "danger";
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      await post(body);
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className={`rounded-sm border px-2 py-1 text-xs font-semibold disabled:opacity-50 ${
        tone === "danger" ? "border-red text-red" : "border-line text-muted"
      }`}
    >
      {busy ? "…" : label}
    </button>
  );
}
