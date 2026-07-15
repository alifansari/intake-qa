// Marketing Signal — "where should the next marketing dollar go?"
//
// Attributes SIGNABLE-CASE VALUE (not just lead count) to each lead source, the
// axis a cost-per-lead tool can't see. Manager/owner view. Small-N sources are
// labeled "building" (§IV: no false precision); every figure is a signable-value
// estimate from the scoring engine, never a guarantee and never cost-per-signed
// (we hold no ad spend).
import Link from "next/link";
import { fmtK } from "@/lib/desk/money.mjs";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { getUserRole, isManagerRole } from "@/lib/desk/roles";
import { aggregateMarketingSignal } from "@/lib/desk/marketing-signal.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing signal — Intake QA" };

type Row = { lead_source: string | null; case_signability: string | null; revenue_at_risk_cents: number | null };
type Group = {
  source: string;
  calls: number;
  signable: number;
  signableRate: number;
  junkRate: number;
  signableValueCents: number;
  valuePerCallCents: number;
  rankable: boolean;
};

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export default async function MarketingSignal() {
  let groups: Group[] = [];
  let headline: { bestSource: string; worstSource: string; multiple: number } | null = null;
  let totalCalls = 0;
  let firmName: string | undefined;
  let gated = false;

  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (firm) {
      const role = await getUserRole(db, firm.id);
      if (!isManagerRole(role)) {
        gated = true;
      } else {
        firmName = firm.name;
        const rows = (await store.listCallsWithSourceForSignal(db, firm.id)) as Row[];
        const agg = aggregateMarketingSignal(rows);
        groups = agg.groups as Group[];
        headline = agg.headline;
        totalCalls = agg.totalCalls;
      }
    }
  } finally {
    await store.closePipelineDb(db);
  }

  if (gated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ink-muted">
          The marketing signal is a manager view.{" "}
          <Link href="/desk" className="text-accent hover:underline">Back to your queue</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
        {firmName ? `${firmName} · ` : ""}Marketing signal
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink">Where the signable value comes from</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Not cost per lead — signable case <em>value</em> per lead source. The channel that fills the pipe
        cheapest is often not the one that signs.
      </p>

      {headline ? (
        <div className="mt-5 rounded-card border border-line bg-canvas p-4">
          <div className="text-sm text-ink">
            <span className="font-semibold">{headline.bestSource}</span> produces{" "}
            <span className="font-semibold text-accent">{headline.multiple.toFixed(1)}×</span>{" "}
            the signable value per call of <span className="font-semibold">{headline.worstSource}</span>.
          </div>
          <div className="mt-1 text-xs text-faint">Among sources with enough scored calls to rank. An estimate, not a guarantee.</div>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-canvas p-6 text-sm text-ink-muted">
          No attributed calls scored yet. Lead source appears here as new CallRail calls are scored — this fills in on its own.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3 text-right">Scored calls</th>
                <th className="py-2 pr-3 text-right">Signable rate</th>
                <th className="py-2 pr-3 text-right">Signable value</th>
                <th className="py-2 pr-3 text-right">Value / call</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.source} className="border-b border-hairline">
                  <td className="py-2 pr-3 text-ink">
                    {g.source}
                    {!g.rankable ? (
                      <span className="ml-2 rounded-base bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase text-faint">building</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right tnum text-ink-muted">{g.calls}</td>
                  <td className="py-2 pr-3 text-right tnum text-ink-muted">{g.rankable ? pct(g.signableRate) : "—"}</td>
                  <td className="py-2 pr-3 text-right tnum text-ink">{fmtK(g.signableValueCents)}</td>
                  <td className="py-2 pr-3 text-right tnum text-ink-muted">{g.rankable ? fmtK(g.valuePerCallCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 border-t border-hairline pt-3 text-[11px] leading-relaxed text-faint">
        Signable value is an estimate from the scoring engine (dollars at risk on signable calls), not a guarantee and
        not cost-per-signed-case. Sources with fewer than 5 scored calls are marked “building” and are not ranked.
        Based on {totalCalls} scored call{totalCalls === 1 ? "" : "s"} with a known lead source.
      </p>
    </main>
  );
}
