"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallRailSecretForm } from "./callrail-secret-form";

interface Result {
  firm_id: string;
  firm_name: string;
  email: string;
  password: string | null;
  existing_account: boolean;
  signin_url: string;
  webhook_url: string;
  // Composed server-side (messaging/welcome-email.mjs) — the complete,
  // firm-personalized welcome email. A redacted copy is persisted server-side.
  welcome_email?: { subject: string; body: string; persisted: boolean };
}

// Fallback only (server responses always carry welcome_email; this covers a
// stale deployment mid-rollout so the founder is never left with nothing).
function fallbackEmail(r: Result): { subject: string; body: string } {
  return {
    subject: "Your Intake QA desk is ready",
    body: `Sign in at ${r.signin_url}
Email: ${r.email}${r.password ? `\nTemporary password: ${r.password}` : ""}
CallRail webhook address: ${r.webhook_url}`,
  };
}

type SendState =
  | { s: "idle" }
  | { s: "confirm" }
  | { s: "sending" }
  | { s: "sent" }
  | { s: "blocked"; reason: string };

export function OnboardFirmForm({
  initialFirmName = "",
  initialEmail = "",
}: {
  initialFirmName?: string;
  initialEmail?: string;
}) {
  const [firmName, setFirmName] = React.useState(initialFirmName);
  const [email, setEmail] = React.useState(initialEmail);
  const [fee, setFee] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [send, setSend] = React.useState<SendState>({ s: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/studio/onboard-firm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firm_name: firmName.trim(),
          email: email.trim(),
          ...(fee.trim() !== "" ? { avg_case_fee: Number(fee) } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "onboarding failed");
      setResult(data as Result);
      setSend({ s: "idle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "onboarding failed");
    } finally {
      setPending(false);
    }
  }

  // The one send path — runs ONLY on the founder’s second (confirming) click.
  async function sendNow(r: Result, subject: string, body: string) {
    setSend({ s: "sending" });
    try {
      const res = await fetch("/api/studio/send-welcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firm_id: r.firm_id, to: r.email, subject, text: body }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setSend({ s: "sent" });
      } else {
        setSend({
          s: "blocked",
          reason:
            typeof data.reason === "string"
              ? data.reason
              : (data.error ?? "The email did not go out — copy it and send it yourself."),
        });
      }
    } catch {
      setSend({ s: "blocked", reason: "Network error — nothing was sent. Copy the email instead." });
    }
  }

  if (result) {
    const we = result.welcome_email ?? fallbackEmail(result);
    const emailText = `Subject: ${we.subject}\n\n${we.body}`;
    return (
      <Card>
        <CardContent className="py-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            {result.firm_name} is live.
          </h2>
          <p className="mt-1 text-sm text-muted">
            {result.existing_account
              ? "Linked to their existing account — no new password issued."
              : "The temporary password below is shown ONCE — it isn’t stored anywhere readable."}
          </p>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-card border border-line bg-canvas p-4 text-xs leading-relaxed text-ink">
            {emailText}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                await navigator.clipboard.writeText(emailText).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied ✓" : "Copy welcome email"}
            </Button>
            {send.s === "sent" ? (
              <span className="text-sm font-semibold text-ink">
                Sent to {result.email} ✓
              </span>
            ) : send.s === "confirm" ? (
              <>
                <Button variant="primary" onClick={() => sendNow(result, we.subject, we.body)}>
                  Yes, send to {result.email}
                </Button>
                <Button variant="outline" onClick={() => setSend({ s: "idle" })}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={send.s === "sending"}
                onClick={() => setSend({ s: "confirm" })}
              >
                {send.s === "sending" ? "Sending…" : "Send it by email"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setFirmName("");
                setEmail("");
                setFee("");
                setSend({ s: "idle" });
              }}
            >
              Onboard another
            </Button>
          </div>
          {send.s === "blocked" ? (
            <p className="mt-2 text-sm text-red">Not sent: {send.reason}</p>
          ) : null}
          <p className="mt-3 text-xs text-faint">
            Nothing sends on its own — the email goes out only if you press Send (and
            email sending is switched on), or when you paste the copy into your own email.
          </p>
          {/* If this firm uses CallRail, store their account’s signing key now —
              their webhooks 401 until it’s saved (each CallRail account has its
              own key; the shared env secret only covers firm #1). */}
          <CallRailSecretForm initialFirmId={result.firm_id} compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Firm name
            <input
              required
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              placeholder="Alvarez Injury Law"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Their sign-in email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              placeholder="jordan@alvarezlaw.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Average signed case fee (USD) <span className="font-normal text-faint">(optional — powers their dollar figures)</span>
            <input
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              placeholder="12000"
            />
          </label>
          {error ? <p className="text-sm text-red">{error}</p> : null}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Provisioning…" : "Create firm + account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
