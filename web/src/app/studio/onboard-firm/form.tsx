"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Result {
  firm_id: string;
  firm_name: string;
  email: string;
  password: string | null;
  existing_account: boolean;
  signin_url: string;
  webhook_url: string;
}

function welcomeEmail(r: Result): string {
  const credentials = r.existing_account
    ? `Sign in with your existing account at ${r.signin_url}`
    : `Sign in at ${r.signin_url}
Email: ${r.email}
Temporary password: ${r.password}
(Prefer no password? On the sign-in page choose "email me a sign-in link" —
it always works. You can set your own password anytime under Settings.)`;
  return `Subject: Your Intake QA desk is ready

Hi — your desk is live. Two minutes to get oriented:

1. ${credentials}

2. You'll land on "Missed cases" — the only screen that needs your team's
   attention. When a signable caller slips through, they appear there the
   same day, and your team just calls them back.

3. On our 15-minute setup call we'll connect your calls (nothing about how
   your team answers the phone changes). If you use CallRail, this is your
   firm's webhook address — we'll paste it in together:
   ${r.webhook_url}

That's the whole product: we read every intake call so your team doesn't
have to, and the ones that walked show up ready to win back.

Ali
ali@plaintiffops.com`;
}

export function OnboardFirmForm() {
  const [firmName, setFirmName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [fee, setFee] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [copied, setCopied] = React.useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "onboarding failed");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const emailText = welcomeEmail(result);
    return (
      <Card>
        <CardContent className="py-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            {result.firm_name} is live.
          </h2>
          <p className="mt-1 text-sm text-muted">
            {result.existing_account
              ? "Linked to their existing account — no new password issued."
              : "The temporary password below is shown ONCE — it isn't stored anywhere readable."}
          </p>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-card border border-line bg-canvas p-4 text-xs leading-relaxed text-ink">
            {emailText}
          </pre>
          <div className="mt-3 flex gap-2">
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
            <Button variant="outline" onClick={() => { setResult(null); setFirmName(""); setEmail(""); setFee(""); }}>
              Onboard another
            </Button>
          </div>
          <p className="mt-3 text-xs text-faint">
            Sending the email is yours to do — nothing was sent automatically.
          </p>
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
