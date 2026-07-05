// Rep scoreboard (Phase 6) — the coaching view. Per-rep callback rate, median
// time-to-callback, 15-minute SLA hit rate, and sign rate on flagged calls, so an
// owner can see who follows up fast and who lets signable cases cool. Reads the
// reconciled dashboard data (same source as the Recovery Funnel).

import { getReconciledCalls } from "@/lib/data";
import { repScoreboard } from "@/lib/metrics";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rep scoreboard — Intake QA" };

function hrs(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export default async function RepsPage() {
  const rows = await getReconciledCalls();
  const reps = repScoreboard(rows);

  return (
    <PageShell>
      <PageHeader kicker="Coaching" title="Rep scoreboard" />
      <Card>
        <CardContent className="pt-5">
          <SectionTitle>Speed to lead, by rep</SectionTitle>
          <p className="mb-4 mt-1 text-sm text-muted">
            Over flagged (leaked-signable) calls. Faster callbacks recover more cases — the
            SLA target is a callback within 15 minutes.
          </p>
          {reps.length === 0 ? (
            <p className="text-sm text-muted">No flagged calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Rep</th>
                    <th className="py-2 pr-3">Flagged</th>
                    <th className="py-2 pr-3">Callback rate</th>
                    <th className="py-2 pr-3">Median callback</th>
                    <th className="py-2 pr-3">≤15m SLA hit</th>
                    <th className="py-2">Sign rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((r) => (
                    <tr key={r.rep} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-semibold text-ink">{r.rep}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.flagged}</td>
                      <td className="py-2 pr-3 tabular-nums">{pct(r.callbackRate)}</td>
                      <td className="py-2 pr-3 tabular-nums">{hrs(r.medianCallbackHours)}</td>
                      <td className="py-2 pr-3 tabular-nums">{pct(r.slaHitRate)}</td>
                      <td className="py-2 tabular-nums font-semibold text-ink">{pct(r.signRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
