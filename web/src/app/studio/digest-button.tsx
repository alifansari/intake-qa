"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

// Founder runner: one digest pass over every firm, from the Today screen.
// Same posture as the API behind it — KILL_SWITCH halts, TEST_MODE renders
// files instead of emailing, so this button is always safe to press.
export function SendDigestsButton() {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/digest/run", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "digest run failed");
      if (data.halted) {
        setResult("Halted — the kill switch is on, so nothing went anywhere.");
        return;
      }
      const modes: Record<string, number> = {};
      for (const x of data.results ?? []) {
        modes[x.mode] = (modes[x.mode] ?? 0) + 1;
      }
      // Human sentences, not mode codes: "test" = rendered to a file (test
      // mode), "sent" = actually emailed.
      const parts = Object.entries(modes).map(([m, n]) =>
        m === "test"
          ? `${n} rendered as test file${n === 1 ? "" : "s"} (nothing emailed)`
          : m === "sent"
            ? `${n} emailed`
            : `${n} ${m}`,
      );
      setResult(
        `Covered ${data.firms} firm${data.firms === 1 ? "" : "s"}: ${parts.join(" · ")}.`,
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "digest run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={run}>
          {busy ? "Running…" : "Send today's digests"}
        </Button>
        {result ? <span className="text-xs text-faint tnum">{result}</span> : null}
      </span>
      <span className="text-[11px] text-faint">
        One missed-cases email per firm. In test mode it renders files — nothing sends.
      </span>
    </span>
  );
}
