"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Named lifecycle actions for one escalation row. The name is required —
// ack/resolve without a person is refused by the API (and the store).
// No window.prompt anywhere: the name lives in a small inline input that
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
    // localStorage unavailable — the action still works, it just won't remember.
  }
}

const inputClass =
  "rounded-sm border border-line-strong bg-paper px-2 py-1 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none";

type Disposition = "true_positive" | "false_positive" | "right_call_bad_outcome";

// One inline row that collects the whole "how did it end?" judgment at once:
// what it was (real case / false alarm / right call, bad outcome), why (only
// required for false alarms), whether the lead signed, and who is saying so.
function DispositionForm({
  busy,
  onSave,
  onCancel,
}: {
  busy: boolean;
  onSave: (v: {
    disposition: Disposition;
    fp_reason?: string;
    converted: boolean | null;
    by: string;
  }) => void;
  onCancel: () => void;
}) {
  const [disposition, setDisposition] = React.useState<Disposition>("true_positive");
  const [reason, setReason] = React.useState("");
  const [converted, setConverted] = React.useState(false);
  // This form only mounts after a click, so it is safe to seed the name from
  // localStorage in the initializer (never rendered on the server).
  const [by, setBy] = React.useState(loadSavedName);
  const needsReason = disposition === "false_positive";
  const canSave = by.trim().length > 0 && (!needsReason || reason.trim().length > 0);

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label="How did this end?"
        value={disposition}
        onChange={(e) => setDisposition(e.target.value as Disposition)}
        disabled={busy}
        className={inputClass}
      >
        <option value="true_positive">Real case (true positive)</option>
        <option value="false_positive">False alarm</option>
        <option value="right_call_bad_outcome">Right call, bad outcome</option>
      </select>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
        placeholder={needsReason ? "Why was it a false alarm? (required)" : "Reason (optional)"}
        className={`${inputClass} w-52`}
      />
      <label className="flex items-center gap-1 text-xs text-muted">
        <input
          type="checkbox"
          checked={converted}
          onChange={(e) => setConverted(e.target.checked)}
          disabled={busy}
        />
        signed / converted?
      </label>
      <input
        type="text"
        value={by}
        onChange={(e) => setBy(e.target.value)}
        disabled={busy}
        placeholder="Your name"
        className={`${inputClass} w-28`}
      />
      <Button
        variant="primary"
        size="sm"
        disabled={busy || !canSave}
        onClick={() =>
          onSave({
            disposition,
            fp_reason: needsReason ? reason.trim() : undefined,
            converted: converted ? true : null,
            by: by.trim(),
          })
        }
      >
        Save
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
    </span>
  );
}

export function EscalationRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  // Which inline form is open: asking for a name (ack/actioned with no saved
  // name yet) or the one-row resolve form.
  const [pending, setPending] = React.useState<"ack" | "actioned" | "resolve" | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");

  async function post(action: "ack" | "actioned" | "resolve", by: string) {
    const r = await fetch("/api/escalations/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, by }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "failed");
  }

  async function act(action: "ack" | "actioned", by: string) {
    if (!by.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await post(action, by.trim());
      saveNameForNextTime(by.trim());
      setPending(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  // One click when a name is saved; otherwise reveal the name input inline.
  function start(action: "ack" | "actioned") {
    const saved = loadSavedName();
    if (saved.trim()) {
      void act(action, saved);
    } else {
      setNameDraft("");
      setPending(action);
    }
  }

  // Resolve = one inline row: what it was + reason (false alarms only) +
  // signed? + name. One Save marks the escalation resolved, then records the
  // judgment — same two endpoints, same payloads as before.
  async function resolveWith(v: {
    disposition: Disposition;
    fp_reason?: string;
    converted: boolean | null;
    by: string;
  }) {
    setBusy(true);
    setMsg(null);
    try {
      await post("resolve", v.by);
      const r = await fetch("/api/escalations/disposition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          escalation_id: id,
          disposition: v.disposition,
          fp_reason: v.fp_reason,
          converted: v.converted,
          by: v.by,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "failed");
      saveNameForNextTime(v.by);
      setPending(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (pending === "resolve") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <DispositionForm busy={busy} onSave={resolveWith} onCancel={() => setPending(null)} />
        {msg ? <span className="text-xs text-red">{msg}</span> : null}
      </div>
    );
  }

  if (pending === "ack" || pending === "actioned") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          disabled={busy}
          placeholder="Your name"
          autoFocus
          className={`${inputClass} w-32`}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !nameDraft.trim()}
          onClick={() => act(pending, nameDraft)}
        >
          {pending === "ack" ? "Claim" : "Mark actioned"}
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
      {["fired", "routed", "unclaimed"].includes(status) ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => start("ack")}
          title="Claims this under your name — asked once, then remembered"
        >
          Claim it
        </Button>
      ) : null}
      {status === "acked" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => start("actioned")}
          title="Records the follow-up under your name"
        >
          Mark actioned
        </Button>
      ) : null}
      {["acked", "actioned"].includes(status) ? (
        <Button variant="primary" size="sm" disabled={busy} onClick={() => setPending("resolve")}>
          Resolve…
        </Button>
      ) : null}
      {msg ? <span className="text-xs text-red">{msg}</span> : null}
    </div>
  );
}

// Disposition control for an already-RESOLVED escalation that never got its
// "how did it end?" answer (Phase 5 input). Same one-row inline form; posts
// only the disposition.
export function DispositionControl({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  async function record(v: {
    disposition: Disposition;
    fp_reason?: string;
    converted: boolean | null;
    by: string;
  }) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/escalations/disposition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          escalation_id: id,
          disposition: v.disposition,
          fp_reason: v.fp_reason,
          converted: v.converted,
          by: v.by,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "failed");
      saveNameForNextTime(v.by);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {open ? (
        <DispositionForm busy={busy} onSave={record} onCancel={() => setOpen(false)} />
      ) : (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setOpen(true)}>
          How did it end?
        </Button>
      )}
      {msg ? <span className="text-xs text-red">{msg}</span> : null}
    </span>
  );
}

// One ack-timeout sweep pass. Everything it "sends" is simulated.
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
        `${data.routed} alert${data.routed === 1 ? "" : "s"} advanced · ${data.waterfalled} reached the automatic backstop · ${data.unclaimed} still unclaimed`,
      );
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "sweep failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={sweep}>
          {busy ? "Checking…" : "Check overdue alerts"}
        </Button>
        {result ? <span className="text-xs text-faint tnum">{result}</span> : null}
      </span>
      <span className="text-[11px] text-faint">
        Advances anything past its deadline. Safe to press — all alerting is simulated, nothing
        sends.
      </span>
    </span>
  );
}
