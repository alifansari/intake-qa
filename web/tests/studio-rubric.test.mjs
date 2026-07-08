// Tests for the DETERMINISTIC Spot Check rubric + leakage math. The headline
// score/grade must be pure, auditable math with NO LLM — these lock the weights,
// the grade map, the critical-fail override, and boundary grades.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSIONS,
  TOTAL_WEIGHT,
  GRADE_THRESHOLDS,
  CRITICAL_FAILS,
  gradeForScore,
  computeSpotCheck,
  computeLeakage,
  AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER,
} from "../src/lib/studio/rubric.mjs";

// --- Weights ----------------------------------------------------------------
test("six dimensions with the exact spec weights", () => {
  assert.equal(DIMENSIONS.length, 6);
  const byKey = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.weight]));
  assert.equal(byKey.reachability_speed, 25);
  assert.equal(byKey.human_vs_barrier, 15);
  assert.equal(byKey.rapport_trauma, 15);
  assert.equal(byKey.legal_danger_flags, 15);
  assert.equal(byKey.capture, 15);
  assert.equal(byKey.follow_up, 15);
});

test("weights sum to 100", () => {
  assert.equal(TOTAL_WEIGHT, 100);
});

// --- Grade map --------------------------------------------------------------
test("grade map: A>=90, B 80-89, C 70-79, D 60-69, F<60", () => {
  assert.deepEqual(
    GRADE_THRESHOLDS.map((t) => [t.grade, t.min]),
    [
      ["A", 90],
      ["B", 80],
      ["C", 70],
      ["D", 60],
      ["F", 0],
    ],
  );
});

test("gradeForScore boundaries", () => {
  assert.equal(gradeForScore(100), "A");
  assert.equal(gradeForScore(90), "A"); // lower boundary of A
  assert.equal(gradeForScore(89), "B"); // just below A
  assert.equal(gradeForScore(80), "B");
  assert.equal(gradeForScore(79), "C");
  assert.equal(gradeForScore(70), "C");
  assert.equal(gradeForScore(69), "D");
  assert.equal(gradeForScore(60), "D");
  assert.equal(gradeForScore(59), "F");
  assert.equal(gradeForScore(0), "F");
});

// --- Weighted computation ---------------------------------------------------
test("all dimensions at 100 -> score 100, grade A", () => {
  const inputs = Object.fromEntries(DIMENSIONS.map((d) => [d.key, 100]));
  const r = computeSpotCheck({ dimensionInputs: inputs });
  assert.equal(r.score, 100);
  assert.equal(r.grade, "A");
  assert.equal(r.criticalFailTriggered, false);
});

test("all dimensions at 0 -> score 0, grade F", () => {
  const r = computeSpotCheck({ dimensionInputs: {} });
  assert.equal(r.score, 0);
  assert.equal(r.grade, "F");
});

test("all dimensions at 50 -> score 50 (half of 100), grade F", () => {
  const inputs = Object.fromEntries(DIMENSIONS.map((d) => [d.key, 50]));
  const r = computeSpotCheck({ dimensionInputs: inputs });
  assert.equal(r.score, 50);
  assert.equal(r.grade, "F");
});

test("weighted mix: reachability(25)@100 + rest@0 -> 25", () => {
  const r = computeSpotCheck({ dimensionInputs: { reachability_speed: 100 } });
  assert.equal(r.score, 25);
});

test("a B-grade mix computes correctly", () => {
  // reachability 100 (25), human 100 (15), rapport 100 (15), legal 100 (15),
  // capture 100 (15), follow_up 50 (7.5) => 92.5 -> round 93 -> A? tune to B:
  // Use follow_up 0 => 85 -> B.
  const r = computeSpotCheck({
    dimensionInputs: {
      reachability_speed: 100,
      human_vs_barrier: 100,
      rapport_trauma: 100,
      legal_danger_flags: 100,
      capture: 100,
      follow_up: 0,
    },
  });
  assert.equal(r.score, 85);
  assert.equal(r.grade, "B");
});

test("invalid dimension inputs are treated as 0", () => {
  const r = computeSpotCheck({
    dimensionInputs: { reachability_speed: 77, human_vs_barrier: "100" },
  });
  assert.equal(r.score, 0); // 77 not in {0,50,100}; "100" is a string -> 0
});

// --- Critical-fail override -------------------------------------------------
test("critical fail caps grade at F even with a perfect score", () => {
  const inputs = Object.fromEntries(DIMENSIONS.map((d) => [d.key, 100]));
  const r = computeSpotCheck({
    dimensionInputs: inputs,
    criticalFails: ["non_lawyer_legal_opinion"],
  });
  assert.equal(r.score, 100); // numeric score unchanged (shown as-is)
  assert.equal(r.grade, "F"); // grade capped at F
  assert.equal(r.criticalFailTriggered, true);
  assert.deepEqual(r.activeCriticalFails, ["non_lawyer_legal_opinion"]);
  assert.equal(r.rawGrade, "A"); // raw grade preserved for transparency
});

test("all four critical fails are recognized keys", () => {
  const keys = CRITICAL_FAILS.map((c) => c.key);
  assert.deepEqual(keys, [
    "non_lawyer_legal_opinion",
    "premature_disqualification",
    "coverage_misstatement",
    "rude_dismissive",
  ]);
  const inputs = Object.fromEntries(DIMENSIONS.map((d) => [d.key, 100]));
  for (const k of keys) {
    const r = computeSpotCheck({ dimensionInputs: inputs, criticalFails: [k] });
    assert.equal(r.grade, "F", `critical fail ${k} should cap at F`);
  }
});

test("unknown critical-fail keys are ignored (do not trigger override)", () => {
  const inputs = Object.fromEntries(DIMENSIONS.map((d) => [d.key, 100]));
  const r = computeSpotCheck({ dimensionInputs: inputs, criticalFails: ["made_up"] });
  assert.equal(r.criticalFailTriggered, false);
  assert.equal(r.grade, "A");
});

// --- Leakage math -----------------------------------------------------------
test("leakage with no fee yields NO dollar figure (blank is honest)", () => {
  const r = computeLeakage({});
  assert.equal(r.singleCase, null);
  assert.equal(r.illustrativeAnnual, null);
  assert.equal(r.averageSignedCaseFee, null);
});

test("leakage: single-case = fee; annual = fee × recurrence × 12", () => {
  const r = computeLeakage({ averageSignedCaseFee: 12000, illustrativeMonthlyRecurrence: 1 });
  assert.equal(r.singleCase, 12000);
  assert.equal(r.illustrativeAnnual, 12000 * 1 * 12);
});

test("leakage: recurrence defaults to 1 when omitted", () => {
  const r = computeLeakage({ averageSignedCaseFee: 20000 });
  assert.equal(r.illustrativeMonthlyRecurrence, 1);
  assert.equal(r.illustrativeAnnual, 20000 * 12);
});

test("leakage: recurrence of 2 doubles the illustrative annual", () => {
  const r = computeLeakage({ averageSignedCaseFee: 10000, illustrativeMonthlyRecurrence: 2 });
  assert.equal(r.illustrativeAnnual, 10000 * 2 * 12);
});

test("placeholder fee is a documented number, not silently applied", () => {
  // The placeholder exists for the UI to OFFER, but computeLeakage never injects
  // it — with no fee supplied, the result stays blank.
  assert.equal(typeof AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER, "number");
  const r = computeLeakage({});
  assert.equal(r.singleCase, null);
});
