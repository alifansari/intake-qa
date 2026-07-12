// Unit tests: structural validation of the question-capture block
// (schema 2.1 — all ten checklist entries, three-state). The dimension/fact
// validation paths are exercised end-to-end by golds.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLlmOutput } from "../lib/validate.mjs";
import { QUESTION_CAPTURE_IDS } from "../lib/confidence.mjs";
import { llmOutput } from "./helpers.mjs";

test("valid three-state question capture passes", () => {
  const v = validateLlmOutput(llmOutput());
  assert.deepEqual(v.errors, []);
});

test("missing checklist entry is rejected", () => {
  const out = llmOutput();
  delete out.question_capture.q9_mist_guard;
  const v = validateLlmOutput(out);
  assert.ok(v.errors.some((e) => e.includes("missing entry: q9_mist_guard")));
});

test("legacy boolean `asked` shape (schema 2.0) is rejected", () => {
  const out = llmOutput();
  out.question_capture.q1_exact_incident_date = {
    asked: true,
    answer_summary: "answered",
    evidence: "asked span",
  };
  const v = validateLlmOutput(out);
  assert.ok(
    v.errors.some((e) => e.includes("q1_exact_incident_date: bad status"))
  );
});

test("unknown status value is rejected", () => {
  const out = llmOutput();
  out.question_capture.q2_prop213_insured_status.status = "skipped";
  const v = validateLlmOutput(out);
  assert.ok(v.errors.some((e) => e.includes("bad status skipped")));
});

test("asked without a rep quote is rejected (no citation, no claim)", () => {
  const out = llmOutput();
  out.question_capture.q3_priors_same_body_part = {
    status: "asked",
    answer_summary: "answered",
    evidence: "checked, absent",
  };
  const v = validateLlmOutput(out);
  assert.ok(v.errors.some((e) => e.includes("asked without a rep quote")));
});

test("question_capture block missing entirely is rejected", () => {
  const out = llmOutput();
  delete out.question_capture;
  const v = validateLlmOutput(out);
  assert.ok(v.errors.includes("question_capture missing"));
});

test("canonical id list is the pinned ten", () => {
  assert.equal(QUESTION_CAPTURE_IDS.length, 10);
  assert.equal(QUESTION_CAPTURE_IDS[0], "q1_exact_incident_date");
  assert.equal(QUESTION_CAPTURE_IDS[9], "q10_retained_elsewhere");
});
