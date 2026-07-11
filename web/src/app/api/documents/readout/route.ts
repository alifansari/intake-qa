// Renders the Leak Audit Readout PDF. No token → the self-contained demo fixture
// (a sample always renders). With `?token=<audit session>` it renders the REAL
// processed calls — but ONLY once the analyst has RELEASED the report
// (report_status = 'released'), the same Stage-6 gate the Leak Report enforces.
// An un-released real token 403s rather than shipping an un-reviewed deliverable
// (compliance-invariants §VII: a human approves before anything goes out). The
// engine modules load lazily so they stay out of the static bundle.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReadoutDoc } from "@/pdf/readout";
import { DEMO_DOC, type DocData } from "@/pdf/demo-fixture";
import { auditReportToDocData } from "@/lib/documents/from-audit.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  // No token → the shareable demo sample.
  if (!token) return renderPdf(DEMO_DOC, "leak-audit-readout-demo.pdf");

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return new Response("Readouts are not available in this environment.", { status: 503 });
  }
  const { buildAuditReport } = await import("../../../../../ingest/audit.mjs");
  const db = await store.openPipelineDb();
  try {
    const report = await buildAuditReport({ db, token });
    if (!report?.ok || !report.session) return new Response("Readout not found.", { status: 404 });
    // Release gate: only a RELEASED report renders real data. Before release the
    // auto-generated readout (generic case type, machine-picked quotes) must not
    // leave the building un-reviewed.
    const status = await store.getReportStatus(db, report.session.id);
    if (status?.report_status !== "released") {
      return new Response("This readout has not been released yet.", { status: 403 });
    }
    const doc = auditReportToDocData(report, { periodLabel: "Leak Audit" }) as DocData;
    return renderPdf(doc, "leak-audit-readout.pdf");
  } finally {
    await store.closePipelineDb(db);
  }
}

async function renderPdf(doc: DocData, filename: string) {
  const el = React.createElement(ReadoutDoc, { d: doc }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
