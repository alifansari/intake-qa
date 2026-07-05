// Operator billing console: per-firm plan + this period's analyzed-call volume
// (with an upgrade flag when a firm exceeds its tier), close-period, invoice
// void, and the Stripe simulation log. Reads through the facade; actions post to
// /api/admin/billing. Degrades gracefully with no DB.
//
// Billing is a FLAT MONTHLY subscription — there is nothing to meter per case.
// Exceeding a tier's call volume never auto-charges; it only flags an upgrade.

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
  baseMonthlyCents: number;
  callCap: number | null;
  callsThisPeriod: number;
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
        const invoices = await store.listInvoices(db, f.id);
        const callsThisPeriod = await store.countCallsInPeriod(db, f.id, PERIOD);
        out.push({
          firmId: f.id,
          firmName: f.name,
          planName: billing.plan_name ?? null,
          baseMonthlyCents: billing.base_monthly_cents ?? 0,
          callCap: billing.monthly_call_cap ?? null,
          callsThisPeriod,
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
              No firms have a billing plan yet. Configure one to start their flat monthly subscription.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-faint">
            Stripe is simulated in test mode — {state.simCount} would-be call(s) logged, none sent.
            Billing is a flat monthly subscription; signing or recovering cases never affects a total.
          </p>
          {state.firms.map((f) => {
            const overCap = f.callCap != null && f.callsThisPeriod > f.callCap;
            return (
              <Card key={String(f.firmId)}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle>
                      {f.firmName} · {f.planName ?? "no plan"} ·{" "}
                      {money(f.baseMonthlyCents, { cents: true })}/mo
                    </SectionTitle>
                    <ClosePeriodForm firmId={f.firmId} defaultPeriod={PERIOD} />
                  </div>

                  <p className="mt-2 text-sm text-muted">
                    {PERIOD}: <b className="text-ink">{f.callsThisPeriod.toLocaleString()}</b> call(s)
                    analyzed
                    {f.callCap != null ? (
                      <>
                        {" "}
                        of <b className="text-ink">{f.callCap.toLocaleString()}</b> included in this tier
                      </>
                    ) : (
                      " (uncapped pilot)"
                    )}
                    .
                  </p>

                  {overCap && (
                    <p className="mt-2 rounded-base border border-line bg-canvas px-3 py-2 text-sm text-ink">
                      ⬆ Over tier volume — consider an upgrade conversation. The bill is not changed
                      automatically.
                    </p>
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
