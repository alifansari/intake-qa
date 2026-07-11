// scoring-v2/lib/confidence.mjs — confidence tier + abstention (stage 5).
// Computed from OBSERVABILITY METADATA in code — never from asking the model
// how confident it feels (LLM self-reported confidence correlates weakly
// with correctness; objective-spec §4/§5). Pure, no I/O.
//
// Abstention rules (objective-spec §5):
//   (a) transcript-quality gate tripped                     → abstain
//   (b) more than 2 of the 7 dimensions read `unknown`      → abstain
//   (c) any gate-relevant fact would CHANGE a gate's outcome
//       only on an INFERRED (not observed) value — firing it
//       (e.g. an inferred Prop-213 trigger) or suppressing it
//       (e.g. an inferred §3333.4(c) DUI exception)          → abstain
//   (d) the MIST overlay's minimal-impact trigger is present
//       only at INFERRED observability                       → abstain
// Abstained calls withhold the disposition and route to attorney review.

import { evaluateGates } from "./gates.mjs";
import { isMistProfile } from "./decision-table.mjs";

export const DIMENSION_IDS = Object.freeze([
  "liability_comparative_fault",
  "damages_credibility",
  "coverage_path",
  "collectability_deep_pocket",
  "procedural_urgency",
  "client_risk_markers",
  "case_type_fit",
]);

// The ten question-capture checklist ids (schema 2.1, three-state). Kept here
// as the single source of truth; validate.mjs enforces all ten, three-state.
export const QUESTION_CAPTURE_IDS = Object.freeze([
  "q1_exact_incident_date",
  "q2_prop213_insured_status",
  "q3_priors_same_body_part",
  "q4_citation_ticket",
  "q5_independent_witnesses",
  "q6_defendant_scope_rideshare",
  "q7_coverage_um",
  "q8_treatment_gap_lien",
  "q9_mist_guard",
  "q10_retained_elsewhere",
]);

// Capture-quality stepdown (schema 2.1 — N/A-aware ratio + hysteresis).
// The old rule (`questions_asked < 4` raw count over all ten) was the
// noisiest read in the pipeline: not_applicable questions counted against
// the rep, and the raw-count cliff sat exactly where extraction wobbles
// (two live runs of the same fixture read 1 vs 4 asked and flipped the
// tier). New rule:
//   ratio  = asked / (asked + not_asked)   — not_applicable EXCLUDED
//   stepdown ⇔ ratio < 0.4 AND not_asked >= 3
// The `>= 3 unasked` arm is hysteresis-by-design: on N/A-heavy calls
// (small applicable denominators) a ±1 extraction wobble moves the ratio a
// lot, but it cannot conjure three applicable-and-unasked questions.
export const CAPTURE_RATIO_THRESHOLD = 0.4;
export const CAPTURE_MIN_UNASKED = 3;

const STEP_DOWN = { high: "medium", medium: "low", low: "low" };

export function assessConfidence(llmOutput, config) {
  const dims = llmOutput.dimension_reads || {};
  const facts = llmOutput.extracted_facts || {};
  const qc = llmOutput.question_capture || {};
  const tq = llmOutput.transcript_quality || {};
  const reasons = [];

  // (a) transcript quality
  const unscoreable = tq.scoreable === false;
  if (unscoreable) reasons.push("transcript_unscoreable");

  // (b) unknown-dimension count
  const unknownDims = DIMENSION_IDS.filter(
    (d) => !dims[d] || dims[d].level === "unknown"
  );
  if (unknownDims.length > 2)
    reasons.push(`unknown_dimensions_${unknownDims.length}_of_7`);

  // (c) inferred-only gate triggers: a gate whose OUTCOME changes when
  // inferred values are allowed is resting on a guess — either it fires only
  // on an inferred trigger, or an inferred fact (e.g. a §3333.4(c) DUI
  // indicator) would suppress a gate that fires on observed facts alone.
  const observedPass = evaluateGates(facts, config, { includeInferred: false });
  const inferredPass = evaluateGates(facts, config, { includeInferred: true });
  const inferredTriggers = ["g1", "g2", "g3", "g4"].filter(
    (g) => inferredPass[g].fired && !observedPass[g].fired
  );
  if (inferredTriggers.length > 0)
    reasons.push(
      `gate_fact_inferred_not_observed_${inferredTriggers.join("_")}`
    );
  const inferredSuppressions = ["g1", "g2", "g3", "g4"].filter(
    (g) => !inferredPass[g].fired && observedPass[g].fired
  );
  if (inferredSuppressions.length > 0)
    reasons.push(
      `gate_exception_inferred_not_observed_${inferredSuppressions.join("_")}`
    );

  // (d) inferred-only MIST trigger: the overlay itself only acts on observed
  // minimal-impact facts (decision-table.mjs); when the profile appears only
  // with inferred values allowed, route to human review instead of acting.
  const mistObserved = isMistProfile(facts, dims, { includeInferred: false });
  const mistInferred = isMistProfile(facts, dims, { includeInferred: true });
  if (mistInferred && !mistObserved)
    reasons.push("mist_trigger_inferred_not_observed");

  const abstained = reasons.length > 0;

  // Tier from observability + capture coverage, never from self-report:
  // dims read on cited evidence, then a one-step downgrade when the rep's
  // question capture was too thin to trust the picture (N/A-aware ratio +
  // hysteresis — see CAPTURE_RATIO_THRESHOLD / CAPTURE_MIN_UNASKED above).
  const dimsRead = DIMENSION_IDS.filter(
    (d) =>
      dims[d] &&
      dims[d].level !== "unknown" &&
      dims[d].evidence !== "checked, absent" &&
      Array.isArray(dims[d].evidence) &&
      dims[d].evidence.length > 0
  ).length;
  const statuses = QUESTION_CAPTURE_IDS.map((id) => qc[id] && qc[id].status);
  const questionsAsked = statuses.filter((s) => s === "asked").length;
  const questionsNotAsked = statuses.filter((s) => s === "not_asked").length;
  const questionsNotApplicable = statuses.filter(
    (s) => s === "not_applicable"
  ).length;
  const applicable = questionsAsked + questionsNotAsked;
  // All-N/A (or empty) capture: nothing applicable went unasked — no penalty.
  const askedRatio = applicable === 0 ? null : questionsAsked / applicable;
  const captureStepdown =
    applicable > 0 &&
    askedRatio < CAPTURE_RATIO_THRESHOLD &&
    questionsNotAsked >= CAPTURE_MIN_UNASKED;

  let tier = dimsRead >= 6 ? "high" : dimsRead >= 4 ? "medium" : "low";
  if (captureStepdown) tier = STEP_DOWN[tier];
  if (abstained) tier = "low";

  return {
    tier,
    abstained,
    reasons,
    route: abstained ? "attorney_review" : "pipeline",
    observability: {
      dims_read_on_evidence: dimsRead,
      dims_unknown: unknownDims.length,
      questions_asked: questionsAsked,
      questions_not_asked: questionsNotAsked,
      questions_not_applicable: questionsNotApplicable,
      question_capture_ratio:
        askedRatio === null ? null : Math.round(askedRatio * 1000) / 1000,
      capture_stepdown: captureStepdown,
      inferred_gate_triggers: inferredTriggers,
      inferred_gate_exceptions: inferredSuppressions,
      inferred_mist_trigger: mistInferred && !mistObserved,
      transcript_scoreable: !unscoreable,
    },
  };
}
