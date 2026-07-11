// scoring-v2/lib/confidence.mjs — confidence tier + abstention (stage 5).
// Computed from OBSERVABILITY METADATA in code — never from asking the model
// how confident it feels (LLM self-reported confidence correlates weakly
// with correctness; objective-spec §4/§5). Pure, no I/O.
//
// Abstention rules (objective-spec §5):
//   (a) transcript-quality gate tripped                     → abstain
//   (b) more than 2 of the 7 dimensions read `unknown`      → abstain
//   (c) any gate-relevant fact would fire a gate only on an
//       INFERRED (not observed) value                       → abstain
// Abstained calls withhold the disposition and route to attorney review.

import { evaluateGates } from "./gates.mjs";

export const DIMENSION_IDS = Object.freeze([
  "liability_comparative_fault",
  "damages_credibility",
  "coverage_path",
  "collectability_deep_pocket",
  "procedural_urgency",
  "client_risk_markers",
  "case_type_fit",
]);

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

  // (c) inferred-only gate triggers: a gate that fires when inferred values
  // are allowed but NOT on observed-only values is resting on a guess.
  const observedPass = evaluateGates(facts, config, { includeInferred: false });
  const inferredPass = evaluateGates(facts, config, { includeInferred: true });
  const inferredTriggers = ["g1", "g2", "g3", "g4"].filter(
    (g) => inferredPass[g].fired && !observedPass[g].fired
  );
  if (inferredTriggers.length > 0)
    reasons.push(
      `gate_fact_inferred_not_observed_${inferredTriggers.join("_")}`
    );

  const abstained = reasons.length > 0;

  // Tier from observability + capture coverage, never from self-report:
  // dims read on cited evidence, then a one-step downgrade when the rep's
  // question capture was too thin to trust the picture (< 4 of 10 asked).
  const dimsRead = DIMENSION_IDS.filter(
    (d) =>
      dims[d] &&
      dims[d].level !== "unknown" &&
      dims[d].evidence !== "checked, absent" &&
      Array.isArray(dims[d].evidence) &&
      dims[d].evidence.length > 0
  ).length;
  const questionsAsked = Object.values(qc).filter(
    (q) => q && q.asked === true
  ).length;

  let tier = dimsRead >= 6 ? "high" : dimsRead >= 4 ? "medium" : "low";
  if (questionsAsked < 4) tier = STEP_DOWN[tier];
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
      inferred_gate_triggers: inferredTriggers,
      transcript_scoreable: !unscoreable,
    },
  };
}
