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
  assert.equal(medium.tier, "medium"); // 7 dims read, but 0/10 asked
  const out = llmOutput({
    questionsAsked: 0,
    dimensionReads: dims({ damages_credibility: "unknown", coverage_path: "unknown" }),
  });
  const low = assessConfidence(out, CFG); // 5 dims read → medium, then downgrade
  assert.equal(low.tier, "low");
  assert.equal(low.abstained, false);
});

test("tier is never sourced from any model self-report field", () => {
  const out = llmOutput();
  out.self_reported_confidence = "high"; // adversarial extra field — must be ignored
  out.dimension_reads.damages_credibility.confidence = "high";
  const withField = assessConfidence(out, CFG);
  const without = assessConfidence(llmOutput(), CFG);
  assert.equal(withField.tier, without.tier);
});
