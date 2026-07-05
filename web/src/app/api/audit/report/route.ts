// GET /api/audit/report?token=...[&volume=N] — the aggregated Intake Quality Audit JSON
// (headline leakage, waterfall counts, per-leaked-call detail). Token-gated;
// demo data only. The /audit/[token] page renders from the same buildAuditReport
// core; this endpoint exists for the "emailed to you" / programmatic path.

import { openPipelineDb, closePipelineDb } from "../../../../../ingest/store.mjs";
import { buildAuditReport } from "../../../../../ingest/audit.mjs";
import type { AuditReport } from "@/lib/audit-types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const volumeParam = url.searchParams.get("volume");
  if (!token) return Response.json({ error: "token required" }, { status: 400 });

  const db = await openPipelineDb();
  try {
    const report = (await buildAuditReport({
      db,
      token,
      ...(volumeParam != null ? { monthlyCallVolume: Number(volumeParam) } : {}),
    })) as AuditReport;
    if (!report.ok) {
      const status = report.reason === "not_found" ? 404 : 410;
      return Response.json({ error: report.reason }, { status });
    }
    return Response.json({
      session: {
        token,
        email: report.session?.email ?? null,
        expires_at: report.session?.expires_at,
      },
      summary: report.summary,
      pending: report.pending,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "report failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
