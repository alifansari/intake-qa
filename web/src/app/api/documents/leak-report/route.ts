// Renders the Intake Leak Report PDF — the client-facing forwarding artifact.
//
// - No `?token`: renders the self-contained SAMPLE (demo fixture) so a shareable
//   example always exists.
// - With `?token=<audit session>`: renders the REAL report, but ONLY if the analyst
//   has RELEASED it (report_status = 'released', the Stage 6 review gate). An unknown
//   token → 404; a token whose report isn't released yet → 403. This enforces that
//   no un-reviewed report can leave the building.
//
// Engine modules (store/audit) are imported lazily so they stay out of the bundle.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LeakReportDoc } from "@/pdf/leak-report";
import { DEMO_DOC } from "@/pdf/demo-fixture";
import { auditReportToDocData } from "@/lib/documents/from-audit.mjs";
import { composeLeakReport } from "../../../../lib/leak-report/compose.mjs";

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

  // No token → the shareable sample.
  if (!token) return pdf(composeLeakReport(DEMO_DOC), "intake-leak-report-sample.pdf");

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
    const doc = auditReportToDocData(report, { periodLabel: "Intake Leak Report" });
    return pdf(composeLeakReport(doc), "intake-leak-report.pdf");
  } finally {
    await store.closePipelineDb(db);
  }
}
