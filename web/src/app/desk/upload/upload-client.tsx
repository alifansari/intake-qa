"use client";

// The interactive uploader for /desk/upload. Mirrors the Leak Audit uploader
// mechanic (signed-URL storage mode, direct fallback) but firm-scoped and fed
// into the REAL scoring pipeline. Per-file status is polled from
// GET /api/desk/uploads — the same rows the pipeline writes, so the status can
// never drift from reality: waiting -> scoring -> done | failed.
// Audience: non-technical law-firm staff. Plain words, generous errors.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "../../../lib/supabase/client";

type UploadRow = {
  id: string;
  filename: string;
  status: "waiting" | "scoring" | "done" | "failed" | string;
  uploaded_at: string | null;
};

// Files being uploaded right now (before they have a call row).
type LocalFile = {
  key: string;
  filename: string;
  state: "uploading" | "sent" | "error";
  error?: string;
};

const STATUS_COPY: Record<string, { label: string; tone: "busy" | "ok" | "bad" }> = {
  waiting: { label: "Uploaded — in line to be read (usually a few minutes)", tone: "busy" },
  scoring: { label: "Read in full — scoring the intake handling…", tone: "busy" },
  done: { label: "Scored ✓ — anything that needs action is on Missed cases", tone: "ok" },
  failed: {
    label:
      "We hit a problem with this file — we've been notified. Try re-exporting it as an MP3, or email it to ali@plaintiffops.com.",
    tone: "bad",
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function UploadClient() {
  const [consent, setConsent] = useState(false);
  const [locals, setLocals] = useState<LocalFile[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [maxMb, setMaxMb] = useState<number | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/desk/uploads");
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data.uploads)) setUploads(data.uploads);
      if (typeof data.max_bytes === "number") setMaxMb(Math.floor(data.max_bytes / 1048576));
      setLoadErr(null);
    } catch {
      /* transient — keep whatever we have */
    }
  }, []);

  // Load the recent list once (deferred a tick — effects shouldn't set state
  // synchronously), then poll while anything is still in flight so the page is
  // honest without a manual refresh.
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);
  useEffect(() => {
    const active =
      busy || uploads.some((u) => u.status === "waiting" || u.status === "scoring");
    if (!active) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => void refresh(), 4000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [busy, uploads, refresh]);

  const uploadOne = useCallback(async (file: File, key: string) => {
    const start = await fetch("/api/desk/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, size: file.size, consent_attested: true }),
    });
    const plan = await start.json();
    if (!start.ok) throw new Error(plan.error ?? "Upload failed.");

    if (plan.mode === "storage") {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Upload client unavailable — please reload the page.");
      const { error } = await supabase.storage
        .from(plan.bucket)
        .uploadToSignedUrl(plan.path, plan.token, file);
      if (error) throw new Error("The upload didn't finish — please try again.");
      const done = await fetch("/api/desk/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: plan.path, filename: file.name, consent_attested: true }),
      });
      const dd = await done.json();
      if (!done.ok) throw new Error(dd.error ?? "Upload failed.");
    } else {
      if (typeof plan.max_bytes === "number" && file.size > plan.max_bytes) {
        throw new Error(
          `That file is ${Math.round(file.size / 1048576)}MB and the limit here is ${Math.floor(
            plan.max_bytes / 1048576,
          )}MB — try re-exporting it as an MP3, or email it to ali@plaintiffops.com.`,
        );
      }
      const body = new FormData();
      body.append("file", file);
      body.append("consent_attested", "true");
      const r = await fetch("/api/desk/uploads/direct", { method: "POST", body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Upload failed.");
    }
    void key;
  }, []);

  const addFiles = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      if (!consent) {
        setLoadErr("First, check the consent box below — then add your files.");
        return;
      }
      setLoadErr(null);
      setBusy(true);
      const files = Array.from(list);
      for (const file of files) {
        const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setLocals((prev) => [...prev, { key, filename: file.name, state: "uploading" }]);
        try {
          await uploadOne(file, key);
          setLocals((prev) => prev.filter((l) => l.key !== key));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed.";
          setLocals((prev) =>
            prev.map((l) => (l.key === key ? { ...l, state: "error", error: msg } : l)),
          );
        }
      }
      await refresh();
      setBusy(false);
    },
    [consent, uploadOne, refresh],
  );

  return (
    <div className="space-y-5">
      {/* REQUIRED consent gate — CIPA §632 (California is all-party consent). */}
      <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line-strong bg-surface p-4 text-sm text-ink">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          I confirm these calls were recorded with any consent the law requires, and my firm has
          the right to share them with Intake QA.
        </span>
      </label>

      <label
        className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed p-10 text-center ${
          consent
            ? "cursor-pointer border-line-strong bg-surface hover:border-accent"
            : "cursor-not-allowed border-hairline bg-canvas opacity-60"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addFiles(e.dataTransfer.files);
        }}
      >
        <span className="font-display text-lg font-semibold text-ink">
          Drag &amp; drop call recordings
        </span>
        <span className="mt-1 text-sm text-ink-muted">or click to choose files</span>
        <span className="mt-3 text-xs text-faint">
          MP3, M4A, or WAV{maxMb ? ` · up to ${maxMb}MB each` : ""}
        </span>
        <input
          type="file"
          multiple
          accept=".mp3,.m4a,.wav,audio/*"
          className="hidden"
          disabled={!consent}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {loadErr && <p className="text-sm text-alert">{loadErr}</p>}

      {/* Files uploading right now, plus any that failed BEFORE a call row existed. */}
      {locals.length > 0 && (
        <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {locals.map((l) => (
            <li key={l.key} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span
                className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                  l.state === "error" ? "bg-alert" : "animate-pulse bg-amber"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{l.filename}</span>
                <span className={`block text-xs ${l.state === "error" ? "text-alert" : "text-ink-muted"}`}>
                  {l.state === "error" ? l.error : "Uploading…"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Everything this firm has uploaded, with its honest pipeline status. */}
      {uploads.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Your uploads</h2>
          <ul className="mt-3 divide-y divide-hairline rounded-card border border-hairline bg-surface">
            {uploads.map((u) => {
              const copy = STATUS_COPY[u.status] ?? STATUS_COPY.waiting;
              return (
                <li key={u.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                      copy.tone === "ok"
                        ? "bg-accent"
                        : copy.tone === "bad"
                          ? "bg-alert"
                          : "animate-pulse bg-amber"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{u.filename}</span>
                    <span
                      className={`block text-xs ${copy.tone === "bad" ? "text-alert" : "text-ink-muted"}`}
                    >
                      {copy.label}
                    </span>
                  </span>
                  <span className="ml-2 flex-none text-xs text-faint tnum">
                    {timeAgo(u.uploaded_at)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-faint">
            This list updates by itself while calls are being read. Scored calls that need action
            appear on{" "}
            <a href="/desk/queue" className="font-medium text-accent hover:text-accent-hover">
              Missed cases
            </a>{" "}
            the same day.
          </p>
        </div>
      )}

      <div className="rounded-card border border-hairline bg-canvas p-4">
        <p className="text-xs text-faint">
          Where to get recordings: CallRail (Analytics → Activity → open a call → Download MP3),
          RingCentral (Admin Portal → Call Log), Dialpad (Conversation History), or ask your
          answering service to export them. Stuck? Email{" "}
          <a
            href="mailto:ali@plaintiffops.com"
            className="font-medium text-accent hover:text-accent-hover"
          >
            ali@plaintiffops.com
          </a>{" "}
          — we&apos;ll take the files any way you can send them. Recordings are deleted as soon as
          they&apos;re transcribed.
        </p>
      </div>
    </div>
  );
}
