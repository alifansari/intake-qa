// Review-gate state-machine tests (Stage 6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, transition, releaseReport, REPORT_STATUSES } from "../analysis/report-status.mjs";
import { REVIEW_CHECKLIST } from "../src/lib/leak-report/copy.mjs";

test("the three statuses are the canonical set", () => {
  assert.deepEqual(REPORT_STATUSES, ["draft", "analyst_review", "released"]);
});

test("legal transitions only", () => {
  assert.equal(canTransition("draft", "analyst_review"), true);
  assert.equal(canTransition("analyst_review", "released"), true);
  assert.equal(canTransition("analyst_review", "draft"), true);
  assert.equal(canTransition("draft", "released"), false); // must go through review
  assert.equal(canTransition("released", "draft"), false); // terminal
});

test("illegal transition throws", () => {
  assert.throws(() => transition("draft", "released", { checklistConfirmed: [true] }), /illegal/);
  assert.throws(() => transition("released", "analyst_review"), /illegal/);
});

test("cannot release with ANY checklist item unconfirmed", () => {
  const allButOne = REVIEW_CHECKLIST.map((_, i) => i !== 2); // one false
  assert.throws(() => releaseReport({ from: "analyst_review", checklistConfirmed: allButOne }), /every pre-release checklist item/);
  assert.throws(() => releaseReport({ from: "analyst_review", checklistConfirmed: [] }), /every pre-release checklist item/);
});

test("releases when every checklist item is confirmed", () => {
  const allTrue = REVIEW_CHECKLIST.map(() => true);
  assert.equal(releaseReport({ from: "analyst_review", checklistConfirmed: allTrue }), "released");
});
