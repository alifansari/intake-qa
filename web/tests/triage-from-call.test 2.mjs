// Tests for auto-triage-from-recording (the pure mapping). Proves a scored
// call's v2 shadow verdict becomes a correct triage_case, that a missing or
// errored verdict yields null (never a blank triage), and that no dollar or
// deadline is invented (§IV).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  triageFromCall,
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
