// Re-engagement flag logic (pure, no I/O — testable and storage-agnostic).
//
// Decides whether a scored call is a leaked-signable lead worth re-engaging.
// Per the founder's decision the gate is CASE SIGNABILITY (a good case handled
// poorly), NOT the low overall handling score. Three conditions must all hold:
//   1. signable   — signabilityScore(score) >= thresholdScore (default 60)
//   2. not converted/booked — no retainer signed and no appointment set
//   3. within the re-engage window — received recently enough to re-contact

// Outcomes that mean the call already converted — never a re-engage candidate.
const CONVERTED_OUTCOMES = new Set(["signed_on_call", "appointment_set"]);

// Map the engine's categorical signability + confidence to a 0-100 score.
export function signabilityScore(score) {
  const sig = score?.case_signability;
  const conf =
    score?.classification_confidence ?? score?.scores?.confidence ?? "medium";
  if (sig === "likely_signable") {
    if (conf === "high") return 90;
    if (conf === "low") return 60;
    return 80; // medium / unspecified
  }
  if (sig === "needs_development") return 40;
  if (sig === "likely_declinable") return 10;
  return 0;
}

// True when the call did NOT convert (no signature, no booked appointment).
export function didNotConvert(score) {
  const outcome = score?.conversion?.retainer_outcome;
  return !CONVERTED_OUTCOMES.has(outcome);
}

// True when received_at is recent enough to re-engage. windowHours is per-firm
// (default 72). now/receivedAt are ISO strings or Dates.
export function withinReengageWindow(receivedAt, windowHours = 72, now = new Date()) {
  const received = new Date(receivedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(received) || Number.isNaN(nowMs)) return false;
  const ageMs = nowMs - received;
  return ageMs >= 0 && ageMs <= windowHours * 3600 * 1000;
}

// Evaluate a scored call into a flag decision. Returns the columns the flags
// table needs plus the signability score used. `qualification_score` remains
// the rubric OVERALL score (dashboard continuity); `reason` records the verdict.
export function evaluateFlag({
  score,
  thresholdScore = 60,
  windowHours = 72,
  receivedAt,
  now = new Date(),
}) {
  const overall = score?.scores?.overall;
  const signability = signabilityScore(score);
  const signable = signability >= thresholdScore;
  const notConverted = didNotConvert(score);
  const inWindow = withinReengageWindow(receivedAt, windowHours, now);
  const leaked = signable && notConverted && inWindow;

  let reason;
  if (leaked) {
    reason = `Leaked signable lead (signability ${signability}); not converted; within ${windowHours}h re-engage window.`;
  } else if (!signable) {
    reason = `Not re-engaged: signability ${signability} below threshold ${thresholdScore}.`;
  } else if (!notConverted) {
    reason = `Not re-engaged: call already converted (${score?.conversion?.retainer_outcome}).`;
  } else {
    reason = `Not re-engaged: outside ${windowHours}h re-engage window.`;
  }

  return {
    is_leaked_signable: leaked ? 1 : 0,
    qualification_score: overall == null ? null : Math.round(overall),
    signability_score: signability,
    reason,
  };
}
