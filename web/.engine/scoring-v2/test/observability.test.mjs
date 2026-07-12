// Unit tests: call-quality vs. normal-unknown separation (scoring-v2.2).
// The floor a competent intake must capture (rep behavior) is distinguished
// from develop_only unknowns (normal, never a penalty).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OBSERVABILITY_DEFAULTS,
  MUST_ASK_FLOOR,
  MUST_ASK_FLOOR_CONCEPTS,
  classifyCallQuality,
} from "../lib/observability.mjs";

// Helper: a caller_stateable fact observed on the call.
const observed = (value = true) => ({
  value,
  evidence: { quote: "..." },
  observability: "observed_on_call",
  confidence: "high",
});

test("empty input is safe: no flag, function returns the three keys", () => {
  const r = classifyCallQuality({});
  assert.equal(r.call_quality_flag, false);
  assert.ok(Array.isArray(r.floor_missing));
  assert.ok(Array.isArray(r.benign_develop_unknowns));
  // No-arg call is safe too.
  const r2 = classifyCallQuality();
  assert.equal(r2.call_quality_flag, false);
});

test("empty input: floor_missing may be non-empty but never flags", () => {
  const r = classifyCallQuality({ facts: {}, question_capture: {} });
  // Conceptual-floor facts are absent, so they surface as missing...
  assert.ok(r.floor_missing.length >= 2);
  // ...but with no call data to judge, this is a no-op, not a bad call.
  assert.equal(r.call_quality_flag, false);
});

test("missing incident date + coverage question not asked → call-quality flag", () => {
  const r = classifyCallQuality({
    facts: {
      case_type_primary: observed("mva_standard"),
      injury_claims: observed(["neck"]),
      defendant_type: observed("individual"),
    },
    question_capture: {
      q1_exact_incident_date: { status: "not_asked", evidence: "" },
      q7_coverage_um: { status: "not_asked", evidence: "" },
    },
  });
  assert.ok(r.floor_missing.includes("q1_exact_incident_date"));
  assert.ok(r.floor_missing.includes("q7_coverage_um"));
  assert.equal(r.call_quality_flag, true);
});

test("a single missing floor item is not yet a quality problem", () => {
  const r = classifyCallQuality({
    facts: {
      case_type_primary: observed("mva_standard"),
      injury_claims: observed(["neck"]),
      defendant_type: observed("individual"),
    },
    question_capture: {
      q1_exact_incident_date: { status: "not_asked", evidence: "" },
      q7_coverage_um: { status: "asked", evidence: "any UM/UIM coverage?" },
    },
  });
  assert.deepEqual(r.floor_missing, ["q1_exact_incident_date"]);
  assert.equal(r.call_quality_flag, false);
});

test("only develop_only unknowns, full floor present → benign, no flag", () => {
  const r = classifyCallQuality({
    facts: {
      // full conceptual floor, observed
      case_type_primary: observed("mva_standard"),
      injury_claims: observed(["neck"]),
      defendant_type: observed("individual"),
      // develop_only facts unknown/absent
      lien_sources: {
        value: null,
        evidence: "checked, absent",
        observability: "unknown",
        confidence: "low",
      },
    },
    question_capture: {
      q1_exact_incident_date: { status: "asked", evidence: "when?" },
      q2_prop213_insured_status: { status: "asked", evidence: "insured?" },
      q7_coverage_um: { status: "asked", evidence: "UM?" },
      q10_retained_elsewhere: { status: "asked", evidence: "other counsel?" },
    },
  });
  assert.deepEqual(r.floor_missing, []);
  assert.equal(r.call_quality_flag, false);
  // The develop_only fields the caller could never state show up as benign.
  assert.ok(r.benign_develop_unknowns.includes("lien_sources"));
  assert.ok(
    r.benign_develop_unknowns.includes("coverage_stack.def_bi_limits_stated")
  );
});

test("develop_only unknowns never contribute to the flag", () => {
  // Every develop_only field unknown, but the whole floor captured.
  const r = classifyCallQuality({
    facts: {
      case_type_primary: observed("mva_standard"),
      injury_claims: observed(["neck"]),
      defendant_type: observed("individual"),
    },
    question_capture: {
      q1_exact_incident_date: { status: "asked", evidence: "when?" },
      q2_prop213_insured_status: { status: "asked", evidence: "insured?" },
      q7_coverage_um: { status: "asked", evidence: "UM?" },
      q10_retained_elsewhere: { status: "asked", evidence: "other counsel?" },
    },
  });
  assert.equal(r.call_quality_flag, false);
  assert.ok(r.benign_develop_unknowns.length >= 5);
});

test("OBSERVABILITY_DEFAULTS: lien_sources develop_only, incident_date caller_stateable", () => {
  assert.equal(OBSERVABILITY_DEFAULTS.lien_sources, "develop_only");
  assert.equal(
    OBSERVABILITY_DEFAULTS.incident_date_stated,
    "caller_stateable"
  );
  assert.equal(
    OBSERVABILITY_DEFAULTS["coverage_stack.def_bi_limits_stated"],
    "develop_only"
  );
  assert.equal(OBSERVABILITY_DEFAULTS.caller_insured_status, "sometimes");
});

test("exports are frozen and the floor is the expected shape", () => {
  assert.ok(Object.isFrozen(OBSERVABILITY_DEFAULTS));
  assert.ok(Object.isFrozen(MUST_ASK_FLOOR));
  assert.ok(Object.isFrozen(MUST_ASK_FLOOR_CONCEPTS));
  assert.deepEqual(MUST_ASK_FLOOR, [
    "q1_exact_incident_date",
    "q2_prop213_insured_status",
    "q7_coverage_um",
    "q10_retained_elsewhere",
  ]);
  assert.equal(MUST_ASK_FLOOR_CONCEPTS.length, 3);
  assert.throws(() => {
    OBSERVABILITY_DEFAULTS.lien_sources = "caller_stateable";
  }, TypeError);
});

test("a present-but-not-on-call floor fact counts as missing", () => {
  const r = classifyCallQuality({
    facts: {
      case_type_primary: { value: null, observability: "not_on_call" },
      injury_claims: { value: null, observability: "unknown" },
      defendant_type: observed("individual"),
    },
    question_capture: {
      q1_exact_incident_date: { status: "asked", evidence: "when?" },
    },
  });
  assert.ok(r.floor_missing.includes("case_type_primary"));
  assert.ok(r.floor_missing.includes("injury_claims"));
  assert.equal(r.call_quality_flag, true);
});
