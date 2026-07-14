// Review-gate state-machine tests (Stage 6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, transition, releaseReport, autoReleaseReport, AUTO_RELEASE_PROVENANCE, REPORT_STATUSES } from "../analysis/report-status.mjs";
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

// ── Tiered "sampled review" auto-release capability (default OFF via `auto`) ──

test("default (no auto) is UNCHANGED: release still requires the full checklist", () => {
  // The safety property for the state machine: without `auto`, behavior is exactly
  // as before — an empty/partial checklist cannot release.
  assert.throws(() => transition("analyst_review", "released", { checklistConfirmed: [] }), /every pre-release checklist item/);
  assert.throws(() => transition("analyst_review", "released", { checklistConfirmed: [true, false] }), /every pre-release checklist item/);
});

test("auto=true releases an auto_eligible finding WITHOUT the checklist", () => {
  assert.equal(transition("analyst_review", "released", { auto: true }), "released");
  // still cannot skip the review stage: draft -> released is illegal even with auto.
  assert.throws(() => transition("draft", "released", { auto: true }), /illegal/);
});

test("autoReleaseReport returns released + engine_scored provenance", () => {
  const r = autoReleaseReport({ from: "analyst_review" });
  assert.equal(r.status, "released");
  assert.equal(r.provenance, "engine_scored");
  assert.equal(r.provenance, AUTO_RELEASE_PROVENANCE);
});
