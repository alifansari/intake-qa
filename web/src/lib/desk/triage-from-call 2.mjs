// ============================================================================
// AUTO-TRIAGE FROM THE RECORDING.
//
// Every scored call already carries a v2 triage verdict under score._v2_shadow
// (the deterministic engine runs dark on the same transcript). This module turns
// that ALREADY-COMPUTED verdict into a triage_case, so the "call these first"
// queue fills itself from the recording instead of an intake specialist keying a
// 15-field form. It invents nothing — it persists a decision we already made.
//
// Pure, no I/O (mirrors reconcile.ts / receipts.mjs). Returns null when there is
// no usable verdict (v2 errored or produced no disposition); the caller MUST
// skip in that case and never insert a blank triage.
//
// Compliance (§IV): no dollar and no computed deadline are synthesized here —
// v2 forbids both at intake. sol_urgency is "unknown" because a transcript has
// no reliable incident date; the filing clock stays a human confirmation.
// ============================================================================

// Marks a triage as machine-created from a call (vs. a human-typed one). Also
// used to dedupe: one auto-triage per source call.
export const AUTO_TRIAGE_SOURCE = "auto_call";

function firstStr(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// disposition -> letter / color / headline. Mirrors the desk's grade convention
// (green good / amber caution / red decline) so an auto-graded card reads
// exactly like a hand-graded one.
const GRADE = {
  sign_now: { letter: "A", color: "green", headline: "Strong file — sign candidate" },
  develop: { letter: "B", color: "amber", headline: "Worth developing" },
  refer_out: { letter: "C", color: "amber", headline: "Better referred out" },
  decline_with_grace: { letter: "D", color: "red", headline: "Likely a decline" },
};
export function gradeForDisposition(disposition) {
  return GRADE[disposition] || { letter: "?", color: "neutral", headline: "Needs a look" };
}

/**
 * Build a triage_case-shaped record from a scored call's v2 shadow verdict.
 * @param {{ score?: object, call?: object }} args
 * @returns {object|null} triage_case fields, or null when there's no verdict.
 */
export function triageFromCall({ score, call } = {}) {
  const shadow = score && score._v2_shadow;
  if (!shadow || typeof shadow !== "object" || shadow.shadow_error) return null;

  const v2 = shadow.v2 && typeof shadow.v2 === "object" ? shadow.v2 : {};
  const disposition = v2.recommended_disposition ?? null;
  if (!disposition) return null; // abstained / no read -> nothing to persist

  const value_tier = v2.value_tier ?? "indeterminate";
  const grade = gradeForDisposition(disposition);
  const case_type = firstStr(
    v2.case_type_routing,
    shadow.alerts && shadow.alerts.revenue_at_risk && shadow.alerts.revenue_at_risk.case_type_matched,
  );
  const driving_reason = firstStr(
    Array.isArray(v2.disposition_basis) ? v2.disposition_basis[0] : null,
    shadow.summary,
  );

  const sourceCallId = call && call.id != null ? String(call.id) : null;

  return {
    firm_id: call ? call.firm_id ?? null : null,
    created_by: "auto",
    source: AUTO_TRIAGE_SOURCE,
    source_call_id: sourceCallId,
    caller_name: call ? call.caller_name ?? null : null,
    caller_phone: call ? call.caller_phone ?? null : null,
    case_type,
    incident_date: null,
    grade_letter: grade.letter,
    grade_color: grade.color,
    headline: grade.headline,
    disposition,
    value_tier,
    driving_reason,
    flip_fact: null, // the "one fact to confirm" is a live-call prompt, not a transcript read
    sol_deadline: null,
    sol_days_remaining: null,
    sol_urgency: "unknown", // no reliable incident date from a transcript (§IV: no invented deadline)
    attorney_review: shadow.attorney_review_required === true, // boolean: both DB twins accept it
    input_json: JSON.stringify({ source: AUTO_TRIAGE_SOURCE, call_id: sourceCallId }),
    verdict_json: JSON.stringify({
      disposition,
      value_tier,
      driving_reason,
      attorney_review_required: shadow.attorney_review_required === true,
      from: "v2_shadow",
    }),
    status: "new",
  };
}
