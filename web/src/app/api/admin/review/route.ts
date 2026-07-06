// Operator review-gate action (Stage 6). Transitions an audit session's report
// status via the state machine. Release requires every checklist item confirmed.
// Auth mirrors the other admin routes (open when Supabase unconfigured; else a
// signed-in operator).
import { transition as transitionRaw } from "../../../../../analysis/report-status.mjs";
import { FOUNDER_NAME } from "@/lib/site-constants";

// The state machine is plain JS; type its signature here so callers get proper types.
const transition = transitionRaw as (
  from: string,
  to: string,
  opts?: { checklistConfirmed?: boolean[] },
) => string;

export const runtime = "nodejs";

export async function POST(req: Request) {
  const store = await import("../../../../../ingest/store.mjs");
  const { isSupabaseConfigured } = await import("@/lib/supabase/env");
  if (isSupabaseConfigured()) {
    const { getCurrentUser } = await import("@/lib/supabase/server");
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { sessionId?: number | string; to?: string; checklist?: boolean[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { sessionId, to, checklist = [] } = body;
  if (sessionId == null || !to) {
    return Response.json({ error: "sessionId and to required" }, { status: 422 });
  }

  const db = await store.openPipelineDb();
  try {
    const current = await store.getReportStatus(db, sessionId);
    if (!current) return Response.json({ error: "session not found" }, { status: 404 });
    let next: string;
    try {
      next = transition(current.report_status, to, { checklistConfirmed: checklist });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "illegal transition" }, { status: 422 });
    }
    await store.setReportStatus(db, sessionId, next, { releasedBy: next === "released" ? FOUNDER_NAME : null });
    return Response.json({ ok: true, status: next });
  } finally {
    await store.closePipelineDb(db);
  }
}
