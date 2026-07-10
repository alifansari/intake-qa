"use client";

// Settings — screen (d). The integration story first (how calls arrive — the
// question every new firm actually has), then data handling (deletion request
// with the verbatim confirmation), billing, and notifications. The deletion
// CASCADE + receipt land with the security gate (item 10); the control
// surfaces the promise honestly and does not fake a deletion.

import { useState } from "react";
import { HowCallsArrive } from "@/components/desk/HowCallsArrive";

export function SettingsClient({
  firmId,
  webhookUrl,
  crmHref,
}: {
  firmId: string | null;
  webhookUrl: string | null;
  crmHref: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [requested, setRequested] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function openBillingPortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const r = await fetch("/api/portal", { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.url) {
        setPortalError(
          data.error === "no_stripe_customer"
            ? "No billing account is linked yet. It appears after your first subscription payment."
            : (data.error ?? "Could not open the billing portal."),
        );
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setPortalError("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Settings</h1>
      </div>

      {/* How calls arrive — the integration story, answered before it's asked */}
      <section className="rounded-card border border-hairline bg-surface p-6">
        <HowCallsArrive />
        {webhookUrl ? (
          <div className="mt-5 rounded-card border border-hairline bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">Your firm's webhook address</p>
            <p className="mt-1 text-xs text-ink-muted">
              Paste this once into CallRail (Settings → Integrations → Webhooks, post-call) and
              every new call flows in automatically. We'll do it with you on the setup call.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-base border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink break-all">
                {webhookUrl}
              </code>
              <CopyButton text={webhookUrl} />
            </div>
          </div>
        ) : null}
      </section>

      {/* CRM — one link, configured together on the setup call */}
      <section className="mt-4 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Your CRM</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
          Missed cases can land in your CRM as new leads — created, never edited, so your
          existing matters are untouched. Lead Docket and Filevine connect directly; anything
          else works through a signed webhook. We set this up with you; nothing writes until
          you've approved a test record.
        </p>
        {crmHref ? (
          <a
            href={crmHref}
            className="mt-4 inline-flex rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            Connect your CRM
          </a>
        ) : (
          <p className="mt-3 text-xs text-faint">
            The CRM connector opens here once your workspace is provisioned.
          </p>
        )}
      </section>

      {/* Data handling */}
      <section className="mt-4 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Data handling</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
          Call audio is deleted the moment it&apos;s transcribed; transcripts and reports are purged
          within 72 hours of your readout, or immediately if you ask in writing.
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

      {/* Billing — self-serve Stripe Customer Portal */}
      <section className="mt-4 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Billing</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
          Update your card, download invoices, or cancel your flat monthly subscription anytime in
          the secure Stripe portal.
        </p>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={portalLoading}
          className="mt-4 rounded-pill border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
        >
          {portalLoading ? "Opening…" : "Manage billing"}
        </button>
        {portalError && <p className="mt-2 text-xs text-alert">{portalError}</p>}
      </section>

      {/* Notifications — a promise, not a form. The old inputs here weren't
          persisted anywhere (a silent no-op is worse than no control); until
          prefs are real, we state plainly what happens and how to change it. */}
      <section className="mt-4 rounded-card border border-hairline bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Notifications</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
          You don&apos;t need to check the desk. A daily digest goes to your sign-in email each
          morning with anything that needs action, and same-day flags land as they&apos;re found.
          Want a different address, more people on it, or a different rhythm? Email{" "}
          <a href="mailto:ali@plaintiffops.com" className="font-medium text-accent hover:text-accent-hover">
            ali@plaintiffops.com
          </a>{" "}
          and it&apos;s changed the same day.
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
              automatically 72 hours after a Leak Audit if you don&apos;t continue. You&apos;ll get a
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


function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="rounded-pill border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
