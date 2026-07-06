"use client";

// Intake Quality Audit uploader (public, no-auth). Upload up to 10 calls under
// one session, each processed by the UNCHANGED demo pipeline, then land on the
// shareable /audit/[token] report. Mirrors the demo upload mechanic (storage or
// direct), but every upload carries the session token so the calls aggregate.
// Nothing here can send — it only ever creates demo_calls.

import { useCallback, useRef, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase/client";
import {
  DELETION_DAYS,
  FOUNDER_NAME,
  FOUNDER_EMAIL,
  AUDIT_FREE_LINE,
  AUDIT_CAPACITY_LINE,
  AUDIT_DELIVERABLES,
  GUARANTEE_CANONICAL,
  GUARANTEE_METHODOLOGY,
} from "@/lib/site-constants";

const MAX = 10;

type Phase = "setup" | "processing" | "error";

export default function AuditUploaderPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [volume, setVolume] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setErr(null);
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX));
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, j) => j !== i));

  const uploadOne = useCallback(async (token: string, file: File) => {
    const r = await fetch("/api/demo/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, size: file.size, session: token }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Upload failed.");

    if (data.mode === "storage") {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Storage client unavailable.");
      const { error } = await supabase.storage
        .from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, file);
      if (error) throw new Error(error.message);
      void fetch("/api/demo/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      }).catch(() => {});
    } else {
      // Direct/local: send bytes WITH the session so this row attaches + processes.
      const body = new FormData();
      body.append("file", file);
      body.append("session", token);
      const ur = await fetch("/api/demo/upload", { method: "POST", body });
      const ud = await ur.json();
      if (!ur.ok) throw new Error(ud.error ?? "Upload failed.");
    }
  }, []);

  const pollUntilComplete = useCallback((token: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/audit/status?token=${encodeURIComponent(token)}`);
        const s = await r.json();
        if (!r.ok) return;
        setDone(s.done ?? 0);
        setTotal(s.total ?? 0);
        if (s.complete) {
          if (pollRef.current) clearInterval(pollRef.current);
          window.location.href = `/audit/${token}`;
        }
      } catch {
        /* transient — keep polling */
      }
    }, 2500);
  }, []);

  const start = useCallback(async () => {
    if (files.length === 0) {
      setErr("Add at least one call recording.");
      return;
    }
    setPhase("processing");
    setErr(null);
    setTotal(files.length);
    try {
      const vol = volume.trim() ? Number(volume.trim()) : null;
      const sr = await fetch("/api/audit/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ monthly_call_volume: Number.isFinite(vol) ? vol : null }),
      });
      const sd = await sr.json();
      if (!sr.ok) throw new Error(sd.error ?? "Could not start the audit.");
      const token: string = sd.token;

      // Upload sequentially (gentle on the pipeline), then poll to completion.
      for (const file of files) {
        await uploadOne(token, file);
      }
      pollUntilComplete(token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  }, [files, volume, uploadOne, pollUntilComplete]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <p className="eyebrow">The independent recovery desk · Intake Quality Audit</p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Your free Intake Quality Audit
        </h1>
        <p className="mt-2 text-muted">
          Send us up to {MAX} recent intake calls. A real analyst, not just a model, reviews every
          one against our calibrated PI rubric and hands you a written report: the signable cases that
          didn&apos;t sign, the evidence behind each flag, and what that walked-away fee revenue is
          worth in dollars. You keep the report whether or not we ever work together.
        </p>
        <p className="mt-2 text-sm text-faint">{AUDIT_CAPACITY_LINE}</p>
        <p className="mt-3 text-sm">
          <a href="/audit/sample" className="font-semibold text-accent hover:text-accent-hover">
            See a sample report →
          </a>
        </p>

        {/* What you receive */}
        <div className="mt-6 rounded-sm border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">What you receive</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
            {AUDIT_DELIVERABLES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            The audit is free. A real analyst reviews every call, so we take on up to 8 each month.
          </p>
        </div>

        {/* $25,000 find-it-free guarantee — full mechanics, no buried conditions */}
        <div className="mt-4 rounded-sm border border-gold/50 bg-gold-tint/40 p-4">
          <p className="text-sm font-semibold text-ink">The $25,000 find-it-free guarantee</p>
          <p className="mt-2 text-sm text-muted">{GUARANTEE_CANONICAL}</p>
          <p className="mt-2 text-xs text-muted">{GUARANTEE_METHODOLOGY}</p>
          <p className="mt-2 text-xs text-faint">
            Full methodology and our model&apos;s precision/recall are on the{" "}
            <a href="/honesty" className="font-semibold text-navy underline">calibration page</a>.
          </p>
        </div>
      </div>

      {phase === "setup" && (
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Roughly how many intake calls do you take a month?
            </span>
            <span className="ml-2 text-xs text-faint">optional, we&apos;ll assume 100 if skipped</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="e.g. 120"
              className="mt-1 block w-40 rounded-sm border border-line bg-paper px-3 py-2 text-sm"
            />
          </label>

          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line-strong bg-paper p-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <span className="font-display text-lg font-semibold text-ink">
              Drag &amp; drop up to {MAX} recordings
            </span>
            <span className="mt-1 text-sm text-muted">or click to choose files</span>
            <span className="mt-3 text-xs text-faint">MP3, M4A, or WAV · up to 25MB each</span>
            <input
              type="file"
              multiple
              accept=".mp3,.m4a,.wav,audio/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>

          {/* Where to get your recordings (Change 4) */}
          <details className="rounded-sm border border-line bg-paper px-4">
            <summary className="cursor-pointer py-3 text-sm font-semibold text-ink">
              Where to get your recordings
            </summary>
            <ul className="space-y-1.5 pb-4 text-sm text-muted">
              <li><b className="text-ink">CallRail:</b> Analytics → Activity → open the call&apos;s timeline → Download MP3.</li>
              <li><b className="text-ink">RingCentral:</b> Admin Portal → Call Log → open the call → download the recording.</li>
              <li><b className="text-ink">8x8:</b> Admin Console → Recordings → select the call → Download.</li>
              <li><b className="text-ink">Dialpad:</b> Conversation History → open the call → three-dot menu → Download (bulk via Analytics → Recordings Export).</li>
              <li><b className="text-ink">Vonage:</b> monitoring/recordings area → download.</li>
              <li className="pt-1 text-ink">No portal access? Your answering service can export these on request. Ask for the inbound intake calls from the last two weeks.</li>
            </ul>
          </details>

          {/* De-risk block: the deal, in plain terms */}
          <div className="rounded-sm border border-line bg-paper p-4">
            <p className="text-sm font-semibold text-ink">Here&apos;s the deal, in plain terms</p>
            <p className="mt-2 text-sm text-muted">
              You send up to 10 recorded intake calls. We score them and show you, in dollars, how
              much signable fee revenue didn&apos;t convert, with the evidence behind every flag. Your
              recordings and transcripts are deleted within {DELETION_DAYS} days of your readout, and
              immediately if you ask in writing. Nothing is ever texted to anyone. One person is
              accountable for your data and your audit: {FOUNDER_NAME}, founder of Intake QA,{" "}
              <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-navy underline">
                {FOUNDER_EMAIL}
              </a>
              . You get a report you can keep. You decide what to do next.
            </p>
            <p className="mt-2 text-xs text-faint">
              These are your prospective clients&apos; confidential communications (Cal. Rule 1.18),
              and we treat them that way. The named providers we use and their security postures are
              on the <a href="/security" className="font-semibold text-navy underline">security page</a>.
            </p>
          </div>

          {files.length > 0 && (
            <ul className="divide-y divide-line rounded-sm border border-line">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="truncate text-ink">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-3 text-xs font-semibold text-red"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {err && <p className="text-sm text-red">{err}</p>}

          <button
            type="button"
            onClick={start}
            disabled={files.length === 0}
            className="rounded-sm bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Start my Leak Audit ({files.length}/{MAX})
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="rounded-lg border border-line bg-paper p-8">
          <p className="eyebrow mb-3">Auditing your calls</p>
          <p className="text-ink">
            Scored <span className="font-semibold">{done}</span> of{" "}
            <span className="font-semibold">{total}</span> calls…
          </p>
          <p className="mt-4 text-xs text-faint">
            Each call takes a minute or two to transcribe and score. This page will open your
            report automatically when it&apos;s ready.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-lg border border-red bg-red-tint p-6">
          <p className="font-display text-lg font-semibold text-red">We couldn&apos;t run the audit</p>
          <p className="mt-1 text-sm text-ink">{err}</p>
          <button
            type="button"
            onClick={() => setPhase("setup")}
            className="mt-4 rounded-sm border border-line bg-paper px-4 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
