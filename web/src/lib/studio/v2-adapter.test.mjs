// Unit tests for the v2 → ScoredCall cutover adapter. Pure, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  v2VerdictToScoredCall,
  dispositionToSignability,
  repHandlingScore,
  repCommitted,
} from "./v2-adapter.mjs";

const verdict = ({
  disposition = "sign_now",
  value_tier = "standard",
  confTier = "high",
  ratio = 0.8,
  rep = "no ask",
  caseType = "mva_standard",
  g1 = false,
  abstained = false,
} = {}) => ({
  engine: "scoring-v2",
  schema_version: "2.2",
  call_id: "call-1",
  call_type: "new_pi_inquiry",
  transcript_quality: { scoreable: true, language: "en" },
  facts: { rep_committing_action: { value: rep }, case_type_primary: { value: caseType } },
  dimension_reads: {},
  gates: {
    g1_underwater: { fired: g1, rationale: g1 ? "underwater" : null },
    g2_deadline_trap: { fired: false },
    g3_client_risk: { fired: false },
    g4_trial_capital: { fired: false },
  },
  recommendation: {
    recommended_disposition: abstained ? null : disposition,
    case_type: caseType,
    prior_context: "Published prior (not this firm's data): ...",
    disposition_basis: ["R6 all load-bearing reads strong/adequate → sign_now"],
    attorney_review_required: false,
    case_type_routing: { refer_default: false },
  },
  tiers: { value_tier, effort_tier: "standard", carry_tier: "medium", capital_tier: "minimal" },
  confidence: { tier: confTier, abstained, observability: { question_capture_ratio: ratio } },
  call_quality: { call_quality_flag: false },
  abstained,
  citations: [],
});

test("disposition maps to the product's categorical signability", () => {
  assert.equal(dispositionToSignability("sign_now"), "likely_signable");
  assert.equal(dispositionToSignability("develop"), "needs_development");
  assert.equal(dispositionToSignability("refer_out"), "needs_development");
  assert.equal(dispositionToSignability("decline_with_grace"), "likely_declinable");
  assert.equal(dispositionToSignability(null), "needs_development");
});

test("COMPLIANCE: the adapter NEVER emits a dollar figure", () => {
  const sc = v2VerdictToScoredCall(verdict({ value_tier: "high" }));
  const json = JSON.stringify(sc);
  assert.equal(sc.alerts.revenue_at_risk.amount_usd, undefined, "no amount_usd");
  assert.ok(!/amount_usd/.test(json), "no amount_usd key anywhere");
  // tier language only in the basis
  assert.match(sc.alerts.revenue_at_risk.basis, /tier only — no dollar/);
});

test("sign_now with no rep close → leaked_signable true", () => {
  const sc = v2VerdictToScoredCall(verdict({ disposition: "sign_now", rep: "no ask" }));
  assert.equal(sc.case_signability, "likely_signable");
  assert.equal(sc.alerts.lost_signable_case, true);
});

test("sign_now WITH a rep close → not leaked (already converted)", () => {
  const sc = v2VerdictToScoredCall(verdict({ disposition: "sign_now", rep: "e-sign sent, hard close" }));
  assert.equal(sc.alerts.lost_signable_case, false);
});

test("decline → not signable, not leaked", () => {
  const sc = v2VerdictToScoredCall(verdict({ disposition: "decline_with_grace" }));
  assert.equal(sc.case_signability, "likely_declinable");
  assert.equal(sc.alerts.lost_signable_case, false);
});

test("overall is a rep-handling proxy from capture ratio, not a dollar/triage number", () => {
  assert.equal(repHandlingScore(verdict({ ratio: 0.8 })), 80);
  // ratio:null (not undefined — an undefined would hit the factory default) exercises the tier fallback.
  assert.equal(repHandlingScore(verdict({ ratio: null, confTier: "high" })), 85);
  const sc = v2VerdictToScoredCall(verdict({ ratio: 0.5 }));
  assert.equal(sc.scores.overall, 50);
  assert.match(sc.scores.basis, /NOT the triage read/);
});

test("fired catastrophe gates surface as critical_fails; G3 never does", () => {
  const sc = v2VerdictToScoredCall(verdict({ g1: true }));
  assert.equal(sc.critical_fails.length, 1);
  assert.equal(sc.critical_fails[0].gate, "g1_underwater");
});

test("the full v2 verdict rides along under .v2, and abstention routes to human", () => {
  const sc = v2VerdictToScoredCall(verdict({ abstained: true }));
  assert.equal(sc.abstained, true);
  assert.equal(sc.case_signability, "needs_development");
  assert.equal(sc.v2.recommended_disposition, null);
  assert.ok(sc.v2.dimension_reads, "v2 payload carried through");
  assert.equal(sc.engine, "scoring-v2");
});

test("repCommitted reads the rep_committing_action fact", () => {
  assert.equal(repCommitted(verdict({ rep: "no ask" })), false);
  assert.equal(repCommitted(verdict({ rep: "offered retainer and sent e-sign" })), true);
});
