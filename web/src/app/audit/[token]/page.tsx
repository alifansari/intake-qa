// The Leak Audit report — the shareable, printable exhibit of the
// signable fees that walked in the uploaded calls. Headline is anchored to the
// VERIFIABLE sample figure; per-call evidence is the primary content; the
// monthly figure is a demoted, clearly-labeled range. Server-rendered from the
// buildAuditReport core. Tokenized + expiring; nothing here can send.

import type { Metadata } from "next";
import { money } from "@/lib/format";
import { AuditEmailCapture } from "@/components/audit-email-capture";
import { ReportActions } from "@/components/audit/ReportActions";
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
  const totalFeeAtRisk = report?.summary?.totalFeeAtRisk;
  const callCount = report?.summary?.callsReviewed;
  const title = "Leak Audit";
  const description =
    totalFeeAtRisk != null && callCount != null
      ? `${money(totalFeeAtRisk)} in signable fees identified across ${callCount} reviewed calls. See the evidence.`
      : "A Leak Audit of your intake calls from Intake QA.";
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
  if (!report || !report.ok || !report.summary) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="eyebrow">Leak Audit</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          This report link has expired
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-muted">
          Reports expire 30 days after creation to protect your data. Re-run your audit or email us
          for a refreshed link.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/audit" className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
            Run your free Leak Audit
          </a>
          <a href="/" className="rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
            Back to home
          </a>
        </div>
      </div>
    );
  }

  const s = report.summary;
  const calls = report.calls ?? [];

  // HONESTY GUARD: a report with zero reviewed calls is a processing failure,
  // not a finding. "$0 walked in these 0 calls" reads as a false all-clear —
  // never show it. Own the snag and give the human path instead.
  if (s.callsReviewed === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="eyebrow">Leak Audit</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          We hit a snag on our side
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-muted">
          Your recordings reached us but didn&apos;t make it through processing — that&apos;s our
          problem, not yours, and nothing was lost. Email the files to{" "}
          <a href="mailto:ali@plaintiffops.com?subject=Leak%20Audit%20snag" className="font-semibold text-navy underline">
            ali@plaintiffops.com
          </a>{" "}
          and a human will run your audit by hand today, free as promised.
        </p>
        <div className="mt-6">
          <a href="/audit" className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
            Or try the upload again
          </a>
        </div>
      </div>
    );
  }
  const walkedCalls = calls.filter((c) => c.leaked === true);
  const callCount = s.callsReviewed;
  const signedCount = 0; // uploaded calls have no "signed with us" outcome; shown for honesty
  const calendarUrl = process.env.AUDIT_CALENDAR_URL || "";
  // Demoted monthly projection, presented as a RANGE — the low end applies a
  // conservative 50% haircut to the observed per-call rate. Never a claim.
  const projMonthlyHigh = s.projectedMonthlyLeakage;
  const projMonthlyLow = Math.round(s.projectedMonthlyLeakage * 0.5);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:py-2">
      {/* Save-as-PDF + view logging (Stage 5) */}
      <ReportActions token={token} />

      {/* Masthead */}
      <header className="border-b border-ink pb-4">
        <p className="eyebrow">Intake QA · Leak Audit</p>
        <h1 className="font-display text-3xl font-bold text-ink">Leak Audit</h1>
        <p className="mt-1 text-sm text-muted">
          {callCount} call{callCount === 1 ? "" : "s"} reviewed
          {report.pending ? ` · ${report.pending} still processing` : ""}
        </p>
      </header>

      {/* 1. Sample-anchored headline (verifiable) */}
      <section className="mt-8">
        <p className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          <span className="text-red">{money(s.totalFeeAtRisk)}</span> in signable fees walked in{" "}
          {callCount === 1 ? "this" : "these"}{" "}
          <span className="tabular-nums">{callCount}</span> call{callCount === 1 ? "" : "s"}.
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Every figure below is tied to a specific call and the words the prospective client
          actually said. This is what we found in the sample you uploaded, not a projection.
        </p>
      </section>

      {/* 2. Per-call evidence — the primary content (exhibit-level) */}
      {walkedCalls.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            The signable cases that walked, with the evidence
          </h2>
          <div className="mt-3 space-y-2">
            {walkedCalls.map((c) => (
              <details
                key={String(c.id)}
                open
                className="rounded-sm border border-red bg-red-tint p-3"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink">
                  <span>Signable case that walked{c.filename ? ` · ${c.filename}` : ""}</span>
                  <span className="tabular-nums text-red">{money(c.feeAtRisk ?? 0)} at risk</span>
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
        </section>
      )}

      {/* 3. Demoted monthly projection — a labeled RANGE, not a claim */}
      <section className="mt-8 rounded-sm border border-line bg-paper p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          What a full month might look like
        </p>
        <p className="mt-2 max-w-prose text-sm text-ink">
          If this rate held for a full month, that&apos;s roughly{" "}
          <b className="tabular-nums">{money(projMonthlyLow)}</b> to{" "}
          <b className="tabular-nums">{money(projMonthlyHigh)}</b>, and the low end conservatively
          assumes only half the rate we observed. The honest way to know is to run a full month.
        </p>
        <p className="mt-2 text-xs text-faint">
          A projection, not a claim or a guarantee, just a reason to run a full month. Based on{" "}
          {callCount} call{callCount === 1 ? "" : "s"} ({money(s.perCallLeak)}/call) over an assumed{" "}
          {s.monthlyCallVolume.toLocaleString()} monthly calls.
        </p>
      </section>

      {/* 4. Waterfall summary */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">The sample, by the numbers</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Calls reviewed", value: callCount },
            { label: "Signable", value: s.signableCalls },
            { label: "Signed on the call", value: signedCount },
            { label: "Signable, not converted", value: s.leakedSignable },
          ].map((step) => (
            <div key={step.label} className="rounded-sm border border-line bg-paper p-3">
              <p className="font-display text-2xl font-bold text-ink tabular-nums">{step.value}</p>
              <p className="mt-0.5 text-xs text-muted">{step.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Handling-score distribution (benchmark unlocks with pilot) */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Handling scores</h2>
        <p className="mt-1 text-sm text-muted">
          Average handling score:{" "}
          <b className="text-ink">{s.avgHandlingScore ?? "n/a"}</b> / 100.
        </p>
        {benchmark.available && benchmark.snapshot ? (
          <div className="mt-3 rounded-sm border border-line bg-paper p-4 text-sm text-ink">
            Peer benchmark: participating firms&apos; median handling score is{" "}
            <b>{Math.round(benchmark.snapshot.median_handling_score ?? 0)}</b> / 100
            {s.avgHandlingScore != null ? (
              <>
                {" "}
                and your average of <b>{s.avgHandlingScore}</b> is{" "}
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
            Peer benchmark (how your intake compares to other firms){" "}
            <span className="font-semibold text-muted">unlocks as the network grows</span>.
          </div>
        )}
      </section>

      {/* 4. Sample same-day save-protocol text (watermarked) */}
      {walkedCalls.some((c) => c.draftPreview) && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            A same-day save-protocol text we&apos;d draft
          </h2>
          <div className="mt-2 rounded-sm border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber">
              Draft preview: nothing is sent
            </p>
            <p className="mt-2 text-sm text-ink">
              {walkedCalls.find((c) => c.draftPreview)?.draftPreview}
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
          Book a 20-minute walkthrough and we&apos;ll show you how to win these cases back,
          compliantly, with a human approving every text.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* The headline action never disappears: no calendar configured →
              the button becomes a direct email instead of silently vanishing. */}
          <a
            href={calendarUrl || "mailto:ali@plaintiffops.com?subject=Leak%20Audit%20walkthrough"}
            {...(calendarUrl ? { target: "_blank", rel: "noreferrer" } : {})}
            className="rounded-sm bg-navy px-5 py-2.5 text-sm font-semibold text-white"
          >
            Book a 20-minute walkthrough
          </a>
          <a
            href="/apply"
            className="rounded-sm border border-navy px-5 py-2.5 text-sm font-semibold text-navy"
          >
            Apply for a founding seat
          </a>
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
