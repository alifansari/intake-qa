import { getReconciledCalls } from "@/lib/data";
import {
  METHODOLOGY,
  callbackLift,
  dataQuality,
  flagPrecision,
  medianTimeToCallback,
  recoveredFees,
  signRateByBand,
  whatIfRecovery,
} from "@/lib/metrics";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { HeroStat, MiniStat } from "@/components/stat";
import { SignRateByBandChart } from "@/components/charts";
import { WhatIf } from "@/components/what-if";
import { PrintButton } from "@/components/print-button";
import { Annotation } from "@/components/demo-mode";
import { money, pct, pctPoints } from "@/lib/format";

export default async function ExecutiveSummary() {
  const rows = await getReconciledCalls();

  const precision = flagPrecision(rows);
  const lift = callbackLift(rows);
  const fees = recoveredFees(rows);
  const bands = signRateByBand(rows);
  const dq = dataQuality(rows);
  const medianTtc = medianTimeToCallback(rows);

  const flagged = rows.filter((r) => r.flagged);
  const wi = whatIfRecovery(rows, 0.8);
  const avgFee =
    flagged.length > 0
      ? flagged.reduce((s, r) => s + r.feeAtRisk, 0) / flagged.length
      : 0;
  const totalAtRisk = flagged.reduce((s, r) => s + r.feeAtRisk, 0);

  return (
    <PageShell>
      <PageHeader kicker="Did the score predict reality?" title="Outcome Reconciliation">
        <PrintButton />
      </PageHeader>

      <Annotation>
        Every number here is checked against what actually happened to the lead — signed with
        us, signed elsewhere, or disqualified. This is the honesty page.
      </Annotation>

      {/* Three hero numbers */}
      <Card className="print-plain mb-6">
        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <HeroStat
            label="Recovered fees (conservative)"
            value={money(fees.conservative)}
            secondary={`optimistic ${money(fees.optimistic)}`}
            sub={`${fees.conservativeCount} flagged calls signed with us after a callback, within 14 days.`}
            tone="green"
            method={METHODOLOGY.recoveredFees}
          />
          <HeroStat
            label="Callback conversion lift"
            value={lift.lift == null ? "—" : pctPoints(lift.lift)}
            secondary={`${pct(lift.withCallbackRate)} with callback vs ${pct(lift.withoutCallbackRate)} without`}
            sub="How much more often a flagged lead signs when someone calls them back."
            tone="navy"
            method={METHODOLOGY.callbackLift}
          />
          <HeroStat
            label="Flag precision"
            value={precision == null ? "—" : pct(precision)}
            sub={
              precision == null
                ? "Not enough resolved flags yet."
                : `When we flag a call as a lost signable case, we're right ${pct(precision)} of the time.`
            }
            tone="ink"
            method={METHODOLOGY.flagPrecision}
          />
        </div>
      </Card>

      {/* Hero chart */}
      <Card className="print-plain mb-6">
        <CardContent className="pt-5">
          <SectionTitle>Sign rate by score band — does the score predict reality?</SectionTitle>
          <Annotation>
            This is the proof. If our score were noise these bars would be flat. Instead the
            80+ calls sign far more often than the under-40 calls.
          </Annotation>
          <SignRateByBandChart data={bands} />
          <p className="mt-2 text-xs text-muted">{METHODOLOGY.signRateByBand}</p>
        </CardContent>
      </Card>

      {/* Secondary strip + what-if */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="print-plain">
          <div className="grid grid-cols-2 divide-x divide-y divide-line">
            <MiniStat
              label="Total fee at risk (flagged)"
              value={money(totalAtRisk)}
              sub={`${flagged.length} flagged calls`}
              tone="red"
            />
            <MiniStat
              label="Flagged calls"
              value={String(flagged.length)}
              sub={`${pct(flagged.length / (rows.length || 1))} of all calls`}
            />
            <MiniStat
              label="Median time to callback"
              value={medianTtc == null ? "—" : `${Math.round(medianTtc)}h`}
              sub="on calls that got a callback"
              tone="navy"
            />
            <MiniStat
              label="Data quality"
              value={pct(1 - dq.pctUnknown)}
              sub={`${dq.unknown} of ${dq.total} calls still need an outcome`}
              tone={dq.pctUnknown > 0.2 ? "amber" : "ink"}
              method={METHODOLOGY.dataQuality}
            />
          </div>
        </Card>

        <Card className="print-plain no-print">
          <CardContent className="pt-5">
            <SectionTitle>What-if: the cost of slow callbacks</SectionTitle>
            <WhatIf
              flaggedCount={flagged.length}
              currentCallbackRate={wi.currentCallbackRate}
              signRateOnCallback={wi.signRateOnCallback}
              avgFee={avgFee}
            />
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 border-t border-line pt-3 text-center text-xs text-faint">
        Reconciled from {rows.length} scored intake calls · figures exclude calls without a
        confirmed outcome · demo dataset
      </p>
    </PageShell>
  );
}
