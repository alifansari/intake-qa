"use client";
// Founder-only: store a firm's CallRail webhook signing key
// (firms.callrail_webhook_secret) without touching the database by hand.
// Lives on /studio/onboard-firm (rendered standalone AND inside the
// onboarding success panel with the new firm's id prefilled).
//
// The signing key comes from the firm's CallRail account (Settings →
// Integrations → Webhooks — CallRail issues it per account; you can't choose
// it). Until it's stored here, the per-firm webhook can only verify against
// the shared env secret, which belongs to firm #1's CallRail account — every
// other firm's webhooks silently 401.
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CallRailSecretForm({
  initialFirmId = "",
  compact = false,
}: {
  initialFirmId?: string;
  compact?: boolean;
}) {
  const [firmId, setFirmId] = React.useState(initialFirmId);
  const [secret, setSecret] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const r = await fetch("/api/studio/callrail-secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firm_id: firmId.trim(), secret: secret.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "could not save secret");
      setStatus(
        `Saved. ${data.firm_name ?? "This firm"}'s webhooks now verify against its own CallRail signing key.`,
      );
      setSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save secret");
    } finally {
      setPending(false);
    }
  }

  const form = (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-3">
      {!compact ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Firm ID
          <input
            required
            value={firmId}
            onChange={(e) => setFirmId(e.target.value)}
            className="rounded-sm border border-line-strong bg-paper p-2 font-mono text-sm"
            placeholder="the id from the firm's webhook address"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        CallRail signing key
        <input
          required
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="rounded-sm border border-line-strong bg-paper p-2 font-mono text-sm"
          placeholder="from their CallRail account — Settings → Integrations → Webhooks"
          autoComplete="off"
        />
      </label>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {status ? <p className="text-sm text-ink">{status} ✓</p> : null}
      <div>
        <Button variant="primary" type="submit" disabled={pending || !firmId.trim()}>
          {pending ? "Saving…" : "Save signing key"}
        </Button>
      </div>
    </form>
  );

  if (compact) {
    return (
      <div className="mt-4 rounded-card border border-line bg-canvas p-4">
        <h3 className="text-sm font-semibold text-ink">
          Connect CallRail: paste their signing key
        </h3>
        <p className="mb-3 mt-1 text-xs text-muted">
          On the setup call, copy the signing key from the firm&apos;s CallRail account
          (Settings → Integrations → Webhooks). Without it, their webhooks can&apos;t be
          verified and no calls will arrive.
        </p>
        {form}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          CallRail signing key
        </h2>
        <p className="mb-4 mt-1 max-w-[70ch] text-sm text-muted">
          Each firm&apos;s CallRail account has its own signing key — store it here so
          their webhook calls verify. Until this is set, the firm&apos;s calls will be
          rejected (a &quot;0 calls&quot; desk). Verify the setup afterwards with{" "}
          <code className="font-mono text-xs">npm --prefix web run callrail:selftest</code>.
        </p>
        {form}
      </CardContent>
    </Card>
  );
}
