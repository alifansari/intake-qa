// ============================================================================
// Spot Check rubric + leakage math — THE DETERMINISTIC SCORE.
//
// This module is the single source of truth for the headline number and grade.
// It is 100% deterministic pure math: NO LLM is involved in computing the score
// (compliance HARD CONSTRAINT #3). The AI may only draft prose narratives
// elsewhere; it never touches anything in this file.
//
// Authored as .mjs so the node --test runner and the Next runtime both import it
// with zero build step (the repo's established pattern, e.g. messaging/reconcile.mjs
// + src/lib/reconcile.ts). src/lib/studio/rubric.ts re-exports these with types.
//
// Everything a reader/reviewer needs to audit the number lives here and is
// printed on the report: the six weighted dimensions, the 0/50/100 input scale,
// the grade thresholds, and the critical-fail override.
//
// NOT ASSESSED / SCORE NORMALIZATION (front-door honesty):
//   Two "front-door" dimensions — reachability_speed and human_vs_barrier —
//   measure the phone tree / answer speed, which a recording of an ALREADY-
//   CONNECTED intake call cannot test. When the analysis has no genuine signal
//   for such a dimension, its input is `null` ("Not assessed") rather than a
//   defaulted score. A null dimension is EXCLUDED from BOTH the weighted sum and
//   the weight denominator, and the score is renormalized over only the assessed
//   dimensions:
//     score = round( sum(weighted of assessed dims) / sum(weight of assessed dims) * 100 )
//   So the grade reflects only what was actually measured — a strong conversation
//   with both front-door dims Not assessed is scored on the 60-weight remainder,
//   normalized back up to a 0–100 scale (never penalized as if it scored 0 there).
//   If somehow NOTHING is assessed, the score is 0 (divide-by-zero guard).
// ============================================================================

// --- The six weighted dimensions -------------------------------------------
// Each ASSESSED dimension is scored 0, 50, or 100 (nothing in between — a coarse,
// honest scale for a 4-minute spot check), or `null` when the analysis did not
// test it ("Not assessed"). Weights sum to 100. The score is the weighted mean of
// the ASSESSED dimensions, renormalized to 0–100 (before any critical-fail
// override); not-assessed dimensions drop out of both numerator and denominator.
export const DIMENSIONS = [
  { key: "reachability_speed", label: "Reachability & Speed", weight: 25 },
  { key: "human_vs_barrier", label: "Human vs Barrier", weight: 15 },
  { key: "rapport_trauma", label: "Rapport & Trauma-Response", weight: 15 },
  { key: "legal_danger_flags", label: "Legal-Danger Flags", weight: 15 },
  { key: "capture", label: "Capture", weight: 15 },
  { key: "follow_up", label: "Follow-up", weight: 15 },
];

// The only allowed per-dimension input values.
export const DIMENSION_LEVELS = [0, 50, 100];

// --- Grade map (constants) --------------------------------------------------
// A ≥ 90, B 80–89, C 70–79, D 60–69, F < 60.
export const GRADE_THRESHOLDS = [
  { grade: "A", min: 90 },
  { grade: "B", min: 80 },
  { grade: "C", min: 70 },
  { grade: "D", min: 60 },
  { grade: "F", min: 0 },
];

// --- Critical fails ---------------------------------------------------------
// If ANY of these is checked, the headline grade is CAPPED AT F regardless of the
// weighted score, and surfaced prominently. This mirrors the frozen engine's own
// critical-fail philosophy but is computed here deterministically from the
// founder's structured inputs.
export const CRITICAL_FAILS = [
  { key: "non_lawyer_legal_opinion", label: "Non-lawyer gave a legal opinion (UPL)" },
  {
    key: "premature_disqualification",
    label: "Premature disqualification of a plausibly-signable case",
  },
  { key: "coverage_misstatement", label: "Material coverage misstatement" },
  { key: "rude_dismissive", label: "Rude or dismissive treatment" },
];

const DIMENSION_KEYS = new Set(DIMENSIONS.map((d) => d.key));
const CRITICAL_FAIL_KEYS = new Set(CRITICAL_FAILS.map((c) => c.key));

// Sanity check kept as an assertion so a bad edit to the weights is caught in
// tests (the weights MUST sum to 100 for the score to be a clean 0–100).
export const TOTAL_WEIGHT = DIMENSIONS.reduce((s, d) => s + d.weight, 0);

// --- Grade from a numeric score --------------------------------------------
export function gradeForScore(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return "F";
}

// Coerce an input to one of {0,50,100}, or `null` for "Not assessed".
//   * `null` (explicit) stays null → the dimension is EXCLUDED from the score.
//   * A valid level (0/50/100) is kept as-is.
//   * Anything else invalid/absent counts as 0 (absence of evidence = the
//     behavior didn't happen — same stance as the engine). Note this is distinct
//     from `null`: 0 is an ASSESSED "Poor", null is "we didn't test this".
function level(v) {
  if (v === null) return null;
  return DIMENSION_LEVELS.includes(v) ? v : 0;
}

// --- The headline computation ----------------------------------------------
/**
 * Compute the deterministic Spot Check result.
 *
 * A dimension whose input is `null` is "Not assessed": it is EXCLUDED from both
 * the weighted numerator and the weight denominator. The score is the weighted
 * mean of the ASSESSED dimensions, renormalized to 0–100:
 *   score = round( sum(weighted of assessed) / sum(weight of assessed) * 100 )
 * with a divide-by-zero guard (score 0 if nothing is assessed).
 *
 * @param {{
 *   dimensionInputs?: Record<string, number | null>,
 *   criticalFails?: string[],
 * }} input
 * @returns {{
 *   score: number,
 *   grade: string,
 *   rawScore: number,
 *   rawGrade: string,
 *   assessedWeight: number,
 *   criticalFailTriggered: boolean,
 *   activeCriticalFails: string[],
 *   dimensionScores: Array<{ key:string, label:string, weight:number, input:number|null, assessed:boolean, weighted:number }>,
 * }}
 */
export function computeSpotCheck(input = {}) {
  const inputs = input.dimensionInputs ?? {};
  const fails = Array.isArray(input.criticalFails) ? input.criticalFails : [];

  const dimensionScores = DIMENSIONS.map((d) => {
    const val = level(inputs[d.key]);
    const assessed = val !== null;
    // weighted contribution = input% × weight / 100  (input 0/50/100 → 0/0.5/1 × weight);
    // a not-assessed dimension contributes 0 to the numerator AND is dropped from
    // the denominator below, so it neither helps nor hurts the score.
    const weighted = assessed ? (val / 100) * d.weight : 0;
    return { key: d.key, label: d.label, weight: d.weight, input: val, assessed, weighted };
  });

  // Renormalize over the ASSESSED dimensions only: weighted mean scaled to 0–100.
  // Not-assessed dims drop out of the denominator (they are NOT counted as 0).
  const assessedWeight = dimensionScores.reduce((s, d) => s + (d.assessed ? d.weight : 0), 0);
  const weightedSum = dimensionScores.reduce((s, d) => s + d.weighted, 0);
  const rawScore =
    assessedWeight > 0 ? Math.round((weightedSum / assessedWeight) * 100) : 0; // guard: nothing assessed → 0
  const rawGrade = gradeForScore(rawScore);

  // Critical-fail override: any active critical fail caps the grade at F.
  const activeCriticalFails = fails.filter((f) => CRITICAL_FAIL_KEYS.has(f));
  const criticalFailTriggered = activeCriticalFails.length > 0;

  return {
    score: rawScore, // the numeric score is always the weighted sum (shown as-is)
    grade: criticalFailTriggered ? "F" : rawGrade, // grade is capped at F on override
    rawScore,
    rawGrade,
    assessedWeight,
    criticalFailTriggered,
    activeCriticalFails,
    dimensionScores,
  };
}

// ============================================================================
// Leakage math — all inputs shown on the report; never a hidden headline number.
// ============================================================================
//
// Value of one missed signable case = average_signed_case_fee (attorney-supplied,
// editable, DEFAULT BLANK). We do NOT hardcode a dollar value. A conservative,
// clearly-labeled placeholder is offered for the founder to accept or replace.
export const AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER = 12000; // documented conservative CA PI placeholder; not a valuation
export const DEFAULT_ILLUSTRATIVE_MONTHLY_RECURRENCE = 1;

/**
 * @param {{
 *   averageSignedCaseFee?: number | null,
 *   illustrativeMonthlyRecurrence?: number | null,
 * }} input
 * @returns {{
 *   singleCase: number | null,
 *   illustrativeAnnual: number | null,
 *   averageSignedCaseFee: number | null,
 *   illustrativeMonthlyRecurrence: number,
 * }}
 */
export function computeLeakage(input = {}) {
  const fee =
    typeof input.averageSignedCaseFee === "number" && input.averageSignedCaseFee >= 0
      ? input.averageSignedCaseFee
      : null;
  const recurrence =
    typeof input.illustrativeMonthlyRecurrence === "number" &&
    input.illustrativeMonthlyRecurrence >= 0
      ? input.illustrativeMonthlyRecurrence
      : DEFAULT_ILLUSTRATIVE_MONTHLY_RECURRENCE;

  // With no attorney-supplied fee, we produce NO dollar figure (blank is honest;
  // we never invent the number that anchors the whole exhibit).
  if (fee == null) {
    return {
      singleCase: null,
      illustrativeAnnual: null,
      averageSignedCaseFee: null,
      illustrativeMonthlyRecurrence: recurrence,
    };
  }

  return {
    singleCase: fee,
    illustrativeAnnual: fee * recurrence * 12,
    averageSignedCaseFee: fee,
    illustrativeMonthlyRecurrence: recurrence,
  };
}

// Helper for validation elsewhere: is this a real dimension/critical-fail key?
export function isDimensionKey(k) {
  return DIMENSION_KEYS.has(k);
}
export function isCriticalFailKey(k) {
  return CRITICAL_FAIL_KEYS.has(k);
}
