// Tests for the triage ground-truth loop — the calibration spine of the
// independent-audit product. Pure functions over triage_cases rows; no DB.
//
// The point being proved: the disposition engine's accuracy is now measurable.
// "When we said SIGN, you signed X%", the wrongful-decline safety error is
// named and 10×-weighted, open cases never pollute the math, and no rate is
// published without its n and confidence interval (§IV).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deriveTriageVerdict,
  reconcileTriage,
  triageConfusionMatrix,
  dispositionCalibration,
  signPrecision,
  passPrecision,
  wrongfulDeclines,
  weightedErrorScore,
  overallAgreement,
  triageDataQuality,
  wilson,
  publishable,
  buildCalibrationReport,
  isResolved,
  WRONGFUL_DECLINE_WEIGHT,
  MIN_PUBLISH_N,
} from "../src/lib/desk/triage-reconcile.mjs";

// Small helper to build a raw triage_cases-shaped row.
function row(disposition, status, extra = {}) {
  return { disposition, status, ...extra };
}

test("isResolved: only terminal statuses are ground truth", () => {
  assert.equal(isResolved("signed"), true);
  assert.equal(isResolved("declined"), true);
  assert.equal(isResolved("referred"), true);
  assert.equal(isResolved("new"), false);
  assert.equal(isResolved("callback"), false);
  assert.equal(isResolved("contacted"), false);
});

test("deriveTriageVerdict: the verdict table", () => {
  // sign_now
  assert.equal(deriveTriageVerdict("sign_now", "signed"), "agree");
  assert.equal(deriveTriageVerdict("sign_now", "declined"), "overcall");
  assert.equal(deriveTriageVerdict("sign_now", "referred"), "overcall");
  // decline_with_grace
  assert.equal(deriveTriageVerdict("decline_with_grace", "declined"), "agree");
  assert.equal(deriveTriageVerdict("decline_with_grace", "referred"), "agree");
  assert.equal(deriveTriageVerdict("decline_with_grace", "signed"), "wrongful_decline");
  // refer_out
  assert.equal(deriveTriageVerdict("refer_out", "referred"), "agree");
  assert.equal(deriveTriageVerdict("refer_out", "declined"), "agree");
  assert.equal(deriveTriageVerdict("refer_out", "signed"), "wrongful_decline");
  // develop is non-directional
  assert.equal(deriveTriageVerdict("develop", "signed"), "develop_resolved");
  assert.equal(deriveTriageVerdict("develop", "declined"), "develop_resolved");
  // open cases have no ground truth
  assert.equal(deriveTriageVerdict("sign_now", "new"), "open");
  assert.equal(deriveTriageVerdict("decline_with_grace", "callback"), "open");
});

test("normalizeTriageRow: falls back to verdict_json when disposition column is absent", () => {
  const [r] = reconcileTriage([
    { status: "signed", verdict_json: JSON.stringify({ disposition: "sign_now" }) },
  ]);
  assert.equal(r.disposition, "sign_now");
  assert.equal(r.verdict, "agree");
});

test("confusion matrix: counts resolved only, tracks open separately", () => {
  const rows = reconcileTriage([
    row("sign_now", "signed"),
    row("sign_now", "declined"),
    row("decline_with_grace", "declined"),
    row("decline_with_grace", "signed"), // wrongful decline
    row("develop", "signed"),
    row("sign_now", "new"), // open — excluded
    row("refer_out", "referred"),
  ]);
  const cm = triageConfusionMatrix(rows);
  assert.equal(cm.matrix.sign_now.signed, 1);
  assert.equal(cm.matrix.sign_now.declined, 1);
  assert.equal(cm.matrix.decline_with_grace.signed, 1);
  assert.equal(cm.matrix.decline_with_grace.declined, 1);
  assert.equal(cm.matrix.develop.signed, 1);
  assert.equal(cm.matrix.refer_out.referred, 1);
  assert.equal(cm.resolved, 6);
  assert.equal(cm.open, 1);
  assert.equal(cm.rowTotals.sign_now, 2);
});

test("signPrecision / passPrecision: headline rates with n and interval", () => {
  const rows = reconcileTriage([
    row("sign_now", "signed"),
    row("sign_now", "signed"),
    row("sign_now", "signed"),
    row("sign_now", "declined"), // 3/4 signed
    row("decline_with_grace", "declined"),
    row("decline_with_grace", "referred"),
    row("decline_with_grace", "signed"), // 2/3 passed
  ]);
  const sp = signPrecision(rows);
  assert.equal(sp.n, 4);
  assert.equal(sp.point, 0.75);
  assert.ok(sp.lo < 0.75 && sp.hi > 0.75, "interval brackets the point");
  const pp = passPrecision(rows);
  assert.equal(pp.n, 3);
  assert.ok(Math.abs(pp.point - 2 / 3) < 1e-9);
});

test("wrongfulDeclines: named safety error across decline AND refer, with ids", () => {
  const rows = reconcileTriage([
    row("decline_with_grace", "signed", { id: 1 }),
    row("refer_out", "signed", { id: 2 }),
    row("decline_with_grace", "declined", { id: 3 }),
    row("refer_out", "referred", { id: 4 }),
    row("sign_now", "declined", { id: 5 }), // an overcall, not a wrongful decline
  ]);
  const wd = wrongfulDeclines(rows);
  assert.equal(wd.count, 2);
  assert.equal(wd.ofAdvisedAgainst, 4);
  assert.equal(wd.rate, 0.5);
  assert.deepEqual(wd.ids.sort(), [1, 2]);
});

test("weightedErrorScore: wrongful declines weigh 10x an overcall", () => {
  const rows = reconcileTriage([
    row("sign_now", "declined"), // overcall = 1
    row("decline_with_grace", "signed"), // wrongful decline = 10
    row("sign_now", "signed"), // agree = 0
    row("develop", "signed"), // non-directional — not scored
  ]);
  const w = weightedErrorScore(rows);
  assert.equal(w.errors, 2);
  assert.equal(w.weighted, 1 + WRONGFUL_DECLINE_WEIGHT);
  assert.equal(w.scored, 3); // develop excluded
});

test("overallAgreement: directional accuracy excludes develop and open", () => {
  const rows = reconcileTriage([
    row("sign_now", "signed"), // agree
    row("decline_with_grace", "declined"), // agree
    row("sign_now", "declined"), // overcall
    row("develop", "signed"), // excluded
    row("sign_now", "new"), // excluded (open)
  ]);
  const oa = overallAgreement(rows);
  assert.equal(oa.n, 3);
  assert.ok(Math.abs(oa.point - 2 / 3) < 1e-9);
});

test("dispositionCalibration: develop is non-directional, others carry agreeRate", () => {
  const rows = reconcileTriage([
    row("sign_now", "signed"),
    row("develop", "declined"),
  ]);
  const cal = dispositionCalibration(rows);
  const dev = cal.find((c) => c.disposition === "develop");
  const sign = cal.find((c) => c.disposition === "sign_now");
  assert.equal(dev.directional, false);
  assert.equal(dev.agreeRate, null);
  assert.equal(sign.directional, true);
  assert.equal(sign.agreeRate, 1);
});

test("triageDataQuality: open cases are surfaced as holes", () => {
  const rows = reconcileTriage([
    row("sign_now", "signed"),
    row("sign_now", "new"),
    row("decline_with_grace", "callback"),
  ]);
  const dq = triageDataQuality(rows);
  assert.equal(dq.total, 3);
  assert.equal(dq.resolved, 1);
  assert.equal(dq.open, 2);
  assert.ok(Math.abs(dq.pctOpen - 2 / 3) < 1e-9);
});

test("wilson: interval is null-safe on empty and brackets a mid proportion", () => {
  const empty = wilson(0, 0);
  assert.equal(empty.point, null);
  assert.equal(empty.n, 0);
  const half = wilson(5, 10);
  assert.equal(half.point, 0.5);
  assert.ok(half.lo > 0 && half.lo < 0.5);
  assert.ok(half.hi > 0.5 && half.hi < 1);
});

test("publishable: small samples are gated below the minimum", () => {
  assert.equal(publishable(MIN_PUBLISH_N - 1), false);
  assert.equal(publishable(MIN_PUBLISH_N), true);
});

test("buildCalibrationReport: assembles the full payload from raw rows", () => {
  const raw = [
    { disposition: "sign_now", status: "signed" },
    { disposition: "decline_with_grace", status: "signed", id: 9 },
    { disposition: "sign_now", status: "new" },
  ];
  const rep = buildCalibrationReport(raw);
  assert.equal(rep.confusion.resolved, 2);
  assert.equal(rep.confusion.open, 1);
  assert.equal(rep.wrongfulDeclines.count, 1);
  assert.deepEqual(rep.wrongfulDeclines.ids, [9]);
  assert.ok(rep.byDisposition.length === 4);
});
