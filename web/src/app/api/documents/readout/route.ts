// Renders the Leak Audit Readout PDF. With `?token=<audit session>` it renders the
// REAL processed calls for that session; with no token (or if Supabase isn't
// configured / the token is unknown) it falls back to the self-contained demo
// fixture so a sample always renders. The engine modules are loaded lazily (same
// pattern as the audit page) so they stay out of the static bundle.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReadoutDoc } from "@/pdf/readout";
import { DEMO_DOC, type DocData } from "@/pdf/demo-fixture";
import { auditReportToDocData } from "@/lib/documents/from-audit.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function docForToken(token: string | null): Promise<{ doc: DocData; real: boolean }> {
  if (!token) return { doc: DEMO_DOC, real: false };
  try {
    const store = await import("../../../../../ingest/store.mjs");
    if (!store.pipelineDbConfigured()) return { doc: DEMO_DOC, real: false };
    const { buildAuditReport } = await import("../../../../../ingest/audit.mjs");
    const db = await store.openPipelineDb();
    try {
      const report = await buildAuditReport({ db, token });
      if (!report?.ok) return { doc: DEMO_DOC, real: false };
      const doc = auditReportToDocData(report, { periodLabel: "Leak Audit" }) as DocData;
      return { doc, real: true };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    return { doc: DEMO_DOC, real: false };
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const { doc, real } = await docForToken(token);
  const el = React.createElement(ReadoutDoc, { d: doc }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="leak-audit-readout${real ? "" : "-demo"}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
