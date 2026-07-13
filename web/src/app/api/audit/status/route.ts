// GET /api/audit/status?token=... — poll a session’s per-call progress so the
// uploader UI can show "3 of 5 scored". Public but token-gated: only someone
// holding the unguessable token can read it. Returns demo data only.

import { openPipelineDb, closePipelineDb } from "../../../../../ingest/store.mjs";
import { buildAuditReport } from "../../../../../ingest/audit.mjs";
import type { AuditReport } from "@/lib/audit-types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.json({ error: "token required" }, { status: 400 });

  const db = await openPipelineDb();
  try {
    const report = (await buildAuditReport({ db, token })) as AuditReport;
    if (!report.ok) {
      const status = report.reason === "not_found" ? 404 : 410;
      return Response.json({ error: report.reason }, { status });
    }
    const calls = (report.calls ?? []).map((c) => ({
      id: String(c.id),
      filename: c.filename,
      status: c.status,
    }));
    const done = calls.filter((c) => c.status === "done").length;
    const errored = calls.filter((c) => c.status === "error").length;
    return Response.json({
      token,
      total: calls.length,
      done,
      errored,
      pending: report.pending,
      complete: calls.length > 0 && report.pending === 0,
      calls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "status failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
