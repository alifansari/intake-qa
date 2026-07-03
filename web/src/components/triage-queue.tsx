"use client";
import * as React from "react";
import type { ReconciledCall } from "@/lib/reconcile";
import type { OutcomeCode } from "@/lib/schema";
import { OUTCOME_HOTKEYS, OUTCOME_LABEL } from "@/lib/labels";
import { money, pct, shortDate, titleCase } from "@/lib/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EvidenceDrawer } from "./evidence-drawer";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

// Superhuman-style triage: j/k to move, number keys to dispose in one keystroke.
// Writes to /api/outcomes; the row leaves the queue optimistically so the demo
// stays snappy even if the serverless filesystem is read-only.
export function TriageQueue({ initial }: { initial: ReconciledCall[] }) {
  const [queue, setQueue] = React.useState(initial);
  const [selected, setSelected] = React.useState(0);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [justDone, setJustDone] = React.useState<{ id: string; code: OutcomeCode } | null>(
    null,
  );
  const rowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);

  const dispose = React.useCallback(
    async (row: ReconciledCall, code: OutcomeCode) => {
      setSaving(row.call.call_id);
      // A callback is implied for the "after callback" disposition.
      const callback_made = code === "signed_us_after_callback";
      try {
        await fetch("/api/outcomes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            call_id: row.call.call_id,
            outcome_code: code,
            callback_made,
            outcome_entered_by: "demo-user",
          }),
        });
      } catch {
        // Optimistic anyway — the demo must never break on a failed write.
      }
      setSaving(null);
      setJustDone({ id: row.call.call_id, code });
      setQueue((q) => {
        const next = q.filter((r) => r.call.call_id !== row.call.call_id);
        setSelected((s) => Math.min(s, Math.max(0, next.length - 1)));
        return next;
      });
    },
    [],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, queue.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else {
        const hk = OUTCOME_HOTKEYS.find((h) => h.key === e.key);
        if (hk && queue[selected]) {
          e.preventDefault();
          void dispose(queue[selected], hk.code);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue, selected, dispose]);

  React.useEffect(() => {
    rowRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const totalAtRisk = queue.reduce((s, r) => s + r.feeAtRisk, 0);

  if (queue.length === 0) {
    return (
      <div className="rounded-sm border border-line bg-paper p-10 text-center">
        <Check className="mx-auto mb-3 h-8 w-8 text-green" />
        <p className="font-display text-lg">Queue clear.</p>
        <p className="mt-1 text-sm text-muted">
          Every scored call has a recorded outcome.
          {justDone ? ` Last: ${OUTCOME_LABEL[justDone.code]}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Data-quality nag + keyboard legend */}
      <div className="mb-3 flex flex-col gap-2 rounded-sm border border-amber/30 bg-amber-tint px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-amber">
          <span className="font-semibold">{queue.length} calls</span> still need an outcome —
          <span className="tnum font-semibold"> {money(totalAtRisk)}</span> in fee-at-risk is
          unaccounted for. Highest value first.
        </div>
        <div className="hidden shrink-0 gap-1 text-xs text-muted sm:flex">
          <kbd className="rounded border border-line bg-paper px-1.5 py-0.5">j</kbd>
          <kbd className="rounded border border-line bg-paper px-1.5 py-0.5">k</kbd>
          <span className="self-center">move · number keys dispose</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-line bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th className="eyebrow px-3 py-2">Call</th>
              <th className="eyebrow px-3 py-2">Rep · source</th>
              <th className="eyebrow px-3 py-2">Received</th>
              <th className="eyebrow px-3 py-2 text-right">Fee at risk</th>
              <th className="eyebrow px-3 py-2">Score</th>
              <th className="eyebrow px-3 py-2 text-right">Dispose</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((row, i) => (
              <tr
                key={row.call.call_id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                onClick={() => setSelected(i)}
                className={cn(
                  "cursor-pointer border-b border-line last:border-0",
                  i === selected ? "bg-navy-tint" : "hover:bg-canvas",
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {i === selected ? (
                      <span className="h-4 w-0.5 rounded bg-navy" aria-hidden />
                    ) : (
                      <span className="h-4 w-0.5" aria-hidden />
                    )}
                    <EvidenceDrawer row={row}>
                      <button className="font-medium text-navy hover:underline">
                        {row.call.call_id}
                      </button>
                    </EvidenceDrawer>
                    {row.flagged ? <Badge tone="red">flagged</Badge> : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {row.meta.rep}
                  <span className="text-faint"> · {titleCase(row.meta.source)}</span>
                </td>
                <td className="px-3 py-2.5 tnum text-muted">{shortDate(row.meta.received_at)}</td>
                <td className="px-3 py-2.5 text-right tnum font-semibold text-red">
                  {row.feeAtRisk ? money(row.feeAtRisk) : "—"}
                </td>
                <td className="px-3 py-2.5 tnum">{row.overall}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1">
                    {OUTCOME_HOTKEYS.map((h) => (
                      <Button
                        key={h.key}
                        size="sm"
                        variant={i === selected ? "outline" : "ghost"}
                        className="h-7 px-2 text-xs"
                        disabled={saving === row.call.call_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void dispose(row, h.code);
                        }}
                        title={`${h.label} (${h.key})`}
                      >
                        <span className="mr-1 text-faint">{h.key}</span>
                        {h.label}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Recording an outcome increments its version and keeps the prior value in an audit
        trail. Editing later re-opens the record — nothing is overwritten silently.
      </p>
    </div>
  );
}
