// Firm-facing billing. Plain-English model explainer (flat monthly subscription,
// never per case) + this period’s subscription + past invoices + an ROI banner.
//
// The ROI banner shows recovered fees for CONTEXT ONLY — they are computed for
// display and NEVER affect the bill. The bill is a flat monthly subscription
// tiered by analyzed-call volume; signing cases changes nothing about it.

import { redirect } from "next/navigation";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolveDeskFirm } from "@/lib/desk/firm";
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
    // IDOR guard: a user gets THEIR firm (membership via resolveDeskFirm);
    // the ?firm= override is honored only for the founder.
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    const currentUser = isSupabaseConfigured() ? await getCurrentUser() : null;
    const isFounder = Boolean(
      founderEmail && currentUser?.email?.trim().toLowerCase() === founderEmail,
    );
    let firm = await resolveDeskFirm(db, store.listFirms);
    if (isFounder && firmParam) {
      const firms = await store.listFirms(db);
      const picked = firms.find((f: { id: unknown }) => String(f.id) === String(firmParam));
      if (picked) firm = { id: picked.id, name: String(picked.name ?? "Firm"), source: "fallback" };
    }
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
    const invoices = billing ? await store.listInvoices(db, firm.id) : [];
    const callsThisPeriod = billing ? await store.countCallsInPeriod(db, firm.id, PERIOD) : 0;
    const cap: number | null = billing?.monthly_call_cap ?? null;
    const overCap = cap != null && callsThisPeriod > cap;
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
                  <b>{money(billing.base_monthly_cents, { cents: true })}/mo</b> subscription
                  {cap != null ? <> for up to <b>{cap.toLocaleString()}</b> analyzed calls a month</> : null}.
                  Never a percentage of your fees, never a charge per signed or recovered case.
                </p>
                <p className="mt-1 text-xs text-faint">
                  You pay the same whether you sign zero cases or fifty. Recovered-fee figures below
                  are shown for ROI only and never affect your bill.
                </p>
              </CardContent>
            </Card>

            {/* This period */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">This period ({PERIOD})</p>
                    <p className="font-display text-2xl font-bold text-ink">
                      {money(billing.base_monthly_cents, { cents: true })}{" "}
                      <span className="text-sm font-semibold text-muted">monthly subscription</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {callsThisPeriod.toLocaleString()} call{callsThisPeriod === 1 ? "" : "s"} analyzed
                      {cap != null ? ` of ${cap.toLocaleString()} included` : ""}.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted">Fees you recovered (context)</p>
                    <p className="font-display text-2xl font-bold text-green">
                      {money(recoveredDisplayDollars)}
                    </p>
                  </div>
                </div>
                {overCap && (
                  <p className="mt-3 rounded-base border border-line bg-canvas px-3 py-2 text-sm text-ink">
                    You’ve analyzed more calls than this tier includes. Your bill doesn’t
                    change automatically — reach out and we’ll move you to the right tier.
                  </p>
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
