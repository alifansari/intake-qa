// Tests for auto-triage-from-recording (the pure mapping). Proves a scored
// call's v2 shadow verdict becomes a correct triage_case, that a missing or
// errored verdict yields null (never a blank triage), no dollar is invented
// (§IV), and the B-026 filing clock is computed ONLY from a cleanly captured
// date of loss — never understating a government/MICRA short clock.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  triageFromCall,
  solFromCall,
  gradeForDisposition,
  AUTO_TRIAGE_SOURCE,
} from "../src/lib/desk/triage-from-call.mjs";

function scored(v2 = {}, extra = {}) {
  return {
    _v2_shadow: {
      v2: { recommended_disposition: "sign_now", value_tier: "high", ...v2 },
      attorney_review_required: false,
      alerts: { revenue_at_risk: { case_type_matched: "mva_standard" } },
      summary: "clear liability, real injury",
      ...extra,
    },
  };
}

// A scored call whose v1 rubric captured a (cited) date of loss.
function scoredWithDate({ date_of_loss, clock_modifiers = [], high_value_indicators = [] } = {}) {
  const s = scored();
  s.qualification = { statute_window: { status: "captured", date_of_loss, clock_modifiers, evidence: "the wreck was in..." } };
  s.high_value_indicators = high_value_indicators;
  return s;
}

test("maps a sign_now verdict to an A-grade triage case with source + call link", () => {
  const t = triageFromCall({
    score: scored(),
    call: { id: 42, firm_id: 7, caller_name: "Jane", caller_phone: "555" },
  });
  assert.ok(t);
  assert.equal(t.disposition, "sign_now");
  assert.equal(t.value_tier, "high");
  assert.equal(t.grade_letter, "A");
  assert.equal(t.grade_color, "green");
  assert.equal(t.firm_id, 7);
  assert.equal(t.source, AUTO_TRIAGE_SOURCE);
  assert.equal(t.source_call_id, "42");
  assert.equal(t.created_by, "auto");
  assert.equal(t.caller_name, "Jane");
  assert.equal(t.case_type, "mva_standard");
  assert.equal(t.status, "new");
  assert.match(t.driving_reason, /liability/);
  // §IV: no invented dollar / deadline.
  assert.equal(t.sol_urgency, "unknown");
  assert.equal(t.sol_deadline, null);
  assert.equal(t.flip_fact, null);
  // call_id round-trips through input_json for dedupe.
  assert.equal(JSON.parse(t.input_json).call_id, "42");
});

test("grade mapping covers every disposition", () => {
  assert.equal(gradeForDisposition("sign_now").letter, "A");
  assert.equal(gradeForDisposition("develop").letter, "B");
  assert.equal(gradeForDisposition("refer_out").letter, "C");
  assert.equal(gradeForDisposition("decline_with_grace").letter, "D");
  assert.equal(gradeForDisposition("decline_with_grace").color, "red");
  assert.equal(gradeForDisposition(undefined).letter, "?");
});

test("attorney_review flows through", () => {
  const t = triageFromCall({
    score: scored({ recommended_disposition: "develop" }, { attorney_review_required: true }),
    call: { id: 1, firm_id: 1 },
  });
  assert.equal(t.attorney_review, true);
  assert.equal(t.grade_letter, "B");
});

test("no verdict -> null (never a blank triage)", () => {
  assert.equal(triageFromCall({ score: {}, call: { id: 1, firm_id: 1 } }), null, "no shadow");
  assert.equal(
    triageFromCall({ score: { _v2_shadow: { shadow_error: "boom" } }, call: { id: 1, firm_id: 1 } }),
    null,
    "shadow error",
  );
  assert.equal(
    triageFromCall({ score: { _v2_shadow: { v2: {} } }, call: { id: 1, firm_id: 1 } }),
    null,
    "no disposition",
  );
  assert.equal(triageFromCall({}), null, "no args");
});

test("value_tier defaults to indeterminate when absent", () => {
  const t = triageFromCall({
    score: scored({ value_tier: undefined }),
    call: { id: 5, firm_id: 2 },
  });
  assert.equal(t.value_tier, "indeterminate");
});

// ---- B-026 slice 2: the filing clock -------------------------------------

test("no captured date of loss -> clock stays a gap, never a guess", () => {
  const t = triageFromCall({ score: scored(), call: { id: 1, firm_id: 1 } });
  assert.equal(t.incident_date, null);
  assert.equal(t.sol_urgency, "unknown");
  assert.equal(t.sol_deadline, null);
  assert.equal(t.sol_days_remaining, null);
});

test("a cleanly captured date of loss computes the general 2-year PI clock", () => {
  // date 2024-06-01 + 2yr = 2026-06-01; now 2026-05-15 -> ~17 days -> critical.
  const t = triageFromCall({
    score: scoredWithDate({ date_of_loss: "2024-06-01" }),
    call: { id: 1, firm_id: 1 },
    now: new Date("2026-05-15T00:00:00Z"),
  });
  assert.equal(t.incident_date, "2024-06-01");
  assert.equal(t.sol_urgency, "critical");
  assert.ok(t.sol_deadline, "a concrete deadline date is set");
});

test("a government defendant is NOT understated (6-month clock, not 2-year)", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  const date_of_loss = "2026-01-01";
  // General PI: 2yr -> 2028-01-01 -> far away -> "ok".
  const gen = triageFromCall({ score: scoredWithDate({ date_of_loss }), call: { id: 1, firm_id: 1 }, now });
  // Same date, government entity: 6-month claim -> 2026-07-01 -> ~16 days -> critical.
  const gov = triageFromCall({
    score: scoredWithDate({ date_of_loss, high_value_indicators: ["government entity (public bus)"] }),
    call: { id: 2, firm_id: 1 },
    now,
  });
  assert.equal(gen.sol_urgency, "ok");
  assert.equal(gov.sol_urgency, "critical", "gov short clock must not be understated");
});

test("solFromCall honors a med-mal modifier and returns unknown without a date", () => {
  assert.equal(solFromCall(scored(), "mva_standard", new Date("2026-06-15Z")).sol_urgency, "unknown");
  const medmal = solFromCall(
    scoredWithDate({ date_of_loss: "2024-01-01", clock_modifiers: ["MICRA one-year"] }),
    "med_mal",
    new Date("2026-06-15T00:00:00Z"),
  );
  // MICRA 1yr from 2024-01-01 was 2025-01-01 -> long past -> expired.
  assert.equal(medmal.sol_urgency, "expired");
});
