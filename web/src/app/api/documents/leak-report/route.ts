// Renders the Intake Leak Report PDF — the client-facing forwarding artifact.
//
// - No `?token`: renders the self-contained SAMPLE (demo fixture) so a shareable
//   example always exists.
// - With `?token=<audit session>`: renders the REAL report, but ONLY if the analyst
//   has RELEASED it (report_status = 'released', the Stage 6 review gate). An unknown
//   token → 404; a token whose report isn’t released yet → 403. This enforces that
//   no un-reviewed report can leave the building.
//
// Engine modules (store/audit) are imported lazily so they stay out of the bundle.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LeakReportDoc } from "@/pdf/leak-report";
import { DEMO_DOC } from "@/pdf/demo-fixture";
import { auditReportToDocData } from "@/lib/documents/from-audit.mjs";
import { composeLeakReport } from "../../../../lib/leak-report/compose.mjs";
import { publishedFalseAlarmRate } from "@/lib/calibration-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdf(model: unknown, filename: string) {
  return renderToBuffer(
    React.createElement(
      LeakReportDoc,
      { model } as React.ComponentProps<typeof LeakReportDoc>,
    ) as unknown as Parameters<typeof renderToBuffer>[0],
  ).then(
    (buffer) =>
      new Response(new Uint8Array(buffer), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "no-store",
        },
      }),
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const falseAlarm = await publishedFalseAlarmRate();

  // No token → the shareable sample.
  if (!token) return pdf(composeLeakReport(DEMO_DOC, { falseAlarm }), "intake-leak-report-sample.pdf");

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return new Response("Reports are not available in this environment.", { status: 503 });
  }
  const { buildAuditReport } = await import("../../../../../ingest/audit.mjs");
  const db = await store.openPipelineDb();
  try {
    const report = await buildAuditReport({ db, token });
    if (!report?.ok || !report.session) {
      return new Response("Report not found.", { status: 404 });
    }
    // Release gate: only a RELEASED report may be rendered for real.
    const status = await store.getReportStatus(db, report.session.id);
    if (status?.report_status !== "released") {
      return new Response("This report has not been released yet.", { status: 403 });
    }
    // P0-B: attach the stored transcript citations (start_ms/verbatim_snippet)
    // onto each call so from-audit can turn qualifying facts into cited "[mm:ss]"
    // facts. Facts with no matching citation are dropped (never shipped uncited).
    const reportCalls: Array<Record<string, unknown>> =
      (report as { calls?: Array<Record<string, unknown>> }).calls ?? [];
    for (const c of reportCalls) {
      const flagId = (c?.flag_id ?? c?.flagId ?? null) as number | string | null;
      if (flagId != null && typeof store.getTranscriptCitations === "function") {
        try {
          c.citations = await store.getTranscriptCitations(db, flagId, { status: "verified" });
        } catch {
          c.citations = [];
        }
      }
    }
    const doc = auditReportToDocData(report, { periodLabel: "Intake Leak Report" });
    return pdf(composeLeakReport(doc, { falseAlarm }), "intake-leak-report.pdf");
  } finally {
    await store.closePipelineDb(db);
  }
}

// HEAD mirrors the GET release gate WITHOUT rendering a PDF, so the client can
// cheaply check whether the released report is available before opening it.
export async function HEAD(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response(null, { status: 200 }); // sample always exists

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) return new Response(null, { status: 503 });
  const { buildAuditReport } = await import("../../../../../ingest/audit.mjs");
  const db = await store.openPipelineDb();
  try {
    const report = await buildAuditReport({ db, token });
    if (!report?.ok || !report.session) return new Response(null, { status: 404 });
    const status = await store.getReportStatus(db, report.session.id);
    if (status?.report_status !== "released") return new Response(null, { status: 403 });
    return new Response(null, { status: 200 });
  } finally {
    await store.closePipelineDb(db);
  }
}
