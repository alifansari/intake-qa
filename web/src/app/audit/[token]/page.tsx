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
  // Evidence cards: highest fee-at-risk first; top 3 open, the rest collapsed.
  // Research: a mini-audit with three sharp findings outconverts thirty cards.
  const rankedWalked = [...walkedCalls].sort((a, b) => (b.feeAtRisk ?? 0) - (a.feeAtRisk ?? 0));
  const topWalked = rankedWalked.slice(0, 3);
  const restWalked = rankedWalked.slice(3);

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
          {report.errored ? ` · ${report.errored} couldn't be processed` : ""}
        </p>
      </header>

      {/* 1. Sample-anchored headline (verifiable) */}
      <section className="mt-8">
        <p className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          An estimated <span className="text-red">{money(s.totalFeeAtRisk)}</span> in signable fees
          walked in {callCount === 1 ? "this" : "these"}{" "}
          <span className="tabular-nums">{callCount}</span> call{callCount === 1 ? "" : "s"}.
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Every figure below is tied to a specific call and the words the prospective client
          actually said. This is what we found in the sample you uploaded, not a projection.
        </p>
        {walkedCalls.length > 0 ? (
          <p className="mt-3 max-w-prose text-sm font-medium text-ink">
            You already paid to make these calls ring &mdash; the marketing worked; the intake
            didn&apos;t. And every day an unsigned caller waits is a day the insurance adjuster
            is negotiating with them alone.
          </p>
        ) : null}
      </section>

      {/* 2. Per-call evidence — the primary content (exhibit-level) */}
      {walkedCalls.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            The signable cases that walked, with the evidence
          </h2>
          <div className="mt-3 space-y-2">
            {topWalked.map((c) => (
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
            {restWalked.length > 0 ? (
              <details className="rounded-sm border border-line bg-paper p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  {restWalked.length} more flagged call{restWalked.length === 1 ? "" : "s"} ·{" "}
                  <span className="tabular-nums text-red">
                    {money(restWalked.reduce((sum, c) => sum + (c.feeAtRisk ?? 0), 0))}
                  </span>{" "}
                  at risk — open to see each
                </summary>
                <div className="mt-2 space-y-2">
                  {restWalked.map((c) => (
                    <div key={String(c.id)} className="border-t border-line pt-2 text-sm">
                      <p className="font-semibold text-ink">
                        {c.filename ?? "Call"} ·{" "}
                        <span className="tabular-nums text-red">{money(c.feeAtRisk ?? 0)}</span>
                      </p>
                      {c.summary && <p className="mt-1 text-muted">{c.summary}</p>}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </section>
      )}

      {/* No-leak sample: honest good news, not an empty page. */}
      {walkedCalls.length === 0 && (
        <section className="mt-8 rounded-sm border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">
            No signable case walked in this sample &mdash; that&apos;s genuinely good news.
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted">
            It means these {callCount === 1 ? "wasn&apos;t a call" : "weren&apos;t calls"} where a
            qualified, unrepresented caller slipped through. The handling score below still shows
            how the calls were worked &mdash; and a sample this small can&apos;t clear a whole
            intake operation. The honest way to know is a full month of calls.
          </p>
        </section>
      )}

      {/* The sample, in one line (replaces the tile grid — same facts, less page) */}
      <p className="mt-8 text-sm text-muted tabular-nums">
        The sample: <b className="text-ink">{callCount}</b> call{callCount === 1 ? "" : "s"} reviewed ·{" "}
        <b className="text-ink">{s.signableCalls}</b> signable ·{" "}
        <b className="text-ink">{signedCount}</b> signed on the call ·{" "}
        <b className="text-ink">{s.leakedSignable}</b> signable, not converted
      </p>

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
          <div className="mt-3 rounded-sm border border-line bg-paper p-4 text-sm text-muted">
            Industry context: in Clio&apos;s Legal Trends secret-shopper study of 500 firms, only{" "}
            <b className="text-ink">40%</b> answered their intake calls at all &mdash; and most
            callers hire the first firm that treats them well. A named peer benchmark for your
            score unlocks as the audit network grows.
          </div>
        )}
      </section>

      {/* 4. Sample same-day callback script (watermarked) */}
      {walkedCalls.some((c) => c.draftPreview) && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            The same-day callback script we&apos;d hand your staff
          </h2>
          <div className="mt-2 rounded-sm border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber">
              Draft preview: we never contact your callers
            </p>
            <p className="mt-2 text-sm text-ink">
              {walkedCalls.find((c) => c.draftPreview)?.draftPreview}
            </p>
          </div>
          <p className="mt-2 text-xs text-faint">
            Your own staff make every callback. The desk supplies the number, the evidence, and the words.
          </p>
        </section>
      )}

      {/* 5. CTA + email capture */}
      <section className="mt-12 rounded-lg border border-navy bg-navy-tint p-6 no-print">
        <h2 className="font-display text-xl font-semibold text-ink">
          Turn this audit into recovered cases
        </h2>
        <p className="mt-1 text-sm text-muted">
          Book a 20-minute walkthrough and we&apos;ll show you how your own team wins these cases
          back, compliantly — we find them, your staff make the calls.
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
          <AuditEmailCapture token={token} />
        </div>
      </section>

      <footer className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-faint">
        <p>
          <b className="text-muted">How we counted:</b> &ldquo;signable&rdquo; means qualified,
          unrepresented, and inside the filing window, based only on what was said on the call.
          Fee at risk = a conservative case-type settlement range &times; a standard contingency
          share, rounded down. Estimates, never guarantees. Misses are scored as process gaps,
          not people problems &mdash; no staff names appear on this page.
        </p>
        <p className="mt-1">
          <b className="text-muted">How callers are protected:</b> caller identities are redacted
          on this shared page; audio is deleted the moment it&apos;s transcribed; transcripts
          purge within 72 hours of your readout. Shareable link expires 30 days after creation ·
          not legal advice ·{" "}
          <a className="text-navy underline" href="/compliance">
            how we stay compliant
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
