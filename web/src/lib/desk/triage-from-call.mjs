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
// Compliance (§IV): no dollar is synthesized here — v2 forbids it at intake.
// The FILING CLOCK (B-026 slice 2): when the v1 rubric CLEANLY captured the date
// of loss as a cited field (qualification.statute_window.date_of_loss carries an
// evidence quote) we compute the SAME deterministic SOL the live triage shows —
// an ESTIMATE that always carries sol.mjs's disclaimer, never a guarantee. When no
// date was captured we keep sol_urgency "unknown", so the case surfaces as a GAP
// ("no clock yet — capture the incident date") rather than a guessed deadline:
// understating a short government/MICRA clock is the one thing we must never do,
// so the short-clock modifiers the engine identified are honored, and any doubt
// leaves the clock unknown for a human to set.
// ============================================================================

import { computeSol } from "../../../analysis/sol.mjs";

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

// Derive the filing-deadline clock from the v1 engine's transcript extraction.
// Returns the four triage sol_* fields. The date of loss is a CITED v1 field
// (qualification.statute_window.date_of_loss); the short-clock modifiers are the
// engine's own determination (statute_window.clock_modifiers + high_value_
// indicators). We compute only when a date is present; otherwise "unknown" (a
// gap for a human, never a guessed deadline). The gov/med-mal detection leans
// toward CATCHING a short clock — a false positive over-warns (safe), a false
// negative would understate a deadline (the malpractice failure we must avoid).
export function solFromCall(score, caseType, now) {
  const empty = { incident_date: null, sol_deadline: null, sol_days_remaining: null, sol_urgency: "unknown" };
  const q = score && typeof score.qualification === "object" ? score.qualification : null;
  const sw = q && typeof q.statute_window === "object" ? q.statute_window : null;
  const incidentDate = sw ? firstStr(sw.date_of_loss) : null;
  if (!incidentDate) return empty;

  const mods = sw && Array.isArray(sw.clock_modifiers) ? sw.clock_modifiers : [];
  const hvi = score && Array.isArray(score.high_value_indicators) ? score.high_value_indicators : [];
  const signal = [...mods, ...hvi, caseType || ""].map(String).join(" ").toLowerCase();
  const governmentDefendant =
    /government|public entity|public (bus|school|hospital|sidewalk|road|works)|municipal|\bcity\b|\bcounty\b|gov(?:ernment)?[ _-]?claim/.test(
      signal,
    );
  const medMal = /med(?:ical)?[ _-]?mal|micra|malpractice/.test(signal);
  const minor = /\bminor\b|under[ -]?18|child plaintiff/.test(signal);

  const r = computeSol({
    incidentDate,
    caseType: medMal ? "medical_malpractice" : "unknown",
    governmentDefendant,
    minor,
    state: "CA",
    now,
  });
  return {
    incident_date: incidentDate,
    sol_deadline: r?.deadlineDate ?? null,
    sol_days_remaining: typeof r?.daysRemaining === "number" ? r.daysRemaining : null,
    sol_urgency: r?.urgency ?? "unknown",
  };
}

/**
 * Build a triage_case-shaped record from a scored call's v2 shadow verdict.
 * @param {{ score?: object, call?: object, now?: Date }} args
 * @returns {object|null} triage_case fields, or null when there's no verdict.
 */
export function triageFromCall({ score, call, now = new Date() } = {}) {
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

  // B-026 slice 2: compute the filing clock from the v1 engine's cited date of
  // loss when present; otherwise the fields stay null/"unknown" (a gap, never a
  // guessed deadline). Always an estimate carrying sol.mjs's disclaimer at render.
  const sol = solFromCall(score, case_type, now);

  return {
    firm_id: call ? call.firm_id ?? null : null,
    created_by: "auto",
    source: AUTO_TRIAGE_SOURCE,
    source_call_id: sourceCallId,
    caller_name: call ? call.caller_name ?? null : null,
    caller_phone: call ? call.caller_phone ?? null : null,
    case_type,
    incident_date: sol.incident_date,
    grade_letter: grade.letter,
    grade_color: grade.color,
    headline: grade.headline,
    disposition,
    value_tier,
    driving_reason,
    flip_fact: null, // the "one fact to confirm" is a live-call prompt, not a transcript read
    sol_deadline: sol.sol_deadline,
    sol_days_remaining: sol.sol_days_remaining,
    sol_urgency: sol.sol_urgency,
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
