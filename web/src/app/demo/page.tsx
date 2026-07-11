"use client";

// Public Demo Mode: upload one call, watch it get transcribed + scored + flagged
// in under 5 minutes. No account, no CallRail, no A2P. Three states: upload ->
// processing (staged, driven by real /api/demo/status) -> results (print-clean).
// Nothing is ever sent from demo mode; the draft is a WATERMARKED preview only.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase/client";

type SolResult = {
  applicable: string | null;
  statute: string | null;
  ruleLabel?: string | null;
  periodLabel: string | null;
  incidentDate: string | null;
  deadlineDate: string | null;
  daysRemaining: number | null;
  urgency: "expired" | "critical" | "soon" | "ok" | "unknown";
  minorTollingMayApply: boolean;
  notes: string[];
  disclaimer: string;
};

type CaseSummary = {
  caller_name: string | null;
  callback_number: string | null;
  case_type: string | null;
  incident_summary: string | null;
  injuries: string[];
  treatment: string[];
  liability_notes: string[];
  key_facts: string[];
  open_questions: string[];
  urgency_flags: string[];
  disclaimer: string;
};

type DemoResult = {
  overallScore: number | null;
  scoreBand: string;
  signability: string;
  signabilityScore: number;
  conversionOutcome: string;
  askMade: boolean | null;
  leaked: boolean;
  reason: string;
  evidenceQuotes: string[];
  feeAtRisk: number;
  feeBasis: string;
  summary: string | null;
  draftPreview: string | null;
  draftWatermark: string;
  sol: SolResult | null;
  caseSummary: CaseSummary | null;
};

type Status = {
  id: string;
  status: "queued" | "transcribing" | "scoring" | "done" | "error";
  error: string | null;
  audioDeleted: boolean;
  result: DemoResult | null;
};

const STAGES: { key: string; label: string }[] = [
  { key: "transcribing", label: "Transcribing the call…" },
  { key: "scoring", label: "Scoring against the PI intake rubric…" },
  { key: "done", label: "Checking for a lost signable case…" },
];

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const BAND_LABEL: Record<string, string> = {
  strong: "Strong call",
  moderate: "Moderate call",
  weak: "Weak call",
  unknown: "Unscored",
};

const SIGNABILITY_LABEL: Record<string, string> = {
  likely_signable: "Likely signable",
  needs_development: "Needs development",
  likely_declinable: "Likely declinable",
  unknown: "Unclear",
};

export default function DemoPage() {
  const [phase, setPhase] = useState<"upload" | "processing" | "results" | "error">("upload");
  const [status, setStatus] = useState<Status | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const poll = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/demo/status?id=${encodeURIComponent(id)}`);
        const s: Status = await r.json();
        setStatus(s);
        if (s.status === "done") {
          stopPolling();
          setPhase("results");
        } else if (s.status === "error") {
          stopPolling();
          setErrorMsg(s.error ?? "Processing failed.");
          setPhase("error");
        }
      } catch {
        /* keep polling; transient */
      }
    }, 2000);
  }, []);

  // Deep-link: /demo?id=... loads an existing result.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      setPhase("processing");
      poll(id);
    }
    return stopPolling;
  }, [poll]);

  // Legacy path (local dev / no Supabase Storage): stream the bytes through the
  // server. Fine on a long-lived Node server; fails on Vercel (4.5MB body cap).
  const uploadDirect = useCallback(
    async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/demo/upload", { method: "POST", body });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed.");
      return String(data.id);
    },
    [],
  );

  const upload = useCallback(
    async (file: File) => {
      setErrorMsg(null);
      setPhase("processing");
      setStatus({ id: "", status: "queued", error: null, audioDeleted: false, result: null });
      try {
        // Step 1: create the demo row + decide upload mode.
        const r = await fetch("/api/demo/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name, size: file.size }),
        });
        const data = await r.json();
        if (!r.ok) {
          setErrorMsg(data.error ?? "Upload failed.");
          setPhase("error");
          return;
        }

        if (data.mode === "storage") {
          // Step 2: upload the file DIRECTLY to Supabase Storage (bypasses the
          // Vercel body limit), then kick off server-side processing.
          const supabase = getSupabaseBrowser();
          if (!supabase) throw new Error("Storage client unavailable.");
          const { error: upErr } = await supabase.storage
            .from(data.bucket)
            .uploadToSignedUrl(data.path, data.token, file);
          if (upErr) throw new Error(upErr.message);
          // Fire processing; no need to await its body. The poll surfaces result.
          void fetch("/api/demo/process", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: data.id }),
          }).catch(() => {});
          poll(data.id);
        } else {
          // Local / direct fallback.
          const id = await uploadDirect(file);
          poll(id);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Upload failed. Check your connection.");
        setPhase("error");
      }
    },
    [poll, uploadDirect],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="no-print mb-8">
        <p className="eyebrow">
          <a href="/" className="hover:text-ink">Intake QA</a> · Live demo
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Score one of your intake calls
        </h1>
        <p className="mt-2 text-muted">
          Upload a single call recording. In a few minutes you&apos;ll see how it scored, whether it
          was a signable case your team let slip, and the same-day callback script we&apos;d hand
          your staff. We never contact your callers.
        </p>
        <p className="mt-2 text-sm text-muted">
          No recording handy? Start with the{" "}
          <a href="/audit" className="underline hover:text-ink">free Leak Audit</a> on a batch of
          real calls.
        </p>
      </div>

      {phase === "upload" && (
        <UploadCard dragOver={dragOver} setDragOver={setDragOver} onDrop={onDrop} onPick={upload} />
      )}
      {phase === "processing" && <Processing status={status} />}
      {phase === "error" && <ErrorCard message={errorMsg} onRetry={() => setPhase("upload")} />}
      {phase === "results" && status?.result && (
        <Results result={status.result} audioDeleted={status.audioDeleted} demoCallId={status.id} />
      )}
    </div>
  );
}

function UploadCard({
  dragOver,
  setDragOver,
  onDrop,
  onPick,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onPick: (f: File) => void;
}) {
  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? "border-navy bg-navy-tint" : "border-line-strong bg-paper"
        }`}
      >
        <span className="font-display text-lg font-semibold text-ink">
          Drag &amp; drop a call recording
        </span>
        <span className="mt-1 text-sm text-muted">or click to choose a file</span>
        <span className="mt-3 text-xs text-faint">MP3, M4A, or WAV · up to 25MB · 20 min max</span>
        <input
          type="file"
          accept=".mp3,.m4a,.wav,audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
      </label>
      <RetentionNote />
    </div>
  );
}

function Processing({ status }: { status: Status | null }) {
  const current = status?.status ?? "queued";
  const activeIndex =
    current === "queued" || current === "transcribing" ? 0 : current === "scoring" ? 1 : 2;
  return (
    <div className="rounded-lg border border-line bg-paper p-8">
      <p className="eyebrow mb-4">Working on your call</p>
      <ul className="space-y-3">
        {STAGES.map((s, i) => {
          const done = i < activeIndex || current === "done";
          const active = i === activeIndex && current !== "done";
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  done ? "bg-green text-white" : active ? "bg-navy text-white" : "bg-line text-faint"
                }`}
              >
                {done ? "✓" : active ? "●" : i + 1}
              </span>
              <span className={active ? "text-ink" : done ? "text-muted" : "text-faint"}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-faint">
        This usually takes a couple of minutes. Your audio is deleted the moment it&apos;s
        transcribed.
      </p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-8 text-center">
      <p className="font-display text-lg font-semibold text-red">We couldn&apos;t process that call</p>
      <p className="mt-2 text-sm text-muted">{message ?? "Something went wrong."}</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
      >
        Try another call
      </button>
    </div>
  );
}

function Results({
  result,
  audioDeleted,
  demoCallId,
}: {
  result: DemoResult;
  audioDeleted: boolean;
  demoCallId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <p className="eyebrow">Your call score</p>
        <button
          onClick={() => window.print()}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-canvas"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Score + verdicts */}
      <div className="grid gap-4 rounded-lg border border-line bg-paper p-6 sm:grid-cols-3">
        <Stat label="Overall handling" value={result.overallScore == null ? "-" : String(result.overallScore)}
          sub={BAND_LABEL[result.scoreBand] ?? result.scoreBand} />
        <Stat label="Case signability" value={SIGNABILITY_LABEL[result.signability] ?? result.signability}
          sub={`signability ${result.signabilityScore}/100`} />
        <Stat label="Did your team ask?" value={result.askMade == null ? "-" : result.askMade ? "Yes" : "No ask"}
          sub={`outcome: ${result.conversionOutcome}`} tone={result.askMade === false ? "red" : "ink"} />
      </div>

      {/* Signable-case banner or honest none-walked */}
      {result.leaked ? (
        <div className="rounded-lg border-2 border-red bg-red-tint p-6">
          <p className="font-display text-xl font-bold text-red">
            Signable case that walked. Estimated fee at risk: {money(result.feeAtRisk)}
          </p>
          <p className="mt-1 text-xs text-red/80">basis: {result.feeBasis}</p>
          {result.evidenceQuotes.length > 0 && (
            <div className="mt-4">
              <p className="eyebrow">Why we flagged it</p>
              <ul className="mt-2 space-y-2">
                {result.evidenceQuotes.map((q, i) => (
                  <li key={i} className="border-l-2 border-red pl-3 text-sm italic text-ink">“{q}”</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-green-tint p-6">
          <p className="font-display text-lg font-semibold text-green">No signable case walked</p>
          <p className="mt-1 text-sm text-muted">{result.reason}</p>
          <p className="mt-2 text-xs text-faint">
            That&apos;s the product being honest. It only flags genuinely signable cases your team
            didn&apos;t close, so you never text the wrong lead.
          </p>
        </div>
      )}

      {/* Draft preview: watermarked, never sent */}
      {result.leaked && result.draftPreview && (
        <div className="rounded-lg border border-line bg-paper p-6">
          <p className="eyebrow">The callback script we&apos;d hand your staff</p>
          <div className="mt-2 rounded-md border border-line bg-canvas p-4 text-sm text-ink">
            {result.draftPreview}
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber">
            {result.draftWatermark}
          </p>
          <p className="mt-1 text-xs text-faint">
            Your own staff make every callback; we never contact your callers.
          </p>
        </div>
      )}

      {result.sol && <DeadlineWatch sol={result.sol} />}
      {result.caseSummary && <CaseReadySummary summary={result.caseSummary} />}

      <RetentionNote audioDeleted={audioDeleted} />
      <EmailCapture demoCallId={demoCallId} />
    </div>
  );
}

const URGENCY_STYLE: Record<string, { box: string; text: string; label: string }> = {
  expired: { box: "border-2 border-red bg-red-tint", text: "text-red", label: "Deadline may have passed" },
  critical: { box: "border-2 border-red bg-red-tint", text: "text-red", label: "Critical, act now" },
  soon: { box: "border-2 border-amber bg-amber-tint", text: "text-amber", label: "Approaching" },
  ok: { box: "border border-line bg-green-tint", text: "text-green", label: "On track" },
  unknown: { box: "border border-line bg-paper", text: "text-muted", label: "Not enough info" },
};

function DeadlineWatch({ sol }: { sol: SolResult }) {
  const style = URGENCY_STYLE[sol.urgency] ?? URGENCY_STYLE.unknown;
  return (
    <div className={`rounded-lg p-6 ${style.box}`}>
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Deadline watch: statute of limitations</p>
        <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{style.label}</span>
      </div>
      {sol.deadlineDate ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="eyebrow">Estimated deadline</p>
            <p className={`font-display text-2xl font-bold tnum ${style.text}`}>{sol.deadlineDate}</p>
          </div>
          <div>
            <p className="eyebrow">Days remaining</p>
            <p className={`font-display text-2xl font-bold tnum ${style.text}`}>
              {sol.daysRemaining == null ? "-" : sol.daysRemaining}
            </p>
          </div>
          <div>
            <p className="eyebrow">Applicable rule</p>
            <p className="text-sm text-ink">{sol.ruleLabel ?? sol.applicable ?? "-"}</p>
            {sol.statute && <p className="mt-0.5 text-xs text-muted">{sol.statute}</p>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          We couldn&apos;t compute a deadline. No incident date was clear on the call.
        </p>
      )}
      {sol.notes.length > 0 && (
        <ul className="mt-4 space-y-1">
          {sol.notes.map((n, i) => (
            <li key={i} className="text-sm text-ink">• {n}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs italic text-faint">{sol.disclaimer}</p>
    </div>
  );
}

function CaseReadySummary({ summary }: { summary: CaseSummary }) {
  const [copied, setCopied] = useState(false);
  const lines: string[] = [];
  const add = (label: string, val: string | null) => { if (val) lines.push(`${label}: ${val}`); };
  const addList = (label: string, items: string[]) => {
    if (items.length) { lines.push(`${label}:`); items.forEach((x) => lines.push(`  - ${x}`)); }
  };
  add("Caller", summary.caller_name);
  add("Callback", summary.callback_number);
  add("Case type", summary.case_type);
  add("Incident", summary.incident_summary);
  addList("Injuries", summary.injuries);
  addList("Treatment", summary.treatment);
  addList("Liability notes", summary.liability_notes);
  addList("Key facts", summary.key_facts);
  addList("Open questions", summary.open_questions);
  addList("Urgency flags", summary.urgency_flags);
  const memoText = `INTAKE MEMO\n\n${lines.join("\n")}\n\n${summary.disclaimer}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(memoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const Field = ({ label, value }: { label: string; value: string | null }) =>
    value ? (
      <div>
        <p className="eyebrow">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    ) : null;

  const ListField = ({ label, items }: { label: string; items: string[] }) =>
    items.length ? (
      <div>
        <p className="eyebrow">{label}</p>
        <ul className="mt-1 space-y-0.5">
          {items.map((x, i) => (
            <li key={i} className="text-sm text-ink">• {x}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="rounded-lg border border-line bg-paper p-6">
      <div className="no-print flex items-center justify-between">
        <p className="eyebrow">Case-ready summary</p>
        <button
          onClick={copy}
          className="rounded-md border border-line-strong px-3 py-1.5 text-xs text-ink hover:bg-canvas"
        >
          {copied ? "Copied ✓" : "Copy memo"}
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <Field label="Caller" value={summary.caller_name} />
        <Field label="Callback number" value={summary.callback_number} />
        <Field label="Case type" value={summary.case_type} />
        <Field label="Incident" value={summary.incident_summary} />
        <ListField label="Injuries" items={summary.injuries} />
        <ListField label="Treatment" items={summary.treatment} />
        <ListField label="Liability notes" items={summary.liability_notes} />
        <ListField label="Key facts" items={summary.key_facts} />
        <ListField label="Open questions" items={summary.open_questions} />
        <ListField label="Urgency flags" items={summary.urgency_flags} />
      </div>
      <p className="mt-4 text-xs italic text-faint">{summary.disclaimer}</p>
    </div>
  );
}

function Stat({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "red" }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={`font-display text-2xl font-bold tnum ${tone === "red" ? "text-red" : "text-ink"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function RetentionNote({ audioDeleted = false }: { audioDeleted?: boolean }) {
  return (
    <p className="mt-4 text-center text-xs text-faint">
      {audioDeleted ? "Your audio has already been deleted. " : "Your audio is deleted the moment it's transcribed. "}
      The transcript and this report are automatically purged after 72 hours. Recordings and
      transcripts are treated as confidential.
    </p>
  );
}

function EmailCapture({ demoCallId }: { demoCallId: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setErr(null);
    try {
      const r = await fetch("/api/demo/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, demoCallId }),
      });
      if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Please enter a valid email."); return; }
      setSent(true);
    } catch {
      setErr("Something went wrong.");
    }
  };
  if (sent) {
    return (
      <div className="no-print rounded-lg border border-line bg-paper p-5 text-center text-sm text-green">
        Thanks. We&apos;ll send this report to your inbox.
      </div>
    );
  }
  return (
    <div className="no-print rounded-lg border border-line bg-paper p-5">
      <p className="text-sm font-medium text-ink">Email me this report</p>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourfirm.com"
          className="flex-1 rounded-md border border-line-strong px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
        >
          Send
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-red">{err}</p>}
    </div>
  );
}
