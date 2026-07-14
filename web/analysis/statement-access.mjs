// Firm-facing statement download — the access decision, as pure logic.
//
// THE core safety property (compliance §IV / §VI): a firm may download the PDF
// of its Monthly Missed-Revenue Statement for a period ONLY when that period's
// firm_statement_reviews row exists, belongs to THIS firm, and has been RELEASED
// (a human analyst signed it off, or the flag-gated auto-release ran). A draft or
// analyst_review statement is still under review and MUST NOT be served — an
// unreviewed dollar claim reaching a firm would violate the citation guard.
//
// This is pure so it is unit-tested directly (released-only + cross-firm denial),
// independent of auth/DB wiring. The route resolves the caller's firm server-side
// (never a client-supplied firm id) and passes the already-firm-scoped review row
// here; the firm_id equality check below is defense-in-depth on top of that.
//
// Returns one of:
//   { ok: true }
//   { ok: false, status, code, message }   // never serve a PDF
export function decideStatementAccess({ review, callerFirmId }) {
  // No row for this firm+period (or the firm has no such statement) → 404.
  if (!review) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      message: "No statement exists for that period.",
    };
  }

  // Defense-in-depth: the row must belong to the caller's firm. The lookup is
  // already scoped to the server-resolved firm id, so this should never fire —
  // if it ever does, deny as if the row did not exist (never disclose another
  // firm's statement, never leak that it exists).
  if (String(review.firm_id) !== String(callerFirmId)) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      message: "No statement exists for that period.",
    };
  }

  // The hard invariant: only 'released' is downloadable.
  if (review.report_status !== "released") {
    return {
      ok: false,
      status: 409,
      code: "in_review",
      message:
        "Your statement for that period is being reviewed and isn't available to download yet. It'll appear here once your analyst signs off.",
    };
  }

  return { ok: true };
}

// Honest provenance label for a RELEASED statement row (compliance §IV — never
// imply analyst review on an engine-scored auto-release, or vice versa).
export function statementProvenanceLabel(provenance) {
  if (provenance === "analyst_reviewed") return "Analyst-reviewed";
  if (provenance === "engine_scored") return "Engine-scored · evidence-verified";
  return "Released";
}
