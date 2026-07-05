// Tests for the SOL Guardian analysis pass. The date math is PURE and
// deterministic (no model), so these assertions are exact. The runner uses a
// fake extractor — zero network, zero cost, no ANTHROPIC_API_KEY needed. The
// point of the pass is an ESTIMATE with a mandatory disclaimer; we assert the
// disclaimer is always present.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSol,
  selectRule,
  urgencyBand,
  runSolGuardian,
  SOL_DISCLAIMER,
} from "../analysis/sol.mjs";

const NOW = new Date("2026-07-03T12:00:00Z");

test("selectRule: government wins over everything, then MICRA, then general", () => {
  assert.equal(selectRule({ caseType: "medical_malpractice", governmentDefendant: true }), "government_claim");
  assert.equal(selectRule({ caseType: "medical_malpractice", governmentDefendant: false }), "medical_malpractice");
  assert.equal(selectRule({ caseType: "motor_vehicle", governmentDefendant: false }), "general_pi");
});

test("urgencyBand thresholds", () => {
  assert.equal(urgencyBand(null), "unknown");
  assert.equal(urgencyBand(-1), "expired");
  assert.equal(urgencyBand(15), "critical");
  assert.equal(urgencyBand(60), "soon");
  assert.equal(urgencyBand(200), "ok");
});

test("general PI: 2 years from incident (CCP §335.1)", () => {
  const r = computeSol({ incidentDate: "2025-01-01", caseType: "motor_vehicle", now: NOW });
  assert.equal(r.applicable, "general_pi");
  assert.equal(r.statute, "Cal. Code Civ. Proc. §335.1");
  assert.equal(r.deadlineDate, "2027-01-01");
  assert.equal(r.urgency, "ok");
  assert.equal(r.disclaimer, SOL_DISCLAIMER);
});

test("government claim: 6 months, and it is the urgent one (Gov Code §911.2)", () => {
  const r = computeSol({ incidentDate: "2026-01-15", caseType: "motor_vehicle", governmentDefendant: true, now: NOW });
  assert.equal(r.applicable, "government_claim");
  assert.equal(r.statute, "Cal. Gov. Code §911.2");
  assert.equal(r.deadlineDate, "2026-07-15");
  assert.equal(r.daysRemaining, 12);
  assert.equal(r.urgency, "critical");
});

test("medical malpractice: 1 year (MICRA §340.5)", () => {
  const r = computeSol({ incidentDate: "2026-06-20", caseType: "medical_malpractice", now: NOW });
  assert.equal(r.applicable, "medical_malpractice");
  assert.equal(r.deadlineDate, "2027-06-20");
  assert.equal(r.urgency, "ok");
});

test("expired general claim reports expired", () => {
  const r = computeSol({ incidentDate: "2020-01-01", caseType: "premises", now: NOW });
  assert.equal(r.urgency, "expired");
  assert.ok(r.daysRemaining < 0);
});

test("minor + non-government: tolling flagged, never reported as expired", () => {
  const r = computeSol({ incidentDate: "2020-01-01", caseType: "premises", minor: true, now: NOW });
  assert.equal(r.minorTollingMayApply, true);
  assert.notEqual(r.urgency, "expired");
  assert.ok(r.notes.some((n) => /minor/i.test(n)));
});

test("minor + government: 6-month deadline is NOT tolled — stays urgent", () => {
  const r = computeSol({ incidentDate: "2026-01-15", governmentDefendant: true, minor: true, now: NOW });
  assert.equal(r.applicable, "government_claim");
  assert.equal(r.minorTollingMayApply, false);
  assert.ok(r.notes.some((n) => /not tolled|urgent/i.test(n)));
});

test("no incident date: cannot compute, says so, still disclaims", () => {
  const r = computeSol({ incidentDate: null, caseType: "unknown", now: NOW });
  assert.equal(r.applicable, null);
  assert.equal(r.urgency, "unknown");
  assert.equal(r.deadlineDate, null);
  assert.ok(r.notes.some((n) => /incident date/i.test(n)));
  assert.equal(r.disclaimer, SOL_DISCLAIMER);
});

test("month-end overflow clamps correctly (Aug 31 + 6mo -> Feb 28)", () => {
  const r = computeSol({ incidentDate: "2026-08-31", governmentDefendant: true, now: NOW });
  assert.equal(r.deadlineDate, "2027-02-28");
});

test("runSolGuardian: fake extractor -> computed estimate + echoed facts", async () => {
  const facts = {
    incident_date: "2026-01-15",
    case_type: "premises",
    government_defendant: true,
    plaintiff_is_minor: false,
  };
  const r = await runSolGuardian({
    transcript: "irrelevant",
    extractor: async () => facts,
    now: NOW,
  });
  assert.equal(r.applicable, "government_claim");
  assert.equal(r.deadlineDate, "2026-07-15");
  assert.deepEqual(r.facts, facts);
  assert.equal(r.disclaimer, SOL_DISCLAIMER);
});

test("computeSol: an unverified state refuses to guess a deadline", () => {
  const r = computeSol({ incidentDate: "2025-01-01", caseType: "motor_vehicle", state: "TX", now: NOW });
  assert.equal(r.deadlineDate, null);
  assert.equal(r.urgency, "unknown");
  assert.equal(r.applicable, null);
  assert.match(r.notes.join(" "), /not yet verified|California only/i);
  assert.equal(r.disclaimer, SOL_DISCLAIMER);
});

test("computeSol: California remains the verified default (byte-identical)", () => {
  const withState = computeSol({ incidentDate: "2025-01-01", caseType: "motor_vehicle", state: "CA", now: NOW });
  const noState = computeSol({ incidentDate: "2025-01-01", caseType: "motor_vehicle", now: NOW });
  assert.equal(withState.deadlineDate, "2027-01-01");
  assert.equal(withState.deadlineDate, noState.deadlineDate);
  assert.equal(withState.statute, noState.statute);
});
