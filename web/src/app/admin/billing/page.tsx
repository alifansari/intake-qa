// Operator billing console: per-firm accruals, close-period, dispute/void, and
// the Stripe simulation log. Reads through the facade; actions post to
// /api/admin/billing. Degrades gracefully with no DB.

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/format";
import { ClosePeriodForm, ActionButton } from "@/components/billing-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Billing console — Intake QA" };

const PERIOD = new Date().toISOString().slice(0, 7);

type FirmBilling = {
  firmId: number | string;
  firmName: string;
  planName: string | null;
  events: Array<{ id: number | string; status: string; per_case_fee_cents_applied: number; outcome_id: number | string }>;
  invoices: Array<{ id: number | string; period: string; status: string; total_cents: number }>;
};

async function load(): Promise<
  { connected: true; firms: FirmBilling[]; simCount: number } | { connected: false }
> {
  try {
    const store = await import("../../../../ingest/store.mjs");
    if (!store.pipelineDbConfigured()) return { connected: false };
    const db = await store.openPipelineDb();
    try {
      const firms = await store.listFirms(db);
      const out: FirmBilling[] = [];
      for (const f of firms) {
        const billing = await store.getFirmBilling(db, f.id);
        if (!billing) continue; // only firms with billing configured
        const events = await store.getBillableEvents(db, f.id, { period: PERIOD });
        const invoices = await store.listInvoices(db, f.id);
        out.push({
          firmId: f.id,
          firmName: f.name,
          planName: billing.plan_name ?? null,
          events,
          invoices,
        });
      }
      const simCount = await store.countStripeSimLog(db);
      return { connected: true, firms: out, simCount };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    return { connected: false };
  }
}

export default async function AdminBillingPage() {
  const state = await load();

  return (
    <PageShell>
      <PageHeader kicker="Operator" title="Billing console" />

      {!state.connected ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted">
              No database connected. Billing appears here once a Supabase/Postgres connection is
              configured and a firm has a billing plan.
            </p>
          </CardContent>
        </Card>
      ) : state.firms.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted">
              No firms have a billing plan yet. Configure one to start metering recovered cases.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-faint">
            Stripe is simulated in test mode — {state.simCount} would-be call(s) logged, none sent.
            Billing is a flat fee per recovered case; recovered fee amounts never affect a total.
          </p>
          {state.firms.map((f) => {
            const accrued = f.events.filter((e) => e.status === "accrued");
            const accruedTotal = accrued.reduce((a, e) => a + e.per_case_fee_cents_applied, 0);
            return (
              <Card key={String(f.firmId)}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle>
                      {f.firmName} · {f.planName ?? "no plan"}
                    </SectionTitle>
                    <ClosePeriodForm firmId={f.firmId} defaultPeriod={PERIOD} />
                  </div>

                  <p className="mt-2 text-sm text-muted">
                    {PERIOD}: <b className="text-ink">{accrued.length}</b> recovered case(s) accrued ·{" "}
                    <b className="text-ink">{money(accruedTotal, { cents: true })}</b> in per-case fees
                  </p>

                  {f.events.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                            <th className="py-1.5 pr-3">Case (outcome)</th>
                            <th className="py-1.5 pr-3">Fee</th>
                            <th className="py-1.5 pr-3">Status</th>
                            <th className="py-1.5">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.events.map((e) => (
                            <tr key={String(e.id)} className="border-b border-line/60">
                              <td className="py-1.5 pr-3 tabular-nums">#{String(e.outcome_id)}</td>
                              <td className="py-1.5 pr-3 tabular-nums">
                                {money(e.per_case_fee_cents_applied, { cents: true })}
                              </td>
                              <td className="py-1.5 pr-3 text-muted">{e.status}</td>
                              <td className="flex gap-1.5 py-1.5">
                                {e.status === "accrued" && (
                                  <ActionButton
                                    label="Dispute"
                                    body={{ action: "dispute_event", event_id: e.id }}
                                  />
                                )}
                                {e.status === "disputed" && (
                                  <ActionButton
                                    label="Resolve"
                                    body={{ action: "resolve_event", event_id: e.id }}
                                  />
                                )}
                                {e.status !== "invoiced" && e.status !== "voided" && (
                                  <ActionButton
                                    label="Void"
                                    tone="danger"
                                    confirm="Void this billable event?"
                                    body={{ action: "void_event", event_id: e.id }}
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {f.invoices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Invoices</p>
                      <ul className="mt-1 space-y-1">
                        {f.invoices.map((inv) => (
                          <li key={String(inv.id)} className="flex items-center gap-3 text-sm">
                            <span className="text-ink">
                              {inv.period} · {money(inv.total_cents, { cents: true })} · {inv.status}
                            </span>
                            {inv.status !== "void" && (
                              <ActionButton
                                label="Void"
                                tone="danger"
                                confirm="Void this invoice?"
                                body={{ action: "void_invoice", invoice_id: inv.id }}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
