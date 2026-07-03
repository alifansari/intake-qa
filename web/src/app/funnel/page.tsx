import { getReconciledCalls } from "@/lib/data";
import { METHODOLOGY, callbackDecay, recoveryFunnel } from "@/lib/metrics";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { CallbackDecayChart } from "@/components/charts";
import { CategoryBars } from "@/components/category-bars";
import { InfoTip } from "@/components/ui/tooltip";
import { Annotation } from "@/components/demo-mode";
import { money, pct, titleCase } from "@/lib/format";
import { COLORS } from "@/lib/colors";

export default async function FunnelPage() {
  const rows = await getReconciledCalls();
  const funnel = recoveryFunnel(rows);
  const decay = callbackDecay(rows);

  const flagged = rows.filter((r) => r.flagged);

  // Callback rate by rep (flagged calls only).
  const repMap = new Map<string, { total: number; cb: number }>();
  for (const r of flagged) {
    const m = repMap.get(r.meta.rep) ?? { total: 0, cb: 0 };
    m.total++;
    if (r.outcome.callback_made) m.cb++;
    repMap.set(r.meta.rep, m);
  }
  const repBars = [...repMap.entries()]
    .map(([label, m]) => ({ label, value: Math.round((m.cb / m.total) * 100), sub: `${m.cb}/${m.total}` }))
    .sort((a, b) => b.value - a.value);

  // Fee at risk by case type (flagged calls).
  const ctMap = new Map<string, number>();
  for (const r of flagged) {
    const ct = r.call.alerts?.revenue_at_risk?.case_type_matched ?? "unknown";
    ctMap.set(ct, (ctMap.get(ct) ?? 0) + r.feeAtRisk);
  }
  const ctBars = [...ctMap.entries()]
    .map(([label, value]) => ({ label: titleCase(label), value }))
    .sort((a, b) => b.value - a.value);

  const steps = [
    { label: "Flagged", n: funnel.flagged },
    { label: "Called back", n: funnel.calledBack },
    { label: "Reached", n: funnel.reached },
    { label: "Signed with us", n: funnel.signed },
  ];
  const maxN = Math.max(1, funnel.flagged);

  return (
    <PageShell>
      <PageHeader kicker="From flag to signed retainer" title="Recovery Funnel" />

      <Annotation>
        The drop from &ldquo;flagged&rdquo; to &ldquo;called back&rdquo; is the leak. Everything
        below it is money we could still recover with a faster callback habit.
      </Annotation>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <SectionTitle>Flagged → called back → reached → signed</SectionTitle>
            <div className="flex flex-col gap-3">
              {steps.map((s, i) => (
                <div key={s.label}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-ink">{s.label}</span>
                    <span className="tnum text-muted">
                      {s.n}
                      {i > 0 ? (
                        <span className="ml-2 text-xs">
                          {pct(s.n / (steps[i - 1].n || 1))} of prior
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-6 overflow-hidden rounded-sm bg-canvas">
                    <div
                      className="h-full"
                      style={{
                        width: `${(s.n / maxN) * 100}%`,
                        background:
                          i === 3 ? COLORS.green : i === 0 ? COLORS.red : COLORS.navy,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Of {funnel.flagged} flagged lost-signable calls, {funnel.calledBack} got a callback
              and {funnel.signed} were signed back with us.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <SectionTitle>
              Time-to-callback vs recovery
              <InfoTip>{METHODOLOGY.coldCallback}</InfoTip>
            </SectionTitle>
            <CallbackDecayChart data={decay} />
            <p className="mt-2 text-xs text-muted">
              Recovery sign rate collapses as the callback gets colder — speed is the lever.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <SectionTitle>Callback rate on flagged calls, by rep</SectionTitle>
            <CategoryBars data={repBars} valueFormat={(v) => `${v}%`} color={COLORS.navy} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <SectionTitle>Fee at risk by case type</SectionTitle>
            <CategoryBars data={ctBars} valueFormat={(v) => money(v)} color={COLORS.red} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
