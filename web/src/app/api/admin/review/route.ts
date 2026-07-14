// Operator review-gate action (Stage 6). Transitions an audit session’s report
// status via the state machine. Release requires every checklist item confirmed.
// Auth mirrors the other admin routes (open when Supabase unconfigured; else a
// signed-in operator).
import { transition as transitionRaw, AUTO_RELEASE_PROVENANCE } from "../../../../../analysis/report-status.mjs";
import { classifyForReview as classifyRaw } from "../../../../../analysis/review-router.mjs";
import { isSampledReviewEnabled } from "@/lib/flags";
import { FOUNDER_NAME } from "@/lib/site-constants";

// The state machine is plain JS; type its signature here so callers get proper types.
const transition = transitionRaw as (
  from: string,
  to: string,
  opts?: { checklistConfirmed?: boolean[]; auto?: boolean },
) => string;
const classifyForReview = classifyRaw as (input: {
  worstConfidenceTier?: "strong" | "moderate" | null;
  citationFailureCount?: number;
  maxRevenueAtRiskCents?: number;
}) => { decision: "force_review" | "auto_eligible" };

// Tiered "sampled review" auto-release is gated by SAMPLED_REVIEW_ENABLED AND by
// this readiness flag. HONEST CONSTRAINT (kept false on purpose): the review queue
// operates on `audit_sessions`, whose calls are demo-isolated — getSessionReviewSignals
// cannot reach per-call citation-guard failures (they don't join to demo_calls;
// citationFailureCount is structurally 0) and demo-call confidence tiers are isolated.
// The citation-guard signal is the whole §IV basis for trusting an auto-release, so we
// DO NOT auto-release audit_sessions until those per-audit-call signals persist and a
// `provenance` column exists on audit_sessions. Until then the manual checklist path is
// the ONLY release path here. The state machine already supports the auto path
// (transition({auto:true})) and is unit-tested; activating it live is a signal-persistence
// change, not a state-machine change. Flip to true only after that lands (and Yang review).
const AUDIT_SESSION_AUTORELEASE_READY = false;

export const runtime = "nodejs";

export async function POST(req: Request) {
  const store = await import("../../../../../ingest/store.mjs");
  const { isSupabaseConfigured } = await import("@/lib/supabase/env");
  if (isSupabaseConfigured()) {
    const { getCurrentUser } = await import("@/lib/supabase/server");
    const user = await getCurrentUser();
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!user || !founderEmail || user.email?.trim().toLowerCase() !== founderEmail) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    kind?: "firm_statement" | "audit_session";
    sessionId?: number | string;
    firmId?: number | string;
    period?: string;
    to?: string;
    checklist?: boolean[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { kind = "audit_session", sessionId, firmId, period, to, checklist = [] } = body;
  if (!to) return Response.json({ error: "to required" }, { status: 422 });

  const db = await store.openPipelineDb();
  try {
    // ── Firm-statement branch (real firm pipeline; migration 0037/0045). ────────
    // Goes through the SAME report-status machine: a manual sign-off requires the
    // full pre-release checklist and stamps 'analyst_reviewed' provenance — auto
    // release is handled at generation time, not here. Founder-gated above.
    if (kind === "firm_statement") {
      if (firmId == null || !period) {
        return Response.json({ error: "firmId and period required" }, { status: 422 });
      }
      const currentStmt = await store.getFirmStatementReview(db, firmId, period);
      if (!currentStmt) return Response.json({ error: "statement review not found" }, { status: 404 });
      let nextStmt: string;
      try {
        nextStmt = transition(currentStmt.report_status, to, { checklistConfirmed: checklist });
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "illegal transition" }, { status: 422 });
      }
      await store.setFirmStatementReviewStatus(db, {
        firmId,
        period,
        status: nextStmt,
        releasedBy: nextStmt === "released" ? FOUNDER_NAME : null,
        // A manual sign-off is honestly labeled analyst_reviewed (a human released it).
        provenance: nextStmt === "released" ? "analyst_reviewed" : undefined,
      });
      return Response.json({ ok: true, status: nextStmt });
    }

    if (sessionId == null) {
      return Response.json({ error: "sessionId required" }, { status: 422 });
    }
    const current = await store.getReportStatus(db, sessionId);
    if (!current) return Response.json({ error: "session not found" }, { status: 404 });

    // Tiered "sampled review" auto-release HOOK (flag-gated; default OFF => this
    // whole block is skipped and the manual path below is byte-identical to today).
    // When ON, an auto_eligible session could release without the manual checklist,
    // stamped Engine-scored provenance. force_review sessions never take this path.
    // DEFERRED for audit_sessions: AUDIT_SESSION_AUTORELEASE_READY is false because
    // the risk signals needed to trust an auto-release (the §IV citation guard) are
    // not persisted per audit call yet — see the constant above. So even with the
    // flag ON, we fall through to the manual checklist until that lands.
    if (isSampledReviewEnabled() && to === "released" && AUDIT_SESSION_AUTORELEASE_READY) {
      let decision: "force_review" | "auto_eligible" = "force_review"; // fail safe = manual
      try {
        const signals = await store.getSessionReviewSignals(db, sessionId);
        decision = classifyForReview(signals).decision;
      } catch {
        decision = "force_review"; // unreadable signals => force the human path
      }
      if (decision === "auto_eligible") {
        const autoNext = transition(current.report_status, "released", { auto: true });
        await store.setReportStatus(db, sessionId, autoNext, {
          releasedBy: `${FOUNDER_NAME} (auto: engine-scored)`,
        });
        return Response.json({ ok: true, status: autoNext, provenance: AUTO_RELEASE_PROVENANCE });
      }
      // auto_eligible not met => fall through to the manual checklist path below.
    }

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
