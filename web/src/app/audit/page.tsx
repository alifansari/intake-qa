"use client";

// Leak Audit uploader (public, no-auth). Upload up to 10 calls under
// one session, each processed by the UNCHANGED demo pipeline, then land on the
// shareable /audit/[token] report. Mirrors the demo upload mechanic (storage or
// direct), but every upload carries the session token so the calls aggregate.
// Nothing here can send — it only ever creates demo_calls.

import { useCallback, useRef, useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase/client";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import {
  DELETION_HOURS,
  FOUNDER_NAME,
  FOUNDER_EMAIL,
  AUDIT_CAPACITY_LINE,
  AUDIT_DELIVERABLES,
  GUARANTEE_CANONICAL,
  GUARANTEE_METHODOLOGY,
  CTA_PRIMARY,
} from "@/lib/site-constants";

const MAX = 10;

type Phase = "setup" | "processing" | "error";

export default function AuditUploaderPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [volume, setVolume] = useState("");
  const [consent, setConsent] = useState(false);
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
    if (!consent) {
      setErr("Please confirm your firm has the right and any required consent to share these recordings.");
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
      // Stash the token so a later pricing checkout can pass it as the Stripe
      // client_reference_id (stitches the payer back to this audit).
      try {
        window.sessionStorage.setItem("audit_token", token);
      } catch {
        /* private mode — non-fatal */
      }

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
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="eyebrow">The independent recovery desk · Leak Audit</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink text-balance">
          Your free Leak Audit
        </h1>
        <p className="mt-4 max-w-[66ch] text-lg text-ink-muted">
          Send us up to {MAX} recent intake calls. A real analyst, not just a model, reviews every
          one against our calibrated PI rubric and hands you a written report: the signable cases that
          didn&apos;t sign, the evidence behind each flag, and what that walked-away fee revenue is
          worth in dollars. You keep the report whether or not we ever work together.
        </p>
        <p className="mt-3 text-sm text-faint">{AUDIT_CAPACITY_LINE}</p>
        <p className="mt-3 text-sm">
          <a href="/audit/sample" className="font-semibold text-accent hover:text-accent-hover">
            See a sample report →
          </a>
        </p>

        {/* What you receive */}
        <div className="mt-6 rounded-card border border-hairline bg-surface p-5">
          <p className="text-sm font-semibold text-ink">What you receive</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
            {AUDIT_DELIVERABLES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-muted">
            The audit is free. A real analyst reviews every call, so we take on up to 8 each month.
          </p>
        </div>

        {/* $25,000 find-it-free guarantee — full mechanics, no buried conditions */}
        <div className="mt-4 rounded-card border border-gold/50 bg-gold-tint/40 p-5">
          <p className="text-sm font-semibold text-ink">The $25,000 find-it-free guarantee</p>
          <p className="mt-2 text-sm text-ink-muted">{GUARANTEE_CANONICAL}</p>
          <p className="mt-2 text-xs text-ink-muted">{GUARANTEE_METHODOLOGY}</p>
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
              className="mt-1 block w-40 rounded-base border border-hairline bg-surface px-3 py-2 text-sm"
            />
          </label>

          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line-strong bg-surface p-10 text-center hover:border-accent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <span className="font-display text-lg font-semibold text-ink">
              Drag &amp; drop up to {MAX} recordings
            </span>
            <span className="mt-1 text-sm text-ink-muted">or click to choose files</span>
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
          <details className="rounded-card border border-hairline bg-surface px-4">
            <summary className="cursor-pointer py-3 text-sm font-semibold text-ink">
              Where to get your recordings
            </summary>
            <ul className="space-y-1.5 pb-4 text-sm text-ink-muted">
              <li><b className="text-ink">CallRail:</b> Analytics → Activity → open the call&apos;s timeline → Download MP3.</li>
              <li><b className="text-ink">RingCentral:</b> Admin Portal → Call Log → open the call → download the recording.</li>
              <li><b className="text-ink">8x8:</b> Admin Console → Recordings → select the call → Download.</li>
              <li><b className="text-ink">Dialpad:</b> Conversation History → open the call → three-dot menu → Download (bulk via Analytics → Recordings Export).</li>
              <li><b className="text-ink">Vonage:</b> monitoring/recordings area → download.</li>
              <li className="pt-1 text-ink">No portal access? Your answering service can export these on request. Ask for the inbound intake calls from the last two weeks.</li>
            </ul>
          </details>

          {/* De-risk block: the deal, in plain terms */}
          <div className="rounded-card border border-hairline bg-surface p-5">
            <p className="text-sm font-semibold text-ink">Here&apos;s the deal, in plain terms</p>
            <p className="mt-2 text-sm text-ink-muted">
              You send up to 10 recorded intake calls. We score them and show you, in dollars, how
              much signable fee revenue didn&apos;t convert, with the evidence behind every flag. Your
              recordings and transcripts are purged within {DELETION_HOURS} hours of your readout, and
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
            <ul className="divide-y divide-hairline rounded-card border border-hairline">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="truncate text-ink">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-3 text-xs font-semibold text-alert"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* REQUIRED consent gate — CIPA / Rule 1.18. Upload is blocked until checked. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line-strong bg-surface p-4 text-sm text-ink">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I confirm my firm has the right and any required consent to share these recordings.
            </span>
          </label>

          {err && <p className="text-sm text-alert">{err}</p>}

          <div>
            <button
              type="button"
              onClick={start}
              disabled={files.length === 0 || !consent}
              className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {files.length > 0 ? `${CTA_PRIMARY} (${files.length}/${MAX})` : CTA_PRIMARY}
            </button>
            <p className="mt-3 text-xs text-faint">
              A real analyst reviews every call · Your report to keep · Purged within {DELETION_HOURS} hours
            </p>
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div className="rounded-card border border-hairline bg-surface p-8">
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
        <div className="rounded-card border border-alert bg-red-tint p-6">
          <p className="font-display text-lg font-semibold text-alert">We couldn&apos;t run the audit</p>
          <p className="mt-1 text-sm text-ink">{err}</p>
          <button
            type="button"
            onClick={() => setPhase("setup")}
            className="mt-4 rounded-base border border-hairline bg-surface px-4 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      )}
      </main>
      <Footer />
    </div>
  );
}
