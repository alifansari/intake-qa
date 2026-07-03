import { getReconciledCalls } from "@/lib/data";
import {
  METHODOLOGY,
  calibrationCounts,
  catchRate,
  flagPrecision,
  precisionByConfidence,
} from "@/lib/metrics";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { MiniStat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { InfoTip } from "@/components/ui/tooltip";
import { Annotation } from "@/components/demo-mode";
import { money, pct } from "@/lib/format";
import { OUTCOME_LABEL } from "@/lib/labels";

export default async function CalibrationPage() {
  const rows = await getReconciledCalls();
  const precision = flagPrecision(rows);
  const recall = catchRate(rows);
  const counts = calibrationCounts(rows);
  const byConf = precisionByConfidence(rows);

  const falseAlarms = rows
    .filter((r) => r.verdict === "false_alarm")
    .sort((a, b) => b.feeAtRisk - a.feeAtRisk);
  const missedCatches = rows
    .filter((r) => r.verdict === "missed_catch")
    .sort((a, b) => b.overall - a.overall);

  return (
    <PageShell>
      <PageHeader kicker="Where we're right, and where we're wrong" title="Calibration & Honesty" />

      <Annotation>
        Lead with this page on a skeptical call. Showing our misses first is what makes the
        precision number believable.
      </Annotation>

      {/* Plain-language precision sentence */}
      <Card className="mb-6 border-navy/20">
        <CardContent className="pt-6">
          <p className="font-display text-2xl leading-snug text-ink sm:text-3xl">
            When we flag a call as a lost signable case, we&rsquo;re right{" "}
            <span className="font-bold text-navy tnum">
              {precision == null ? "—" : pct(precision)}
            </span>{" "}
            of the time.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            And of the signable cases that actually walked out the door, we caught{" "}
            <span className="font-semibold text-ink tnum">
              {recall == null ? "—" : pct(recall)}
            </span>{" "}
            of them. <InfoTip>{METHODOLOGY.catchRate}</InfoTip>
          </p>
        </CardContent>
      </Card>

      {/* Confusion matrix + confidence bands */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <SectionTitle>The tally</SectionTitle>
            <div className="grid grid-cols-2 divide-x divide-y divide-line border border-line">
              <MiniStat label="Correct flags" value={String(counts.correctFlags)} tone="green" sub="incl. recovered" />
              <MiniStat label="False alarms" value={String(counts.falseAlarms)} tone="amber" sub="flagged, not signable" />
              <MiniStat label="Missed catches" value={String(counts.missedCatches)} tone="red" sub="signed elsewhere, unflagged" />
              <MiniStat label="Correct passes" value={String(counts.correctPasses)} sub="rightly not flagged" />
            </div>
            <p className="mt-2 text-xs text-muted">
              {counts.excluded} calls excluded — no confirmed outcome yet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <SectionTitle>
              Does confidence mean accuracy?
              <InfoTip>{METHODOLOGY.confidenceAccuracy}</InfoTip>
            </SectionTitle>
            <div className="flex flex-col gap-2">
              {byConf.map((c) => (
                <div key={c.confidence} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
                  <div className="text-sm capitalize text-ink">{c.confidence}</div>
                  <div className="h-4 overflow-hidden rounded-sm bg-canvas">
                    <div
                      className="h-full bg-navy"
                      style={{ width: `${(c.precision ?? 0) * 100}%` }}
                    />
                  </div>
                  <div className="tnum w-28 text-right text-sm">
                    <span className="font-semibold">{c.precision == null ? "—" : pct(c.precision)}</span>
                    <span className="ml-1 text-xs text-muted">
                      ({c.correctFlags}/{c.correctFlags + c.falseAlarms})
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              High-confidence flags should be right more often than low-confidence ones.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Our Misses — the required trust-builder */}
      <Card>
        <CardContent className="pt-5">
          <SectionTitle>
            Our misses
            <Badge tone="neutral">{falseAlarms.length + missedCatches.length}</Badge>
          </SectionTitle>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Every case where the score and reality disagreed. Click any call to see the flag,
            the evidence, and what actually happened.
          </p>

          <MissList
            title="False alarms — we flagged it, it wasn't signable"
            tone="amber"
            rows={falseAlarms}
          />
          <div className="h-5" />
          <MissList
            title="Missed catches — we didn't flag it, it signed elsewhere"
            tone="red"
            rows={missedCatches}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function MissList({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "amber" | "red";
  rows: Awaited<ReturnType<typeof getReconciledCalls>>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone === "red" ? "bg-red" : "bg-amber"}`} />
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-muted">({rows.length})</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">None in this dataset.</p>
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line">
          {rows.slice(0, 12).map((r) => (
            <li key={r.call.call_id}>
              <EvidenceDrawer row={r}>
                <button className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-canvas">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-navy">{r.call.call_id}</span>
                    <span className="text-xs text-muted">score {r.overall}</span>
                    <span className="text-xs text-muted">· {r.meta.rep}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="text-muted">{OUTCOME_LABEL[r.outcome.outcome_code]}</span>
                    {r.feeAtRisk ? (
                      <span className="tnum font-semibold text-red">{money(r.feeAtRisk)}</span>
                    ) : null}
                  </span>
                </button>
              </EvidenceDrawer>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
