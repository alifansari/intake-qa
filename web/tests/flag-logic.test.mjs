// Unit tests for the case-type mapping added to the flag pipeline so real-firm
// cards show a case type (and, where the fee seed has it, a dollar range).

import { test } from "node:test";
import assert from "node:assert/strict";
import { caseTypeFromScore, evaluateFlag } from "../messaging/flag-logic.mjs";

test("caseTypeFromScore maps auto codes to the fee-keyed 'Auto accident' label", () => {
  for (const code of ["mva_standard", "mva_commercial", "motorcycle", "auto"]) {
    const label = caseTypeFromScore({ alerts: { revenue_at_risk: { case_type_matched: code } } });
    assert.equal(label, "Auto accident", `${code} -> Auto accident`);
  }
});

test("caseTypeFromScore maps premises and dog bite to their seeded fee labels", () => {
  assert.equal(
    caseTypeFromScore({ alerts: { revenue_at_risk: { case_type_matched: "premises" } } }),
    "Slip & fall",
  );
  assert.equal(
    caseTypeFromScore({ alerts: { revenue_at_risk: { case_type_matched: "dog_bite" } } }),
    "Dog bite",
  );
});

test("caseTypeFromScore humanizes an unknown code (readable, no fabricated fee)", () => {
  assert.equal(
    caseTypeFromScore({ alerts: { revenue_at_risk: { case_type_matched: "product_liability" } } }),
    "Product liability",
  );
});

test("caseTypeFromScore is null when the score has no at-risk case type", () => {
  assert.equal(caseTypeFromScore({}), null);
  assert.equal(caseTypeFromScore({ alerts: {} }), null);
  assert.equal(caseTypeFromScore(null), null);
});

test("evaluateFlag threads case_type onto the flag decision", () => {
  const score = {
    case_signability: "likely_signable",
    scores: { overall: 48, confidence: "high" },
    conversion: { retainer_outcome: "no_ask" },
    alerts: { revenue_at_risk: { case_type_matched: "mva_commercial" } },
  };
  const mapped = evaluateFlag({ score, receivedAt: new Date().toISOString(), now: new Date() });
  assert.equal(mapped.is_leaked_signable, 1);
  assert.equal(mapped.case_type, "Auto accident");
});
