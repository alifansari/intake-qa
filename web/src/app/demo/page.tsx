"use client";

// Public Demo Mode — upload one call, watch it get transcribed + scored + flagged
// in under 5 minutes. No account, no CallRail, no A2P. Three states: upload ->
// processing (staged, driven by real /api/demo/status) -> results (print-clean).
// Nothing is ever sent from demo mode; the draft is a WATERMARKED preview only.

import { useCallback, useEffect, useRef, useState } from "react";

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
  { key: "done", label: "Checking for a leaked signable case…" },
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

  const upload = useCallback(
    async (file: File) => {
      setErrorMsg(null);
      setPhase("processing");
      setStatus({ id: "", status: "queued", error: null, audioDeleted: false, result: null });
      const body = new FormData();
      body.append("file", file);
      try {
        const r = await fetch("/api/demo/upload", { method: "POST", body });
        const data = await r.json();
        if (!r.ok) {
          setErrorMsg(data.error ?? "Upload failed.");
          setPhase("error");
          return;
        }
        poll(data.id);
      } catch {
        setErrorMsg("Upload failed — check your connection.");
        setPhase("error");
      }
    },
    [poll],
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
        <p className="eyebrow">Intake QA · Live demo</p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Score one of your intake calls
        </h1>
        <p className="mt-2 text-muted">
          Upload a single call recording. In a few minutes you&apos;ll see how it scored, whether it
          was a signable case your team let slip, and the exact re-engagement text we&apos;d draft —
          all with a human approving every send in the real product.
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
        <Stat label="Overall handling" value={result.overallScore == null ? "—" : String(result.overallScore)}
          sub={BAND_LABEL[result.scoreBand] ?? result.scoreBand} />
        <Stat label="Case signability" value={SIGNABILITY_LABEL[result.signability] ?? result.signability}
          sub={`signability ${result.signabilityScore}/100`} />
        <Stat label="Did your team ask?" value={result.askMade == null ? "—" : result.askMade ? "Yes" : "No ask"}
          sub={`outcome: ${result.conversionOutcome}`} tone={result.askMade === false ? "red" : "ink"} />
      </div>

      {/* Leaked banner or honest no-leak */}
      {result.leaked ? (
        <div className="rounded-lg border-2 border-red bg-red-tint p-6">
          <p className="font-display text-xl font-bold text-red">
            Leaked signable case — estimated fee at risk: {money(result.feeAtRisk)}
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
          <p className="font-display text-lg font-semibold text-green">No leaked case found</p>
          <p className="mt-1 text-sm text-muted">{result.reason}</p>
          <p className="mt-2 text-xs text-faint">
            That&apos;s the product being honest — it only flags genuinely signable cases your team
            didn&apos;t close, so you never text the wrong lead.
          </p>
        </div>
      )}

      {/* Draft preview — watermarked, never sent */}
      {result.leaked && result.draftPreview && (
        <div className="rounded-lg border border-line bg-paper p-6">
          <p className="eyebrow">Re-engagement text we&apos;d draft</p>
          <div className="mt-2 rounded-md border border-line bg-canvas p-4 text-sm text-ink">
            {result.draftPreview}
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber">
            {result.draftWatermark}
          </p>
          <p className="mt-1 text-xs text-faint">
            In the real product a human approves, edits, or rejects every message before it can be
            sent.
          </p>
        </div>
      )}

      <RetentionNote audioDeleted={audioDeleted} />
      <EmailCapture demoCallId={demoCallId} />
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
        Thanks — we&apos;ll send this report to your inbox.
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
