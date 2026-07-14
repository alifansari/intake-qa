// Report review gate (Stage 6). Reports do NOT release without analyst review.
// State machine: draft -> analyst_review -> released. Release requires every
// pre-release checklist item confirmed. Pure + testable; the store persists it.

export const REPORT_STATUSES = ["draft", "analyst_review", "released"];

const ALLOWED = {
  draft: ["analyst_review"],
  analyst_review: ["released", "draft"], // can send back to draft, or release
  released: [], // terminal
};

export function canTransition(from, to) {
  return (ALLOWED[from] ?? []).includes(to);
}

// Provenance stamped on a finding released via the auto (engine-scored) path.
export const AUTO_RELEASE_PROVENANCE = "engine_scored";

// Attempt a transition. Throws on an illegal move, or on release with any
// checklist item unconfirmed. Returns the new status.
//
// `auto` (default false) is the tiered "sampled review" auto-release path: when
// true, an auto_eligible finding may be RELEASED WITHOUT the manual pre-release
// checklist — the calibrated engine + the citation guard (every excerpt checked
// against the recording) carry it, and it is stamped Engine-scored provenance.
// The DECISION to allow this is the caller's (gated by SAMPLED_REVIEW_ENABLED and
// by classifyForReview === 'auto_eligible'); this state machine only offers the
// capability. Because `auto` defaults false, every EXISTING caller is byte-identical
// to before: with no `auto`, release still requires the full checklist (100% manual).
// force_review findings must never be sent down this path.
export function transition(from, to, { checklistConfirmed = [], auto = false } = {}) {
  if (!canTransition(from, to)) {
    throw new Error(`illegal report-status transition: ${from} -> ${to}`);
  }
  if (to === "released" && !auto) {
    if (checklistConfirmed.length === 0 || !checklistConfirmed.every(Boolean)) {
      throw new Error("cannot release: every pre-release checklist item must be confirmed");
    }
  }
  return to;
}

// Convenience: release from analyst_review with the full checklist.
export function releaseReport({ from, checklistConfirmed }) {
  return transition(from, "released", { checklistConfirmed });
}

// Convenience: auto-release an auto_eligible finding (no checklist). Returns both
// the new status and the provenance to stamp. The caller is responsible for having
// confirmed decision === 'auto_eligible' under the flag before calling this.
export function autoReleaseReport({ from }) {
  return { status: transition(from, "released", { auto: true }), provenance: AUTO_RELEASE_PROVENANCE };
}
