"use client";

// Firm integration settings form: configure Lead Docket / Filevine / a generic
// signed webhook, then save (credentials encrypted server-side) or send a test
// event. Credentials are write-only — we never render stored secrets back.

import { useState } from "react";

type Provider = "leaddocket" | "filevine" | "webhook";

type Existing = { provider: string; enabled: boolean; hasCreds: boolean; webhook_url: string | null };

export function IntegrationSettings({
  firmId,
  existing,
}: {
  firmId: number | string;
  existing: Existing[];
}) {
  const [provider, setProvider] = useState<Provider>("webhook");
  const [credentials, setCredentials] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [fieldMap, setFieldMap] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(action: "save" | "test") {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          firm_id: firmId,
          provider,
          credentials: credentials || undefined,
          field_map: fieldMap || undefined,
          webhook_url: webhookUrl || undefined,
          webhook_secret: webhookSecret || undefined,
          enabled,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      setMsg(action === "save" ? "Saved." : `Test sent: ${JSON.stringify(d.result)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {existing.length > 0 && (
        <div className="rounded-sm border border-line bg-canvas p-3 text-sm">
          <p className="font-semibold text-ink">Configured</p>
          <ul className="mt-1 space-y-0.5 text-muted">
            {existing.map((e) => (
              <li key={e.provider}>
                {e.provider}: {e.enabled ? "enabled" : "disabled"}
                {e.hasCreds ? " · credentials set" : ""}
                {e.webhook_url ? ` · ${e.webhook_url}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3">
        <label className="text-sm">
          <span className="font-semibold text-ink">Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="mt-1 block w-full rounded-sm border border-line bg-paper px-2 py-1.5"
          >
            <option value="webhook">Generic signed webhook</option>
            <option value="leaddocket">Lead Docket</option>
            <option value="filevine">Filevine</option>
          </select>
        </label>

        {provider !== "webhook" && (
          <label className="text-sm">
            <span className="font-semibold text-ink">API key</span>
            <span className="ml-2 text-xs text-faint">stored encrypted; never shown again</span>
            <input
              type="password"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="paste API key"
              className="mt-1 block w-full rounded-sm border border-line bg-paper px-2 py-1.5"
            />
          </label>
        )}

        <label className="text-sm">
          <span className="font-semibold text-ink">
            {provider === "webhook" ? "Webhook URL" : "API base URL (optional)"}
          </span>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 block w-full rounded-sm border border-line bg-paper px-2 py-1.5"
          />
        </label>

        {provider === "webhook" && (
          <label className="text-sm">
            <span className="font-semibold text-ink">Signing secret</span>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="shared secret for HMAC signatures"
              className="mt-1 block w-full rounded-sm border border-line bg-paper px-2 py-1.5"
            />
          </label>
        )}

        <label className="text-sm">
          <span className="font-semibold text-ink">Field mapping (JSON, optional)</span>
          <textarea
            value={fieldMap}
            onChange={(e) => setFieldMap(e.target.value)}
            placeholder='{"office":"LA"}'
            className="mt-1 block w-full rounded-sm border border-line bg-paper px-2 py-1.5 font-mono text-xs"
            rows={2}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-ink">Enabled</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => call("save")}
          disabled={busy}
          className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => call("test")}
          disabled={busy}
          className="rounded-sm border border-line px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Send test event
        </button>
      </div>

      {msg && <p className="text-sm text-green">{msg}</p>}
      {err && <p className="text-sm text-red">{err}</p>}
    </div>
  );
}
