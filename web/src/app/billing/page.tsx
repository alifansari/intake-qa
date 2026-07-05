// Firm-facing billing. Plain-English model explainer + this period's accrued
// per-case fees (each linked to the signed case) + past invoices + an ROI banner.
//
// The ROI banner shows recovered fees for CONTEXT ONLY — they are computed for
// display and NEVER affect the bill (Rule 5.4). Every billing number here comes
// from the flat per-case plan, not from recovered fees.

import { redirect } from "next/navigation";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Billing — Intake QA" };

const PERIOD = new Date().toISOString().slice(0, 7);

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string }>;
}) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/billing");
  }
  const { firm: firmParam } = await searchParams;

  const store = await import("../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Your account" title="Billing" />
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted">
              Billing appears here once your workspace database is connected.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const db = await store.openPipelineDb();
  try {
    const firms = await store.listFirms(db);
    const firm =
      (firmParam && firms.find((f: { id: unknown }) => String(f.id) === String(firmParam))) ||
      firms[0];
    if (!firm) {
      return (
        <PageShell>
          <PageHeader kicker="Your account" title="Billing" />
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted">No firm found.</p>
            </CardContent>
          </Card>
        </PageShell>
      );
    }

    const billing = await store.getFirmBilling(db, firm.id);
    const events = billing ? await store.getBillableEvents(db, firm.id, { period: PERIOD }) : [];
    const invoices = billing ? await store.listInvoices(db, firm.id) : [];
    const accrued = events.filter(
      (e: { status: string }) => e.status === "accrued" || e.status === "invoiced",
    );
    const perCaseTotalCents = accrued.reduce(
      (a: number, e: { per_case_fee_cents_applied: number }) => a + e.per_case_fee_cents_applied,
      0,
    );
    // DISPLAY-ONLY ROI context: recovered fees (whole dollars) recovered MTD.
    // This value never enters any billing calculation.
    const recoveredDisplayDollars = await store.sumRecoveredMonthToDate(db, firm.id, new Date());

    return (
      <PageShell>
        <PageHeader kicker="Your account" title="Billing" />

        {!billing ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted">
                No billing plan is set for {firm.name} yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Model explainer */}
            <Card>
              <CardContent className="pt-5">
                <SectionTitle>Your plan · {billing.plan_name}</SectionTitle>
                <p className="mt-2 text-sm text-ink">
                  A flat{" "}
                  <b>{money(billing.per_case_fee_cents, { cents: true })} per case recovered</b> —
                  never a percentage of your fees. Base subscription{" "}
                  <b>{money(billing.base_monthly_cents, { cents: true })}/mo</b>
                  {billing.monthly_case_fee_cap_cents
                    ? `, case fees capped at ${money(billing.monthly_case_fee_cap_cents, { cents: true })}/mo`
                    : ""}
                  .
                </p>
                <p className="mt-1 text-xs text-faint">
                  Your fee amounts are shown for ROI only and never affect your bill (structured to
                  respect professional-independence rules — confirm with your ethics counsel).
                </p>
              </CardContent>
            </Card>

            {/* ROI banner */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">This period ({PERIOD})</p>
                    <p className="font-display text-2xl font-bold text-ink">
                      {money(perCaseTotalCents, { cents: true })}{" "}
                      <span className="text-sm font-semibold text-muted">in per-case fees</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted">Fees you recovered (context)</p>
                    <p className="font-display text-2xl font-bold text-green">
                      {money(recoveredDisplayDollars)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accrued cases */}
            <Card>
              <CardContent className="pt-5">
                <SectionTitle>Recovered cases this period</SectionTitle>
                {accrued.length === 0 ? (
                  <p className="text-sm text-muted">No recovered cases billed yet this period.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {accrued.map((e: { id: number | string; outcome_id: number | string; per_case_fee_cents_applied: number; status: string }) => (
                      <li key={String(e.id)} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink">Signed case (outcome #{String(e.outcome_id)})</span>
                        <span className="tabular-nums text-muted">
                          {money(e.per_case_fee_cents_applied, { cents: true })} · {e.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            {invoices.length > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle>Invoices</SectionTitle>
                  <ul className="mt-2 divide-y divide-line">
                    {invoices.map((inv: { id: number | string; period: string; total_cents: number; status: string }) => (
                      <li key={String(inv.id)} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink">{inv.period}</span>
                        <span className="tabular-nums text-muted">
                          {money(inv.total_cents, { cents: true })} · {inv.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageShell>
    );
  } finally {
    await store.closePipelineDb(db);
  }
}
