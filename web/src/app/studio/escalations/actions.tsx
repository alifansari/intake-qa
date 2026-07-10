"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Named lifecycle actions for one escalation row. The name is required —
// ack/resolve without a person is refused by the API (and the store).
export function EscalationRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function act(action: "ack" | "actioned" | "resolve") {
    const by = window.prompt(
      action === "ack"
        ? "Ack = named ownership. Your name:"
        : action === "actioned"
          ? "Who did the thing? Your name:"
          : "Resolving. Your name:",
      "Ali Ansari",
    );
    if (!by?.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/escalations/action", {
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
      {["fired", "routed", "unclaimed"].includes(status) ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act("ack")}>
          Ack (claim)
        </Button>
      ) : null}
      {status === "acked" ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act("actioned")}>
          Mark actioned
        </Button>
      ) : null}
      {["acked", "actioned"].includes(status) ? (
        <Button variant="primary" size="sm" disabled={busy} onClick={() => act("resolve")}>
          Resolve
        </Button>
      ) : null}
      {msg ? <span className="text-xs text-red">{msg}</span> : null}
    </div>
  );
}

// One ack-timeout sweep pass (Phase 4). Everything it "sends" is simulated.
export function SweepButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  async function sweep() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/oncall/sweep", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "sweep failed");
      setResult(
        `routed ${data.routed} · waterfalled ${data.waterfalled} · unclaimed ${data.unclaimed}`,
      );
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "sweep failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={sweep}>
        {busy ? "Sweeping…" : "Run ack sweep"}
      </Button>
      {result ? <span className="text-xs text-faint tnum">{result}</span> : null}
    </span>
  );
}
