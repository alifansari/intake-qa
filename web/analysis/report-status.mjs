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

// Attempt a transition. Throws on an illegal move, or on release with any
// checklist item unconfirmed. Returns the new status.
export function transition(from, to, { checklistConfirmed = [] } = {}) {
  if (!canTransition(from, to)) {
    throw new Error(`illegal report-status transition: ${from} -> ${to}`);
  }
  if (to === "released") {
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
