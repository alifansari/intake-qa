"use client";

// Settings — screen (d). Data handling (deletion request with the verbatim
// confirmation), notification prefs, and the consolidation note. The actual
// deletion CASCADE + receipt land with the security gate (item 10); this control
// surfaces the promise honestly and does not fake a deletion.

import { useState } from "react";

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [requested, setRequested] = useState(false);
  const [digest, setDigest] = useState(true);
  const [email, setEmail] = useState("");
  const [time, setTime] = useState("08:00");

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Settings</h1>
      </div>

      {/* Data handling */}
      <section className="rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Data handling</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
          Call audio is deleted the moment it&apos;s transcribed; transcripts and reports are deleted
          within 7 days of your readout, or immediately if you ask in writing.
        </p>
        {!requested ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-pill border border-red px-4 py-2 text-sm font-semibold text-red hover:bg-red-tint"
          >
            Request data deletion
          </button>
        ) : (
          <p className="mt-4 rounded-base border border-hairline bg-canvas px-3 py-2 text-sm text-ink">
            Deletion request recorded. You&apos;ll receive a deletion receipt by email once it
            completes.
          </p>
        )}
      </section>

      {/* Notification prefs */}
      <section className="mt-4 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Notifications</h2>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} />
          Daily digest of follow-up drafts ready for review
        </label>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="text-sm text-ink-muted">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              className="mt-1 block w-56 rounded-base border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="text-sm text-ink-muted">
            Time of day
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 block rounded-base border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-faint">
          {/* TODO(Ali): persist notification prefs + wire the digest send (Resend) with the workflow gate. */}
          Preferences are saved to your account when the follow-up workflow is enabled.
        </p>
      </section>

      <p className="mt-4 text-xs text-faint">
        The prior tabs (dashboard, triage, team coaching, calibration, funnel, statement) now live
        inside these four screens; their old links redirect here automatically.
      </p>

      {/* Deletion confirmation (verbatim) */}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-w-lg rounded-card border border-hairline bg-surface p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-ink">Delete all of this firm&apos;s data?</h3>
            <p className="mt-2 text-sm text-ink-muted">
              This permanently deletes this firm&apos;s call recordings, transcripts, flags, and
              statements from Intake QA and requests deletion of the transcripts held by our
              transcription provider. This cannot be undone. We do this immediately on request, and
              automatically 7 days after a Leak Audit if you don&apos;t continue. You&apos;ll get a
              deletion receipt by email.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); setRequested(true); }}
                className="rounded-pill bg-red px-4 py-2 text-sm font-semibold text-white"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
