// Operator status page — a single at-a-glance readiness board for whoever runs
// the pilot. It answers: are the compliance guardrails ON, is anything broken,
// and is there work waiting? It is READ-ONLY (no controls that send or change
// state) and best-effort: a missing DB or env never crashes it — each panel
// degrades to a friendly "not connected" note.
//
// The go-live gates live in GO_LIVE.md; this page mirrors the ones that are
// checkable from the running app (TEST_MODE, kill switches, config presence).

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { truthy, isTestMode, killSwitchEngaged } from "../../../../messaging/compliance.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect live env + DB state

export const metadata = { title: "Operator status — Intake QA" };

type FirmRow = { id: number | string; name: string; kill_switch: number | boolean };
type ErrorRow = {
  id: number | string;
  source: string;
  message: string;
  firm_id: number | string | null;
  created_at: string;
};

// Read the live pipeline state without ever throwing into the render.
async function loadState() {
  try {
    const store = await import("../../../../ingest/store.mjs");
    if (!store.pipelineDbConfigured()) {
      return { connected: false as const };
    }
    const db = await store.openPipelineDb();
    try {
      const [firms, errors, drafted] = await Promise.all([
        store.listFirms(db),
        store.getRecentErrors(db, 15),
        store.getDraftedMessages(db),
      ]);
      // Enhancement subsystems query the 0008–0012 tables. Isolate them so that
      // if those migrations haven't been applied yet, the core status page still
      // renders (graceful degradation) instead of failing to "not connected".
      let subsystems = null;
      try {
        const [simLog, consenting, benchmark, audits] = await Promise.all([
          store.countStripeSimLog(db),
          store.countConsentingFirms(db),
          store.getLatestBenchmarkSnapshot(db),
          store.listRecentAuditSessions(db, 200),
        ]);
        let firmsWithFeatures = 0;
        let integrationsConfigured = 0;
        for (const f of firms as FirmRow[]) {
          const [feats, integs] = await Promise.all([
            store.getFirmFeatures(db, f.id),
            store.listFirmIntegrations(db, f.id),
          ]);
          if (Object.values(feats as Record<string, boolean>).some(Boolean)) firmsWithFeatures += 1;
          integrationsConfigured += (integs as unknown[]).length;
        }
        subsystems = {
          firmsWithFeatures,
          simLogCount: simLog as number,
          benchmarkConsent: consenting as number,
          benchmarkAvailable: Boolean(benchmark),
          auditCount: (audits as unknown[]).length,
          integrationsConfigured,
        };
      } catch {
        subsystems = null; // migrations not applied yet — hide the card, don't crash
      }
      return {
        connected: true as const,
        firms: firms as FirmRow[],
        errors: errors as ErrorRow[],
        pendingCount: (drafted as unknown[]).length,
        subsystems,
      };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch (e) {
    return { connected: false as const, error: String((e as Error)?.message ?? e) };
  }
}

// A single OK/attention row. `good=true` renders green, else amber.
function Check({ label, value, good, note }: { label: string; value: string; good: boolean; note?: string }) {
  return (
    <div className={`flex items-center justify-between rounded-sm border p-3 ${good ? "border-green bg-green-tint" : "border-amber bg-amber-tint"}`}>
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
      </div>
      <span className={`text-sm font-semibold ${good ? "text-green" : "text-amber"}`}>{value}</span>
    </div>
  );
}

export default async function AdminStatusPage() {
  const env = process.env;
  const testMode = isTestMode(env);
  const killGlobal = killSwitchEngaged(env);
  const anthropicSet = Boolean(env.ANTHROPIC_API_KEY);
  const assemblySet = Boolean(env.ASSEMBLYAI_API_KEY);
  const dbConfigured = Boolean(env.DATABASE_URL) || Boolean(env.NEXT_PUBLIC_SUPABASE_URL);
  const twilioLive = truthy(env.TWILIO_ACCOUNT_SID) && !testMode;

  const state = await loadState();

  return (
    <PageShell>
      <PageHeader kicker="Operator" title="System status" />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Compliance guardrails</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Check
              label="TEST_MODE"
              value={testMode ? "ON (simulated)" : "OFF (LIVE)"}
              good={testMode}
              note={testMode ? "Sends are simulated — no real SMS. Correct for the pilot." : "Real SMS can be sent. Only correct after A2P 10DLC approval."}
            />
            <Check
              label="Global kill switch"
              value={killGlobal ? "ENGAGED (halted)" : "clear"}
              good
              note={killGlobal ? "All sends are halted right now." : "Sending is allowed (still gated by approval + per-firm switch)."}
            />
            <Check
              label="Anthropic API key"
              value={anthropicSet ? "set" : "missing"}
              good={anthropicSet}
              note="Required to score calls."
            />
            <Check
              label="AssemblyAI API key"
              value={assemblySet ? "set" : "missing"}
              good={assemblySet}
              note="Required to transcribe uploaded/recorded audio."
            />
          </div>
          {twilioLive ? (
            <div className="mt-3 rounded-sm border border-red bg-red-tint p-3 text-sm text-ink">
              Twilio credentials are present AND TEST_MODE is off. Confirm A2P 10DLC is approved before any real send.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Per-firm kill switches</SectionTitle>
          {!state.connected ? (
            <p className="text-sm text-muted">
              {dbConfigured
                ? "Could not read the database right now."
                : "No database connected. Firms appear here once a Supabase/Postgres connection is configured."}
            </p>
          ) : state.firms.length === 0 ? (
            <p className="text-sm text-muted">No firms onboarded yet. Use the onboarding wizard to add one.</p>
          ) : (
            <div className="space-y-2">
              {state.firms.map((f) => {
                const halted = Boolean(f.kill_switch);
                return (
                  <div key={String(f.id)} className="flex items-center justify-between rounded-sm border border-line bg-canvas p-3">
                    <p className="text-sm font-semibold text-ink">{f.name}</p>
                    <span className={`text-sm font-semibold ${halted ? "text-amber" : "text-green"}`}>
                      {halted ? "kill switch ON (cannot send)" : "cleared (can send)"}
                    </span>
                  </div>
                );
              })}
              <p className="mt-2 text-xs text-muted">
                New firms start with the kill switch ON. An operator clears it only after A2P 10DLC approval.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Work waiting</SectionTitle>
          {state.connected ? (
            <p className="text-sm text-ink">
              <span className="font-semibold">{state.pendingCount}</span> text
              {state.pendingCount === 1 ? "" : "s"} awaiting human approval in the{" "}
              <a className="text-navy underline" href="/desk/queue">approval queue</a>.
            </p>
          ) : (
            <p className="text-sm text-muted">Connect a database to see pending approvals.</p>
          )}
        </CardContent>
      </Card>

      {state.connected && state.subsystems ? (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <SectionTitle>Enhancement subsystems</SectionTitle>
            <div className="mt-1 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Firms with a feature flag on", value: state.subsystems.firmsWithFeatures },
                { label: "Leak Audits run", value: state.subsystems.auditCount },
                { label: "Benchmark-consenting firms", value: state.subsystems.benchmarkConsent },
                {
                  label: "Peer benchmark",
                  value: state.subsystems.benchmarkAvailable ? "available" : "withheld (k<5)",
                },
                { label: "Stripe sim-log entries", value: state.subsystems.simLogCount },
                { label: "Integrations configured", value: state.subsystems.integrationsConfigured },
              ].map((s) => (
                <div key={s.label} className="rounded-sm border border-line bg-canvas p-3">
                  <p className="font-display text-xl font-bold text-ink tabular-nums">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-faint">
              All enhancements ship behind per-firm flags (default off). Billing Stripe calls are
              simulated in test mode; benchmarks stay withheld until 5 firms consent.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <SectionTitle>Recent errors</SectionTitle>
          {!state.connected ? (
            <p className="text-sm text-muted">Connect a database to see the operator error log.</p>
          ) : state.errors.length === 0 ? (
            <p className="text-sm text-green">No errors logged. The pipeline is running clean.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {state.errors.map((e) => (
                    <tr key={String(e.id)} className="border-b border-line/60 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">{e.created_at}</td>
                      <td className="whitespace-nowrap py-2 pr-3 font-semibold text-ink">{e.source}</td>
                      <td className="py-2 text-ink">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-faint">
            Full go-live checklist lives in GO_LIVE.md. This page is read-only —
            roll features out per firm on the{" "}
            <a className="text-navy underline" href="/admin/features">
              feature-flags console
            </a>{" "}
            · follow up on{" "}
            <a className="text-navy underline" href="/admin/audits">
              Leak Audits
            </a>{" "}
            · manage{" "}
            <a className="text-navy underline" href="/admin/billing">
              billing
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
