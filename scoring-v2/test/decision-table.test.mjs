// Unit tests: the deterministic decision table — every rule row, including
// the posture divergence on borderline profiles. Pure code, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideDisposition, valueTier, isMistProfile } from "../lib/decision-table.mjs";
import { evaluateGates } from "../lib/gates.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import {
  baseFacts,
  observed,
  dims,
  tiers,
  llmOutput,
  CFG,
  SELECTIVE_CFG,
  VOLUME_CFG,
} from "./helpers.mjs";

function run({ facts = baseFacts(), reads = {}, resource = tiers(), config = SELECTIVE_CFG }) {
  const out = llmOutput({ facts, dimensionReads: dims(reads), resourceTiers: resource });
  const gates = evaluateGates(facts, config);
  return { rec: decideDisposition({ llmOutput: out, gates, config }), gates };
}

// ---------- base rules R1–R6 --------------------------------------------------

test("R6: all load-bearing strong/adequate → sign_now", () => {
  const { rec } = run({ reads: { liability_comparative_fault: "strong", damages_credibility: "strong" } });
  assert.equal(rec.recommended_disposition, "sign_now");
  assert.ok(rec.disposition_basis[0].startsWith("R6"));
});

test("R1: case_type_fit fatal → refer_out (never decline for out-of-scope), comparison surfaced", () => {
  const facts = baseFacts({ case_type_primary: observed("med_mal") });
  const { rec } = run({
    facts,
    reads: { case_type_fit: "fatal", damages_credibility: "strong", coverage_path: "strong" },
    resource: tiers("heavy_lit", "long_tail", "heavy"),
  });
  assert.equal(rec.recommended_disposition, "refer_out");
  assert.ok(rec.refer_comparison, "refer comparison must be surfaced");
  assert.equal(rec.refer_comparison.likely_per_hour_winner, "refer_out");
});

test("R2: fatal load-bearing read → decline_with_grace (or refer_out when damages strong)", () => {
  const declined = run({ reads: { coverage_path: "fatal" } });
  assert.equal(declined.rec.recommended_disposition, "decline_with_grace");
  const referred = run({ reads: { coverage_path: "fatal", damages_credibility: "strong" } });
  assert.equal(referred.rec.recommended_disposition, "refer_out");
});

test("R3: any unknown load-bearing read → develop with a full payload", () => {
  const { rec } = run({ reads: { damages_credibility: "unknown" } });
  assert.equal(rec.recommended_disposition, "develop");
  const p = rec.develop_payload;
  assert.ok(p, "develop payload required");
  assert.ok(p.resolving_facts.some((f) => f.includes("damages")));
  assert.ok(["cheap_records", "moderate_workup", "expensive_workup"].includes(p.info_cost_class));
  assert.match(p.exit_condition_template, /Developing to learn/);
  assert.match(p.exit_condition_template, /expected disposition/);
  assert.match(p.exit_condition_template, /never computes dates/);
  assert.deepEqual(p.urgency_flags, []);
});

// ---------- THE POSTURE DIVERGENCE (borderline profile, same reads) -----------

test("R4 divergence: identical borderline reads → volume develops, selective declines", () => {
  const borderline = { damages_credibility: "thin", coverage_path: "thin" };
  const vol = run({ reads: borderline, config: VOLUME_CFG });
  const sel = run({ reads: borderline, config: SELECTIVE_CFG });
  assert.equal(vol.rec.recommended_disposition, "develop");
  assert.equal(sel.rec.recommended_disposition, "decline_with_grace");
  // Same reads, same gates — only the PART B posture differed.
  assert.equal(vol.rec.posture_applied, "volume");
  assert.equal(sel.rec.posture_applied, "selective");
});

test("R5 divergence: single thin read → volume signs, selective develops", () => {
  const oneThin = { coverage_path: "thin" };
  assert.equal(run({ reads: oneThin, config: VOLUME_CFG }).rec.recommended_disposition, "sign_now");
  assert.equal(run({ reads: oneThin, config: SELECTIVE_CFG }).rec.recommended_disposition, "develop");
});

test("per-case-type posture + threshold overrides apply (CFG: mva_standard=volume, dog_bite threshold=1)", () => {
  // mva_standard runs volume under CFG even though default is selective.
  const borderline = { damages_credibility: "thin", coverage_path: "thin" };
  const std = run({ reads: borderline, config: CFG });
  assert.equal(std.rec.posture_applied, "volume");
  assert.equal(std.rec.recommended_disposition, "develop");
  // dog_bite: threshold 1 → a single thin is already borderline; selective default → decline.
  const dog = run({
    facts: baseFacts({ case_type_primary: observed("dog_bite") }),
    reads: { coverage_path: "thin" },
    config: CFG,
  });
  assert.equal(dog.rec.recommended_disposition, "decline_with_grace");
  assert.ok(dog.rec.disposition_basis.some((b) => b.startsWith("R4")));
});

// ---------- overlays -----------------------------------------------------------

test("MIST overlay: borderline MIST file follows mist_handling", () => {
  const mistFacts = baseFacts({
    property_damage_stated: observed({ described: "bumper scuff", minimal_impact_signal: true }),
  });
  const borderline = { damages_credibility: "thin", coverage_path: "thin" };
  const declineCfg = normalizeConfig({ posture_default: "volume", mist_handling: "decline" });
  const r1 = run({ facts: mistFacts, reads: borderline, config: declineCfg });
  assert.equal(r1.rec.mist_flag, true);
  assert.equal(r1.rec.recommended_disposition, "decline_with_grace");
  const developCfg = normalizeConfig({ posture_default: "selective", mist_handling: "develop" });
  const r2 = run({ facts: mistFacts, reads: borderline, config: developCfg });
  assert.equal(r2.rec.recommended_disposition, "develop");
});

test("R7: heavy capital against a minimal budget flips sign_now to refer_out", () => {
  const cfg = normalizeConfig({ posture_default: "selective", capital_budget_tier: "minimal" });
  const { rec } = run({
    reads: { liability_comparative_fault: "strong", damages_credibility: "strong", coverage_path: "strong" },
    resource: tiers("heavy_lit", "long_tail", "heavy"),
    config: cfg,
  });
  assert.equal(rec.recommended_disposition, "refer_out");
  assert.ok(rec.disposition_basis.some((b) => b.startsWith("R7")));
});

test("R8: deadline-adjacent flips a near-clean develop to sign_now (forced exercise)", () => {
  const facts = baseFacts({
    sol_adjacent_signal: observed({ present: true, description: "over a year ago" }),
  });
  const { rec } = run({ facts, reads: { damages_credibility: "unknown" } });
  assert.equal(rec.recommended_disposition, "sign_now");
  assert.deepEqual(rec.urgency_flags, ["sol_adjacent"]);
  assert.ok(rec.disposition_basis.some((b) => b.includes("forced option exercise")));
});

test("R8: deadline-adjacent + marginal profile does NOT sit in develop — declines", () => {
  const facts = baseFacts({
    sol_adjacent_signal: observed({ present: true, description: "over a year ago" }),
  });
  const { rec } = run({
    facts,
    reads: { damages_credibility: "unknown", coverage_path: "thin", liability_comparative_fault: "thin" },
  });
  assert.equal(rec.recommended_disposition, "decline_with_grace");
});

test("R9: gate caps override the base rule (Prop 213 vs strong liability)", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator", "I let it lapse"),
  });
  const { rec, gates } = run({
    facts,
    reads: { liability_comparative_fault: "strong" }, // base would be sign_now
  });
  assert.equal(gates.g1.fired, true);
  assert.equal(rec.recommended_disposition, "decline_with_grace");
  assert.equal(rec.value_tier, "low");
  assert.ok(rec.disposition_basis.some((b) => b.startsWith("R9")));
});

test("G3 never changes the disposition — only the review flag", () => {
  const facts = baseFacts({
    client_risk_markers: observed({
      fee_negotiation_attempt: true,
      attorney_shopping_signal: true,
      value_obsession_signal: false,
      noncooperation_signal: false,
    }),
  });
  const { rec } = run({
    facts,
    reads: { liability_comparative_fault: "strong", damages_credibility: "strong" },
  });
  assert.equal(rec.recommended_disposition, "sign_now"); // NOT auto-declined
  assert.equal(rec.attorney_review_required, true);
});

// ---------- value tier lookup ---------------------------------------------------

test("valueTier lookup rows", () => {
  const noGates = evaluateGates(baseFacts(), SELECTIVE_CFG);
  const vt = (reads) => valueTier(dims(reads), noGates);
  assert.equal(vt({ damages_credibility: "strong", coverage_path: "strong" }), "high");
  assert.equal(vt({ damages_credibility: "strong" }), "standard"); // adequate path
  assert.equal(vt({}), "standard"); // all adequate
  assert.equal(vt({ damages_credibility: "thin" }), "low");
  assert.equal(vt({ damages_credibility: "unknown" }), "indeterminate");
  // G1 forces low regardless of reads:
  const g1Facts = baseFacts({ caller_insured_status: observed("uninsured_owner_operator") });
  const g1 = evaluateGates(g1Facts, SELECTIVE_CFG);
  assert.equal(valueTier(dims({ damages_credibility: "strong", coverage_path: "strong" }), g1), "low");
});

// ---------- compliance rails ------------------------------------------------------

test("no dollars, no dates, no terminal output in any recommendation", () => {
  const cases = [
    run({ reads: {} }),
    run({ reads: { damages_credibility: "unknown" } }),
    run({ facts: baseFacts({ caller_insured_status: observed("uninsured_owner_operator") }), reads: {} }),
  ];
  for (const { rec } of cases) {
    const s = JSON.stringify(rec);
    assert.ok(!/\$\d/.test(s), "no dollar figures");
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(s), "no computed dates");
    assert.equal(rec.compliance.recommendation_only, true);
    assert.equal(rec.compliance.requires_attorney_ratification, true);
  }
});

test("MIST profile detection requires all three legs", () => {
  const reads = dims({ damages_credibility: "thin" });
  const yes = baseFacts({
    property_damage_stated: observed({ described: "scuff", minimal_impact_signal: true }),
  });
  assert.equal(isMistProfile(yes, reads), true);
  assert.equal(isMistProfile(baseFacts(), reads), false); // no minimal-impact signal
  const withImaging = baseFacts({
    property_damage_stated: observed({ described: "scuff", minimal_impact_signal: true }),
    imaging_or_surgery_signal: observed({ present: true, description: "MRI positive" }),
  });
  assert.equal(isMistProfile(withImaging, reads), false); // objective anchors defeat MIST
});
