"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Named approve/reject for one tuning proposal.
export function ProposalActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    const by = window.prompt(
      action === "approve"
        ? "Approving changes live escalation config. Your name:"
        : "Rejecting. Your name:",
      "Ali Ansari",
    );
    if (!by?.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/tuning/proposal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, by: by.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "failed");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" size="sm" disabled={busy} onClick={() => act("approve")}>
        Approve
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => act("reject")}>
        Reject
      </Button>
      {msg ? <span className="text-xs text-red">{msg}</span> : null}
    </div>
  );
}

// One tuning-loop pass: reads dispositions, inserts proposals.
export function RunTuningButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/tuning/run", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "run failed");
      setResult(`${data.proposals} new proposal${data.proposals === 1 ? "" : "s"}`);
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={run}>
        {busy ? "Running…" : "Run tuning loop"}
      </Button>
      {result ? <span className="text-xs text-faint tnum">{result}</span> : null}
    </span>
  );
}
