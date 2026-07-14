// FOUNDER-ONLY: enqueue a firm+period statement for manual analyst review.
//
// The manual analyst-release path (/api/admin/review kind:firm_statement) can
// only act on a firm_statement_reviews row that already EXISTS. Today a row is
// created only when SAMPLED_REVIEW_ENABLED is on (auto/tiered path). This route
// lets the founder create a 'draft' row for any firm+period independent of that
// flag, so the statement can be pushed through review → released by hand.
//
// COMPLIANCE / flag safety:
//   * Founder-gated (requireFounderRoute) — same guard as the founder statement
//     route and the review console page.
//   * Creates status 'draft' ONLY. It NEVER auto-releases and NEVER stamps
//     provenance — release still goes through the checklist sign-off, which stamps
//     analyst_reviewed. Auto-release stays flag-gated elsewhere; nothing here
//     touches SAMPLED_REVIEW_ENABLED.
//   * A 'draft'/'analyst_review' row is invisible to the firm (the firm-facing
//     download route serves ONLY 'released'), so this does not change what firm
//     users see under flag-OFF.
//   * Never clobbers an existing row (esp. a released one) — if a row already
//     exists for the firm+period it is returned unchanged.
import { requireFounderRoute } from "@/lib/studio/guard";

export const runtime = "nodejs";

function validPeriod(p: unknown): p is string {
  return typeof p === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let body: { firmId?: number | string; period?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { firmId, period } = body;
  if (firmId == null) return Response.json({ error: "firmId required" }, { status: 422 });
  if (!validPeriod(period)) return Response.json({ error: "period must be YYYY-MM" }, { status: 422 });

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return Response.json({ error: "pipeline db not configured" }, { status: 503 });
  }
  const db = await store.openPipelineDb();
  try {
    // Confirm the firm exists (and normalize the id type against the store).
    const firms = await store.listFirms(db);
    const firm = firms.find((f: { id: unknown }) => String(f.id) === String(firmId));
    if (!firm) return Response.json({ error: "firm not found" }, { status: 404 });

    // Never clobber an existing row (a released statement must stay released).
    const existing = await store.getFirmStatementReview(db, firm.id, period);
    if (existing) {
      return Response.json({ ok: true, created: false, status: existing.report_status });
    }

    const row = await store.upsertFirmStatementReview(db, {
      firmId: firm.id,
      period,
      reportStatus: "draft",
      provenance: null,
      autoCount: 0,
      forceReviewCount: 0,
      releasedBy: null,
    });
    return Response.json({ ok: true, created: true, status: row?.report_status ?? "draft" });
  } finally {
    await store.closePipelineDb(db);
  }
}
