// Unit tests: confidence tier + abstention from observability metadata.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessConfidence } from "../lib/confidence.mjs";
import { baseFacts, observed, inferred, dims, llmOutput, CFG } from "./helpers.mjs";

test("clean call: 7 dims on evidence + 8 questions asked → high, no abstention", () => {
  const c = assessConfidence(llmOutput(), CFG);
  assert.equal(c.abstained, false);
  assert.equal(c.tier, "high");
  assert.equal(c.route, "pipeline");
  assert.equal(c.observability.dims_read_on_evidence, 7);
});

test("abstain: more than 2 of 7 dimensions unknown", () => {
  const out = llmOutput({
    dimensionReads: dims({
      liability_comparative_fault: "unknown",
      damages_credibility: "unknown",
      coverage_path: "unknown",
    }),
  });
  const c = assessConfidence(out, CFG);
  assert.equal(c.abstained, true);
  assert.equal(c.tier, "low");
  assert.equal(c.route, "attorney_review");
  assert.ok(c.reasons.some((r) => r.startsWith("unknown_dimensions_3")));
});

test("exactly 2 unknown dimensions does NOT abstain", () => {
  const out = llmOutput({
    dimensionReads: dims({ damages_credibility: "unknown", coverage_path: "unknown" }),
  });
  assert.equal(assessConfidence(out, CFG).abstained, false);
});

test("abstain: gate-relevant fact would fire only on an inferred value", () => {
  const out = llmOutput({
    facts: baseFacts({ caller_insured_status: inferred("uninsured_owner_operator") }),
  });
  const c = assessConfidence(out, CFG);
  assert.equal(c.abstained, true);
  assert.ok(c.reasons.some((r) => r.includes("gate_fact_inferred_not_observed")));
  assert.deepEqual(c.observability.inferred_gate_triggers, ["g1"]);
});

test("abstain: gate outcome would change only via an inferred value (§3333.4(c) DUI exception inferred)", () => {
  const out = llmOutput({
    facts: baseFacts({
      caller_insured_status: observed("uninsured_owner_operator", "I let it lapse"),
      defendant_fault_indicators: inferred({
        description: "caller believes the other driver had been drinking",
        dui_indicator: true,
      }),
    }),
  });
  const c = assessConfidence(out, CFG);
  assert.equal(c.abstained, true);
  assert.equal(c.route, "attorney_review");
  assert.ok(c.reasons.some((r) => r.includes("gate_exception_inferred_not_observed_g1")));
  assert.deepEqual(c.observability.inferred_gate_exceptions, ["g1"]);
});

test("abstain: MIST minimal-impact trigger present only at inferred observability → human review", () => {
  const out = llmOutput({
    facts: baseFacts({
      property_damage_stated: inferred({ described: "sounded minor", minimal_impact_signal: true }),
    }),
    dimensionReads: dims({ damages_credibility: "thin" }),
  });
  const c = assessConfidence(out, CFG);
  assert.equal(c.abstained, true);
  assert.equal(c.route, "attorney_review");
  assert.ok(c.reasons.includes("mist_trigger_inferred_not_observed"));
  assert.equal(c.observability.inferred_mist_trigger, true);
});

test("observed MIST trigger does NOT abstain (the overlay simply acts)", () => {
  const out = llmOutput({
    facts: baseFacts({
      property_damage_stated: observed({ described: "bumper scuff", minimal_impact_signal: true }),
    }),
    dimensionReads: dims({ damages_credibility: "thin" }),
  });
  assert.equal(assessConfidence(out, CFG).abstained, false);
});

test("observed gate trigger does NOT abstain (the gate simply fires)", () => {
  const out = llmOutput({
    facts: baseFacts({ caller_insured_status: observed("uninsured_owner_operator") }),
  });
  assert.equal(assessConfidence(out, CFG).abstained, false);
});

test("abstain: transcript-quality gate tripped", () => {
  const c = assessConfidence(llmOutput({ scoreable: false }), CFG);
  assert.equal(c.abstained, true);
  assert.ok(c.reasons.includes("transcript_unscoreable"));
});

test("thin question capture downgrades the tier one step (never below low)", () => {
  const medium = assessConfidence(llmOutput({ questionsAsked: 0 }), CFG);
  assert.equal(medium.tier, "medium"); // 7 dims read, but 0/10 applicable asked
  assert.equal(medium.observability.capture_stepdown, true);
  const out = llmOutput({
    questionsAsked: 0,
    dimensionReads: dims({ damages_credibility: "unknown", coverage_path: "unknown" }),
  });
  const low = assessConfidence(out, CFG); // 5 dims read → medium, then downgrade
  assert.equal(low.tier, "low");
  assert.equal(low.abstained, false);
});

test("capture ratio is N/A-aware: not_applicable questions leave the denominator", () => {
  // 2 asked + 6 not_applicable + 2 not_asked → 2/4 = 50% ≥ 40%: no stepdown.
  // (The gold-5 med-mal profile: an MVA-shaped checklist must not penalize
  // a non-MVA intake.) Old raw-count rule would have downgraded (2 < 4).
  const c = assessConfidence(
    llmOutput({ questionsAsked: 2, questionsNotApplicable: 6 }),
    CFG
  );
  assert.equal(c.tier, "high");
  assert.equal(c.observability.capture_stepdown, false);
  assert.equal(c.observability.questions_asked, 2);
  assert.equal(c.observability.questions_not_asked, 2);
  assert.equal(c.observability.questions_not_applicable, 6);
  assert.equal(c.observability.question_capture_ratio, 0.5);
});

test("all-not_applicable capture: no applicable questions → no stepdown, null ratio", () => {
  const c = assessConfidence(
    llmOutput({ questionsAsked: 0, questionsNotApplicable: 10 }),
    CFG
  );
  assert.equal(c.tier, "high");
  assert.equal(c.observability.capture_stepdown, false);
  assert.equal(c.observability.question_capture_ratio, null);
});

test("hysteresis: ratio below 40% but fewer than 3 applicable questions unasked → no stepdown", () => {
  // 1 asked + 2 not_asked + 7 N/A → ratio 33% < 40% but only 2 unasked (< 3).
  // A ±1 extraction wobble on an N/A-heavy call cannot flip the tier.
  const c = assessConfidence(
    llmOutput({ questionsAsked: 1, questionsNotApplicable: 7 }),
    CFG
  );
  assert.equal(c.tier, "high");
  assert.equal(c.observability.capture_stepdown, false);
});

test("stepdown boundary: exactly 40% asked does NOT step down; just below does", () => {
  // 4 asked / 6 not_asked → 40% exactly: threshold is strict-less-than.
  const at = assessConfidence(llmOutput({ questionsAsked: 4 }), CFG);
  assert.equal(at.tier, "high");
  assert.equal(at.observability.capture_stepdown, false);
  // 3 asked / 7 not_asked → 30% < 40% and 7 unasked ≥ 3: step down.
  const below = assessConfidence(llmOutput({ questionsAsked: 3 }), CFG);
  assert.equal(below.tier, "medium");
  assert.equal(below.observability.capture_stepdown, true);
});

test("tier is never sourced from any model self-report field", () => {
  const out = llmOutput();
  out.self_reported_confidence = "high"; // adversarial extra field — must be ignored
  out.dimension_reads.damages_credibility.confidence = "high";
  const withField = assessConfidence(out, CFG);
  const without = assessConfidence(llmOutput(), CFG);
  assert.equal(withField.tier, without.tier);
});
