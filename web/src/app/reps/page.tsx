// Team Coaching (Phase 6) — the coaching view. Callback rate, median
// time-to-callback, 15-minute SLA hit rate, and sign rate on flagged calls, so a
// team can see where the process slows down and fix it together. Reads the
// reconciled dashboard data (same source as the Recovery Funnel). Just-culture:
// we score the call, not the colleague; the number that matters is callback speed.

import { getReconciledCalls } from "@/lib/data";
import { repScoreboard } from "@/lib/metrics";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team Coaching — Intake QA" };

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
      <PageHeader kicker="Coaching" title="Team Coaching" />
      <Card>
        <CardContent className="pt-5">
          <p className="mb-4 rounded-sm border border-line bg-paper p-3 text-sm text-ink">
            We score the call, not the colleague. Each number points to one fixable step and the
            moment it happened, never a verdict on a person. Most misses are system misses. The
            number that matters is callback speed, because that is the one we can fix together.
          </p>
          <SectionTitle>Callback speed, by teammate</SectionTitle>
          <p className="mb-4 mt-1 text-sm text-muted">
            Over flagged (leaked-signable) calls. Faster callbacks recover more cases. The SLA
            target is a callback within 15 minutes.
          </p>
          {reps.length === 0 ? (
            <p className="text-sm text-muted">No flagged calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Teammate</th>
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
