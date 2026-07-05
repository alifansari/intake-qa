// The Leak Audit report — the shareable, printable "here's $X/month leaking from
// your intake" page. Server-rendered from the same buildAuditReport core the API
// uses. Statement design language: sober, numeric, honest (the arithmetic is
// shown). Tokenized + expiring; nothing here can send.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { money } from "@/lib/format";
import { AuditEmailCapture } from "@/components/audit-email-capture";
import type { AuditReport } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BenchmarkView = {
  available: boolean;
  snapshot?: { median_handling_score: number | null; contributor_count: number };
};

async function loadReport(
  token: string,
): Promise<{ report: AuditReport | null; benchmark: BenchmarkView }> {
  try {
    const store = await import("../../../../ingest/store.mjs");
    const { buildAuditReport } = await import("../../../../ingest/audit.mjs");
    const { getBenchmark } = await import("../../../../analytics/benchmarks.mjs");
    if (!store.pipelineDbConfigured()) return { report: null, benchmark: { available: false } };
    const db = await store.openPipelineDb();
    try {
      const report = (await buildAuditReport({ db, token })) as AuditReport;
      const benchmark = (await getBenchmark({ db })) as BenchmarkView;
      return { report, benchmark };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    return { report: null, benchmark: { available: false } };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const { report } = await loadReport(token);
  const leak = report?.summary?.projectedMonthlyLeakage;
  const title = "Your firm's Intake Leak Audit";
  const description =
    leak != null
      ? `Estimated ${money(leak)}/month in signable cases leaking from intake.`
      : "A leak audit of your intake calls from Intake QA.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { report, benchmark } = await loadReport(token);
  if (!report || !report.ok || !report.summary) notFound();

  const s = report.summary;
  const calls = report.calls ?? [];
  const leakedCalls = calls.filter((c) => c.leaked === true);
  const signedCount = 0; // demo uploads have no "signed with us" outcome; shown for honesty
  const calendarUrl = process.env.AUDIT_CALENDAR_URL || "";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:py-2">
      {/* Masthead */}
      <header className="border-b border-ink pb-4">
        <p className="eyebrow">Intake QA · Leak Audit</p>
        <h1 className="font-display text-3xl font-bold text-ink">Intake Leak Audit</h1>
        <p className="mt-1 text-sm text-muted">
          {s.callsReviewed} call{s.callsReviewed === 1 ? "" : "s"} reviewed
          {report.pending ? ` · ${report.pending} still processing` : ""}
        </p>
      </header>

      {/* 1. Headline number + honest arithmetic */}
      <section className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          Estimated monthly leakage
        </p>
        <p className="mt-1 font-display text-5xl font-bold text-red">
          {money(s.projectedMonthlyLeakage)}
          <span className="text-lg font-semibold text-muted"> / month</span>
        </p>
        <p className="mt-3 max-w-prose text-sm text-muted">
          Based on <b>{money(s.totalFeeAtRisk)}</b> in signable fees at risk across{" "}
          <b>{s.callsReviewed}</b> reviewed call{s.callsReviewed === 1 ? "" : "s"}
          {" "}({money(s.perCallLeak)}/call), projected over{" "}
          <b>{s.monthlyCallVolume.toLocaleString()}</b>{" "}
          {s.assumedVolume ? "assumed " : ""}monthly calls.
        </p>
        <p className="mt-2 text-xs text-faint">
          Estimate, not a guarantee. Small sample; fee figures are labeled estimates by case
          type, not case valuations. Confirm against your own numbers.
        </p>
      </section>

      {/* 2. Waterfall */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Where cases leak</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Calls reviewed", value: s.callsReviewed },
            { label: "Signable", value: s.signableCalls },
            { label: "Signed on the call", value: signedCount },
            { label: "Leaked (signable, not converted)", value: s.leakedSignable },
          ].map((step) => (
            <div key={step.label} className="rounded-sm border border-line bg-paper p-3">
              <p className="font-display text-2xl font-bold text-ink tabular-nums">{step.value}</p>
              <p className="mt-0.5 text-xs text-muted">{step.label}</p>
            </div>
          ))}
        </div>

        {leakedCalls.length > 0 && (
          <div className="mt-5 space-y-2">
            {leakedCalls.map((c) => (
              <details
                key={String(c.id)}
                className="rounded-sm border border-red bg-red-tint p-3"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink">
                  <span>
                    Leaked signable case
                    {c.filename ? ` · ${c.filename}` : ""}
                  </span>
                  <span className="text-red">{money(c.feeAtRisk ?? 0)} at risk</span>
                </summary>
                <div className="mt-2 space-y-2 text-sm text-ink">
                  {c.summary && <p className="text-muted">{c.summary}</p>}
                  {Array.isArray(c.evidenceQuotes) && c.evidenceQuotes.length > 0 && (
                    <ul className="space-y-1">
                      {c.evidenceQuotes.map((q, i) => (
                        <li key={i} className="border-l-2 border-red pl-2 text-muted">
                          “{q}”
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* 3. Handling-score distribution (benchmark unlocks with pilot) */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Handling scores</h2>
        <p className="mt-1 text-sm text-muted">
          Average handling score:{" "}
          <b className="text-ink">{s.avgHandlingScore ?? "—"}</b> / 100.
        </p>
        {benchmark.available && benchmark.snapshot ? (
          <div className="mt-3 rounded-sm border border-line bg-paper p-4 text-sm text-ink">
            Peer benchmark: participating firms&apos; median handling score is{" "}
            <b>{Math.round(benchmark.snapshot.median_handling_score ?? 0)}</b> / 100
            {s.avgHandlingScore != null ? (
              <>
                {" "}
                — your average of <b>{s.avgHandlingScore}</b> is{" "}
                <b className={s.avgHandlingScore >= (benchmark.snapshot.median_handling_score ?? 0) ? "text-green" : "text-red"}>
                  {s.avgHandlingScore >= (benchmark.snapshot.median_handling_score ?? 0) ? "above" : "below"}
                </b>{" "}
                the network median.
              </>
            ) : null}
            <span className="ml-1 text-xs text-faint">
              (across {benchmark.snapshot.contributor_count} firms)
            </span>
          </div>
        ) : (
          <div className="mt-3 rounded-sm border border-dashed border-line bg-paper p-4 text-sm text-faint">
            Peer benchmark — how your intake compares to other firms —{" "}
            <span className="font-semibold text-muted">unlocks as the network grows</span>.
          </div>
        )}
      </section>

      {/* 4. Sample win-back SMS (watermarked) */}
      {leakedCalls.some((c) => c.draftPreview) && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            A win-back text we&apos;d draft
          </h2>
          <div className="mt-2 rounded-sm border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber">
              Draft preview — nothing is sent
            </p>
            <p className="mt-2 text-sm text-ink">
              {leakedCalls.find((c) => c.draftPreview)?.draftPreview}
            </p>
          </div>
          <p className="mt-2 text-xs text-faint">
            In the product, a human approves every message before it can send.
          </p>
        </section>
      )}

      {/* 5. CTA + email capture */}
      <section className="mt-12 rounded-lg border border-navy bg-navy-tint p-6 no-print">
        <h2 className="font-display text-xl font-semibold text-ink">
          Turn this audit into recovered cases
        </h2>
        <p className="mt-1 text-sm text-muted">
          Book a 20-minute walkthrough and we&apos;ll show you how to win these cases back —
          compliantly, with a human approving every text.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {calendarUrl ? (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-navy px-5 py-2.5 text-sm font-semibold text-white"
            >
              Book a 20-minute walkthrough
            </a>
          ) : null}
          <AuditEmailCapture token={token} />
        </div>
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-faint">
        Shareable link · expires 30 days after creation · demo estimates, not legal advice ·{" "}
        <a className="text-navy underline" href="/compliance">
          how we stay compliant
        </a>
        .
      </footer>
    </div>
  );
}
