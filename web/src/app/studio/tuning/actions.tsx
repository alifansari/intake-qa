"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Named approve/reject for one tuning proposal. No window.prompt: clicking
// Approve or Reject reveals a small inline confirm with a name input that
// remembers the last-used name in localStorage ("operator-name").

const NAME_KEY = "operator-name";

function loadSavedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveNameForNextTime(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // localStorage unavailable — the action still works, it just won’t remember.
  }
}

const inputClass =
  "rounded-sm border border-line-strong bg-paper px-2 py-1 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none";

export function ProposalActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<"approve" | "reject" | null>(null);
  const [by, setBy] = React.useState("");

  // Reveal the inline confirm, prefilled with the remembered name (read in the
  // click handler so nothing touches localStorage during server render).
  function open(action: "approve" | "reject") {
    setBy(loadSavedName());
    setMsg(null);
    setPending(action);
  }

  async function confirm(action: "approve" | "reject") {
    if (!by.trim()) return;
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
      saveNameForNextTime(by.trim());
      setPending(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">
          {pending === "approve"
            ? "Approving changes the live trigger settings under your name."
            : "Rejecting — the trigger stays exactly as it is."}
        </span>
        <input
          type="text"
          value={by}
          onChange={(e) => setBy(e.target.value)}
          disabled={busy}
          placeholder="Your name"
          autoFocus={!by.trim()}
          className={`${inputClass} w-28`}
        />
        <Button
          variant={pending === "approve" ? "primary" : "outline"}
          size="sm"
          disabled={busy || !by.trim()}
          onClick={() => confirm(pending)}
        >
          {pending === "approve" ? "Confirm approve" : "Confirm reject"}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPending(null)}>
          Cancel
        </Button>
        {msg ? <span className="text-xs text-red">{msg}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" size="sm" disabled={busy} onClick={() => open("approve")}>
        Approve…
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => open("reject")}>
        Reject…
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
      setResult(
        data.proposals === 0
          ? "No proposals — below the data threshold, it stays quiet on purpose."
          : `${data.proposals} new proposal${data.proposals === 1 ? "" : "s"} — review below.`,
      );
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
