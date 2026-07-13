// /desk/calibration — THE CALIBRATION REPORT. The credibility spine of the
// independent-audit product, made visible: "when we said SIGN, you signed X%".
// It joins every triage call's grade to what the firm actually did and shows
// the accuracy, the confusion matrix, and — named and weighted heaviest — the
// cases we told the firm to pass that it signed anyway.
//
// Firm-scoped like every desk page. Degrades to a friendly panel with no DB and
// an honest "still filling in" state before enough cases have been decided.
// Compliance (§IV): no headline rate is shown under the minimum sample; every
// rate carries its count and confidence range.
import { resolveDeskFirm } from "@/lib/desk/firm";
import {
  buildCalibrationReport,
  DISPOSITION_LABEL,
  MIN_PUBLISH_N,
  TRIAGE_METHODOLOGY,
} from "@/lib/desk/triage-reconcile.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "How accurate are our calls? — Intake QA" };

type Wilson = { point: number | null; lo: number | null; hi: number | null; n: number };

function pct(x: number | null): string {
  return x == null ? "—" : `${Math.round(x * 100)}%`;
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-6">
      <p className="eyebrow text-accent">The independent audit</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">{body}</p>
    </section>
  );
}

export default async function CalibrationPage() {
  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    return (
      <EmptyPanel
        title="How accurate are our calls?"
        body="Your calibration report appears here once your desk is connected. It compares every case we graded to what your firm actually did, so you can see for yourself how often our call matches yours."
      />
    );
  }
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) {
      return (
        <EmptyPanel
          title="How accurate are our calls?"
          body="Your calibration report appears here once your desk is connected."
        />
      );
    }
    let rows: Record<string, unknown>[] = [];
    try {
      rows = (await store.getTriageCasesForCalibration(db, firm.id)) as Record<string, unknown>[];
    } catch {
      // tables not migrated yet — show the empty state rather than error.
    }
    const report = buildCalibrationReport(rows);
    return <CalibrationReport report={report} />;
  } finally {
    await store.closePipelineDb(db);
  }
}

// ---------------------------------------------------------------------------
// Render. Pure presentation over the report payload from triage-reconcile.mjs.
// ---------------------------------------------------------------------------
type Report = ReturnType<typeof buildCalibrationReport>;

function CalibrationReport({ report }: { report: Report }) {
  const dq = report.dataQuality as { total: number; resolved: number; open: number };
  const decided = dq.resolved;

  // Before any case has been decided, show the honest "still filling in" state.
  if (decided === 0) {
    return (
      <EmptyPanel
        title="How accurate are our calls?"
        body={`Your calibration report starts filling in the moment your team marks a triaged call Signed, Declined, or Referred. It compares what we said to what you did — nothing to show yet because no cases have been decided.`}
      />
    );
  }

  const enough = decided >= MIN_PUBLISH_N;
  const sign = report.signPrecision as Wilson;
  const pass = report.passPrecision as Wilson;
  const agree = report.overallAgreement as Wilson;
  const wd = report.wrongfulDeclines as {
    count: number;
    ofAdvisedAgainst: number;
    rate: number | null;
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow text-accent">The independent audit</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          How accurate are our calls?
        </h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Every case we graded, checked against what your firm actually did. This is how you
          know the grade is worth trusting — we hold ourselves to your own decisions.
        </p>
      </header>

      {!enough && (
        <div className="rounded-card border border-hairline bg-amber-tint/40 p-4">
          <p className="text-sm text-ink">
            <span className="font-semibold text-amber">Still building.</span> We do not publish a
            headline accuracy rate until at least {MIN_PUBLISH_N} cases have been decided. So far{" "}
            <span className="tnum font-semibold">{decided}</span> {decided === 1 ? "case has" : "cases have"}{" "}
            reached a decision. The counts below are real; the percentages will turn on at{" "}
            {MIN_PUBLISH_N}.
          </p>
        </div>
      )}

      {/* Headline accuracy cards — rates only once the sample is large enough. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="When we said Sign, you signed"
          w={sign}
          show={enough}
        />
        <StatCard
          label="When we said Pass, you passed"
          w={pass}
          show={enough}
        />
        <StatCard
          label="Overall, we agreed with you"
          w={agree}
          show={enough}
        />
      </div>

      {/* The wrongful-decline callout — the one error that costs a firm a case. */}
      <section
        className={`rounded-card border p-5 ${
          wd.count > 0 ? "border-red/30 bg-red-tint/40" : "border-hairline bg-surface"
        }`}
      >
        <p className="eyebrow text-red">The error we watch hardest</p>
        <p className="mt-2 text-sm text-ink">
          Cases we told you to pass on that you signed anyway:{" "}
          <span className="tnum font-bold text-ink">{wd.count}</span>
          {wd.ofAdvisedAgainst > 0 && (
            <span className="text-ink-muted">
              {" "}
              of {wd.ofAdvisedAgainst} we advised against ({pct(wd.rate)})
            </span>
          )}
          .
        </p>
        <p className="mt-2 max-w-[70ch] text-xs text-ink-muted">
          {TRIAGE_METHODOLOGY.wrongfulDeclines}
        </p>
      </section>

      {/* The confusion matrix. */}
      <section className="rounded-card border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          What we said, and what you did
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Each row is a call we made; each column is what the case became. The diagonal is
          agreement.
        </p>
        <div className="mt-4 overflow-x-auto">
          <ConfusionTable report={report} />
        </div>
      </section>

      {/* Honesty footer. */}
      <footer className="rounded-card border border-hairline bg-canvas p-5">
        <p className="eyebrow text-ink-muted">How we count</p>
        <p className="mt-2 text-sm text-ink">
          <span className="tnum font-semibold">{dq.resolved}</span> decided ·{" "}
          <span className="tnum font-semibold">{dq.open}</span> still open ·{" "}
          <span className="tnum font-semibold">{dq.total}</span> total graded.
        </p>
        <p className="mt-2 max-w-[75ch] text-xs text-ink-muted">
          {TRIAGE_METHODOLOGY.minPublishN} {TRIAGE_METHODOLOGY.dataQuality}
        </p>
      </footer>
    </div>
  );
}

function StatCard({ label, w, show }: { label: string; w: Wilson; show: boolean }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <p className="eyebrow text-ink-muted">{label}</p>
      {show && w.point != null ? (
        <>
          <p className="mt-2 font-display text-3xl font-bold text-ink tnum">{pct(w.point)}</p>
          <p className="mt-1 text-xs text-ink-muted tnum">
            range {pct(w.lo)}–{pct(w.hi)} · n={w.n}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl font-bold text-ink-muted tnum">
            {w.n > 0 ? w.n : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {w.n > 0 ? `${w.n} decided so far` : "no decisions yet"}
          </p>
        </>
      )}
    </div>
  );
}

function ConfusionTable({ report }: { report: Report }) {
  const conf = report.confusion as unknown as {
    matrix: Record<string, { signed: number; declined: number; referred: number }>;
    rowTotals: Record<string, number>;
  };
  const dispositions = Object.keys(DISPOSITION_LABEL) as Array<keyof typeof DISPOSITION_LABEL>;
  const cols: Array<{ key: "signed" | "declined" | "referred"; label: string }> = [
    { key: "signed", label: "Signed" },
    { key: "declined", label: "Declined" },
    { key: "referred", label: "Referred" },
  ];
  // The cells that vindicate each call (for a subtle "agreement" highlight).
  const agreeCell: Record<string, string[]> = {
    sign_now: ["signed"],
    decline_with_grace: ["declined", "referred"],
    refer_out: ["referred", "declined"],
    develop: [],
  };
  return (
    <table className="w-full min-w-[28rem] border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-muted">
          <th className="py-2 pr-3 font-medium">We said</th>
          {cols.map((c) => (
            <th key={c.key} className="px-3 py-2 text-right font-medium">
              {c.label}
            </th>
          ))}
          <th className="pl-3 py-2 text-right font-medium">Decided</th>
        </tr>
      </thead>
      <tbody>
        {dispositions.map((d) => (
          <tr key={d} className="border-t border-hairline">
            <td className="py-2 pr-3 font-semibold text-ink">{DISPOSITION_LABEL[d]}</td>
            {cols.map((c) => {
              const val = conf.matrix[d]?.[c.key] ?? 0;
              const isAgree = agreeCell[d]?.includes(c.key);
              return (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-right tnum ${
                    isAgree && val > 0 ? "font-semibold text-accent" : "text-ink"
                  }`}
                >
                  {val || "·"}
                </td>
              );
            })}
            <td className="pl-3 py-2 text-right tnum text-ink-muted">
              {conf.rowTotals[d] ?? 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
