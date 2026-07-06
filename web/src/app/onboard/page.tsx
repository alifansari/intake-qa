"use client";

// Onboarding wizard: a 5-step setup for a new firm. Collects firm basics + case
// types/fees, requires a compliance acknowledgement (PILOT MODE: nothing sends
// without human approval), lets the operator review/edit the attorney-approved
// SMS template pack (validated live), and finishes by creating the workspace via
// /api/onboard. The wizard NEVER sends anything; it only sets up config and an
// approved, versioned template pack.

import { useMemo, useState } from "react";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CASE_TYPE_CATALOG } from "../../../onboarding/firm-config.mjs";

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
];

const DEFAULT_TEMPLATES = `=== TEMPLATE id=warm_followup | name=Warm follow-up (first contact) ===
Hi {{first_name}}, this is the intake team at {{firm_name}} following up on your call. We're sorry we couldn't finish helping you then. Is now a good time for a quick callback? No obligation. Reply STOP to opt out.

=== TEMPLATE id=we_can_help | name=We're here to help (first contact) ===
Hi {{first_name}}, it's {{firm_name}}. We know reaching out after an accident isn't easy, and we'd still like to listen and see how we can help. When's a good time to talk? Reply STOP to opt out.

=== TEMPLATE id=checking_in | name=Checking in (first contact) ===
Hi {{first_name}}, {{firm_name}} here, just checking in after your call. We'd genuinely like to help you sort out next steps whenever you're ready. Want us to give you a call back? Reply STOP to opt out.`;

type CaseType = { key: string; label: string; defaultFee: number };
type AcceptedState = Record<string, { on: boolean; fee: string }>;

const STEPS = ["Firm basics", "Case types", "Compliance", "Templates", "Review"];

// Lightweight client-side pack check (mirrors the server guard for instant
// feedback; the API does the authoritative validation on submit).
function quickTemplateIssues(text: string, firmName: string): string[] {
  const blocks = text.split(/^===\s*TEMPLATE/m).filter((b) => b.trim());
  if (blocks.length === 0) return ["Add at least one message template."];
  const issues: string[] = [];
  blocks.forEach((raw, i) => {
    const body = raw.replace(/^[^\n]*===/, "").trim();
    const filled = body.replaceAll("{{first_name}}", "there").replaceAll("{{firm_name}}", firmName || "");
    if (!/\bstop\b/i.test(filled)) issues.push(`Template ${i + 1}: add opt-out language ("Reply STOP to opt out").`);
    if (filled.length > 320) issues.push(`Template ${i + 1}: too long (${filled.length}/320 characters).`);
    if (firmName && !body.includes("{{firm_name}}") && !body.includes(firmName))
      issues.push(`Template ${i + 1}: name the firm (use {{firm_name}}).`);
  });
  return issues;
}

export default function OnboardPage() {
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [accepted, setAccepted] = useState<AcceptedState>(() =>
    Object.fromEntries(
      (CASE_TYPE_CATALOG as CaseType[]).map((c) => [c.key, { on: c.key.startsWith("mva") || c.key === "premises", fee: String(c.defaultFee) }]),
    ),
  );
  const [ack, setAck] = useState(false);
  const [templatesText, setTemplatesText] = useState(DEFAULT_TEMPLATES);
  const [approvedBy, setApprovedBy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ version: number | null; persisted: boolean; configMarkdown: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const acceptedList = useMemo(
    () =>
      (CASE_TYPE_CATALOG as CaseType[])
        .filter((c) => accepted[c.key]?.on)
        .map((c) => ({ key: c.key, fee: Number(accepted[c.key].fee) || c.defaultFee, label: c.label })),
    [accepted],
  );

  const templateIssues = useMemo(() => quickTemplateIssues(templatesText, name), [templatesText, name]);

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return acceptedList.length > 0;
    if (step === 2) return ack;
    if (step === 3) return templateIssues.length === 0;
    return true;
  };

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firm: {
            name,
            timezone,
            subscriptionPrice: subscriptionPrice ? Number(subscriptionPrice) : null,
            accepted: acceptedList.map((a) => ({ key: a.key, fee: a.fee })),
          },
          templatesText,
          approvedBy: approvedBy || undefined,
          complianceAcknowledged: ack,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Something went wrong. Please review your answers.");
        return;
      }
      setResult({ version: data.version, persisted: data.persisted, configMarkdown: data.configMarkdown });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <PageShell>
        <PageHeader kicker="Onboarding complete" title="Your workspace is set up" />
        <Card className="mb-6">
          <CardContent className="py-6">
            <p className="text-ink">
              Your firm and its approved message pack{result.version ? ` (version ${result.version})` : ""} are ready.
              {result.persisted
                ? " Everything is saved."
                : " (Saved locally for this pilot session.)"}
            </p>
            <div className="mt-4 rounded-sm border border-amber bg-amber-tint p-4 text-sm text-ink">
              <strong>Pilot mode is on.</strong> No text messages will send until an operator turns off
              the kill switch after A2P 10DLC approval, and even then a human approves every message
              in the queue first.
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/getting-started"><Button variant="primary">See getting started</Button></a>
              <a href="/queue"><Button variant="ghost">Go to the approval queue</Button></a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow">Your firm config</h2>
              <button
                onClick={() => { navigator.clipboard.writeText(result.configMarkdown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}
                className="rounded-md border border-line-strong px-3 py-1.5 text-xs text-ink hover:bg-canvas"
              >
                {copied ? "Copied ✓" : "Copy config"}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-line bg-canvas p-4 text-xs text-ink">
{result.configMarkdown}
            </pre>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader kicker="Welcome to Intake QA" title="Set up your firm" />

      {/* Step indicator */}
      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full border px-3 py-1 ${
              i === step
                ? "border-navy bg-navy text-white"
                : i < step
                  ? "border-green bg-green-tint text-green"
                  : "border-line text-muted"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="py-6">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <label className="text-sm text-ink">
                Firm name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ortiz Injury Law"
                  className="mt-1 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
                />
              </label>
              <label className="text-sm text-ink">
                Time zone (for quiet-hours compliance)
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </label>
              <label className="text-sm text-ink">
                Monthly subscription price (optional, used in your weekly ROI report)
                <input
                  type="number"
                  value={subscriptionPrice}
                  onChange={(e) => setSubscriptionPrice(e.target.value)}
                  placeholder="1500"
                  className="mt-1 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="mb-3 text-sm text-muted">
                Pick the case types your firm accepts and set an average fee for each. These start as
                estimates and feed your recovered-fee reporting; you can refine them anytime.
              </p>
              <div className="flex flex-col gap-2">
                {(CASE_TYPE_CATALOG as CaseType[]).map((c) => (
                  <div key={c.key} className="flex items-center gap-3 rounded-sm border border-line p-2">
                    <input
                      type="checkbox"
                      checked={accepted[c.key]?.on ?? false}
                      onChange={(e) => setAccepted((s) => ({ ...s, [c.key]: { ...s[c.key], on: e.target.checked } }))}
                    />
                    <span className="flex-1 text-sm text-ink">{c.label}</span>
                    <span className="text-xs text-muted">$</span>
                    <input
                      type="number"
                      value={accepted[c.key]?.fee ?? ""}
                      onChange={(e) => setAccepted((s) => ({ ...s, [c.key]: { ...s[c.key], fee: e.target.value } }))}
                      disabled={!accepted[c.key]?.on}
                      className="w-28 rounded-sm border border-line-strong bg-paper p-1.5 text-sm disabled:opacity-40"
                    />
                  </div>
                ))}
              </div>
              {acceptedList.length === 0 && (
                <p className="mt-2 text-xs text-red">Select at least one case type.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-ink">
                Intake QA is built for compliant re-engagement. These protections are always on:
              </p>
              <ul className="space-y-2 text-sm text-ink">
                <li>• <strong>Pilot mode:</strong> a human approves every text before it can be sent.</li>
                <li>• <strong>Quiet hours:</strong> nothing sends 8pm-8am in the recipient&apos;s local time.</li>
                <li>• <strong>Opt-out:</strong> STOP/UNSUBSCRIBE opts a number out immediately, forever.</li>
                <li>• <strong>Kill switch:</strong> your account starts with all sending halted.</li>
                <li>• <strong>Test mode:</strong> messages are simulated until A2P 10DLC is approved.</li>
              </ul>
              <label className="flex items-start gap-2 rounded-sm border border-line-strong bg-canvas p-3 text-sm text-ink">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
                <span>
                  I understand that no messages will send automatically, that a human approves every
                  message, and that sending stays simulated until my firm is A2P-approved and the kill
                  switch is cleared.
                </span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-2 text-sm text-muted">
                These are your attorney-approved first-contact templates. Edit the wording to match your
                voice. The rules (name the firm, include opt-out, stay under 320 characters, no legal
                advice) are enforced and checked below.
              </p>
              <label className="mb-2 block text-sm text-ink">
                Approved by (attorney/operator name)
                <input
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Attorney name"
                  className="mt-1 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
                />
              </label>
              <textarea
                value={templatesText}
                onChange={(e) => setTemplatesText(e.target.value)}
                rows={14}
                className="w-full rounded-sm border border-line-strong bg-paper p-3 font-mono text-xs text-ink"
              />
              {templateIssues.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {templateIssues.map((iss, i) => <li key={i} className="text-xs text-red">• {iss}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-green">All templates pass the compliance checks.</p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3 text-sm text-ink">
              <Row label="Firm">{name}</Row>
              <Row label="Time zone">{timezone}</Row>
              <Row label="Subscription">{subscriptionPrice ? `$${subscriptionPrice}/mo` : "-"}</Row>
              <Row label="Case types">
                {acceptedList.map((a) => `${a.label} ($${a.fee.toLocaleString("en-US")})`).join(", ")}
              </Row>
              <Row label="Templates">{templateIssues.length === 0 ? "Approved & compliant" : "Needs changes"}</Row>
              <Row label="Compliance">{ack ? "Acknowledged" : "Not acknowledged"}</Row>
              {error && <p className="text-sm text-red">{error}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Next
              </Button>
            ) : (
              <Button variant="primary" onClick={finish} disabled={submitting || !ack || acceptedList.length === 0}>
                {submitting ? "Setting up…" : "Create my workspace"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
