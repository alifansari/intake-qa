"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { CONSENT_ATTESTATION_TEXT, CONSENT_TEXT_VERSION } from "@/lib/studio/consent";
import type { StudioFirm } from "@/lib/studio/data";

const inputClass =
  "w-full rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink focus:border-accent focus:outline-none";

type Phase = "idle" | "uploading" | "processing" | "error";

export function NewLeakAudit({ firms }: { firms: StudioFirm[] }) {
  const router = useRouter();
  const [firmId, setFirmId] = React.useState<string>(firms[0]?.id ?? "");
  const [creatingFirm, setCreatingFirm] = React.useState(firms.length === 0);
  const [newFirmName, setNewFirmName] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canUpload = Boolean((firmId || newFirmName.trim()) && consent && phase === "idle");

  async function ensureFirmId(): Promise<string> {
    if (firmId) return firmId;
    const r = await fetch("/api/studio/firms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newFirmName.trim() }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Could not create firm.");
    return data.firm.id as string;
  }

  const upload = React.useCallback(
    async (file: File) => {
      setError(null);
      // Consent is enforced server-side too, but block early for a clear message.
      if (!consent) {
        setError("You must confirm all-party consent before uploading.");
        return;
      }
      setPhase("uploading");
      try {
        const resolvedFirmId = await ensureFirmId();

        const r = await fetch("/api/studio/recordings/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firm_id: resolvedFirmId,
            filename: file.name,
            size: file.size,
            consent_attested: true,
            consent_text: CONSENT_ATTESTATION_TEXT,
            consent_text_version: CONSENT_TEXT_VERSION,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Upload could not start.");

        const supabase = getSupabaseBrowser();
        if (!supabase) throw new Error("Storage client unavailable.");
        const { error: upErr } = await supabase.storage
          .from(data.bucket)
          .uploadToSignedUrl(data.path, data.token, file);
        if (upErr) throw new Error(upErr.message);

        // Kick off transcribe -> frozen scoring on the server (M5). The recording
        // page polls for the result.
        setPhase("processing");
        void fetch(`/api/studio/recordings/${data.recordingId}/process`, {
          method: "POST",
        }).catch(() => {});
        router.push(`/studio/recordings/${data.recordingId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consent, firmId, newFirmName, router],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <Card className="border-accent/30">
      <CardContent className="flex flex-col gap-4 py-6">
        {/* Firm select / create */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink">Firm</label>
          {firms.length > 0 && !creatingFirm ? (
            <div className="flex items-center gap-2">
              <select
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                className={inputClass}
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="whitespace-nowrap text-xs text-muted underline hover:text-ink"
                onClick={() => {
                  setCreatingFirm(true);
                  setFirmId("");
                }}
              >
                New firm
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                placeholder="Firm name"
                value={newFirmName}
                onChange={(e) => setNewFirmName(e.target.value)}
              />
              {firms.length > 0 ? (
                <button
                  type="button"
                  className="whitespace-nowrap text-xs text-muted underline hover:text-ink"
                  onClick={() => {
                    setCreatingFirm(false);
                    setFirmId(firms[0]?.id ?? "");
                  }}
                >
                  Pick existing
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Consent gate — NON-optional. No upload without it. */}
        <label className="flex items-start gap-2 rounded-sm border border-line bg-canvas p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>{CONSENT_ATTESTATION_TEXT}</span>
        </label>

        {/* The prominent upload target. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-8 text-center transition-colors",
            dragOver ? "border-accent bg-accent-tint" : "border-line-strong bg-paper",
            canUpload ? "" : "opacity-60",
          ].join(" ")}
        >
          <p className="text-sm font-medium text-ink">
            Upload the firm’s recorded intake call
          </p>
          <p className="text-xs text-muted">MP3, M4A, or WAV. Drag &amp; drop or choose a file.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,audio/*"
            className="hidden"
            onChange={onPick}
          />
          <Button
            variant="primary"
            type="button"
            disabled={!canUpload}
            onClick={() => fileInputRef.current?.click()}
          >
            {phase === "uploading"
              ? "Uploading…"
              : phase === "processing"
                ? "Processing…"
                : "Choose file"}
          </Button>
          {!consent ? (
            <p className="text-xs text-faint">Confirm consent above to enable upload.</p>
          ) : null}
        </div>

        {error ? <p className="text-xs text-red">{error}</p> : null}
        <p className="text-xs text-faint">
          Audio goes to a private, access-controlled store and is deleted right after it is
          transcribed. Only the firm’s own consented recordings belong here.
        </p>
      </CardContent>
    </Card>
  );
}
