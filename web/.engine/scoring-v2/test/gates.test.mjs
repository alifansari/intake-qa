// Unit tests: the four catastrophe gates. Pure code, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gateG1Underwater,
  gateG2DeadlineTrap,
  gateG3ClientRisk,
  gateG4TrialCapital,
  evaluateGates,
  ALL_DISPOSITIONS,
  GATE_RELEVANT_FACT_IDS,
} from "../lib/gates.mjs";
import { baseFacts, observed, inferred, fact, CFG, SELECTIVE_CFG } from "./helpers.mjs";
import { normalizeConfig } from "../lib/config.mjs";

// ---------- G1 underwater ---------------------------------------------------

test("G1 fires on observed Prop 213 profile (uninsured owner/operator, no objective anchors)", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator", "I let the insurance lapse"),
  });
  const g = gateG1Underwater(facts);
  assert.equal(g.fired, true);
  assert.equal(g.trigger_quote, "I let the insurance lapse");
  assert.deepEqual(g.capped_dispositions, ["refer_out", "decline_with_grace"]);
});

test("G1 does NOT fire on Prop 213 profile when objective injury anchors are observed", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator"),
    imaging_or_surgery_signal: observed({ present: true, description: "surgery performed" }),
  });
  assert.equal(gateG1Underwater(facts).fired, false);
});

test("G1 does NOT fire when the Prop 213 fact is merely inferred (observed-only default)", () => {
  const facts = baseFacts({
    caller_insured_status: inferred("uninsured_owner_operator"),
  });
  assert.equal(gateG1Underwater(facts).fired, false);
  // ...but the inferred probe sees it (confidence layer uses this to abstain).
  assert.equal(gateG1Underwater(facts, { includeInferred: true }).fired, true);
});

test("G1 §3333.4(c): Prop 213 profile + OBSERVED defendant-DUI indicator → no cap, attorney review", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator", "I let the insurance lapse"),
    defendant_fault_indicators: observed(
      { description: "other driver arrested for DUI at the scene", dui_indicator: true },
      "they took him away in handcuffs, the officer said he was way over"
    ),
  });
  const g = gateG1Underwater(facts);
  assert.equal(g.fired, false, "underwater cap must be withheld");
  assert.deepEqual(g.capped_dispositions, [...ALL_DISPOSITIONS], "no cap");
  assert.ok(g.flags.includes("attorney_review_required"));
  assert.ok(g.flags.includes("possible_3333_4c_dui_exception"));
  assert.match(g.rationale, /3333\.4\(c\)/);
  assert.match(g.rationale, /attorney determines conviction status/);
  const r = evaluateGates(facts, CFG);
  assert.equal(r.attorney_review_required, true);
  assert.deepEqual(r.allowed, [...ALL_DISPOSITIONS]);
});

test("G1 fires as before on Prop 213 profile with dui_indicator false (no DUI stated)", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator", "I let the insurance lapse"),
    defendant_fault_indicators: observed(
      { description: "rear-end, police report taken", dui_indicator: false },
      "he hit me from behind"
    ),
  });
  const g = gateG1Underwater(facts);
  assert.equal(g.fired, true);
  assert.deepEqual(g.capped_dispositions, ["refer_out", "decline_with_grace"]);
});

test("G1 fires as before when the DUI indicator is merely INFERRED (exception needs a quote)", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator", "I let the insurance lapse"),
    defendant_fault_indicators: inferred({
      description: "caller thinks the other driver had been drinking",
      dui_indicator: true,
    }),
  });
  assert.equal(gateG1Underwater(facts).fired, true, "observed-only pass: gate fires");
  // Inferred probe: the exception would suppress it — confidence.mjs abstains on the difference.
  assert.equal(gateG1Underwater(facts, { includeInferred: true }).fired, false);
});

test("G1 fires on uninsured non-owner operator of an UNINSURED vehicle; not on permissive user of an insured one (§3333.4(a)(3))", () => {
  const barred = baseFacts({
    caller_insured_status: observed(
      "uninsured_driver_of_uninsured_vehicle",
      "it's my brother's car, neither of us has insurance on it"
    ),
  });
  assert.equal(gateG1Underwater(barred).fired, true);
  const excepted = baseFacts({
    caller_insured_status: observed(
      "uninsured_driver_of_insured_vehicle",
      "I don't have my own policy but the car I was driving is insured"
    ),
  });
  assert.equal(gateG1Underwater(excepted).fired, false);
});

test("G1 fires on min-limits + treating-on-lien + no anchors; not without the lien", () => {
  const minLimits = observed({
    carrier: "State Farm",
    minimal_limits_signal: true,
    commercial: false,
    uninsured: false,
  });
  const withLien = baseFacts({
    defendant_insurance_signal: minLimits,
    lien_treatment_signal: observed({
      treating_on_lien: true,
      no_health_insurance: true,
      solicited_clinic_referral: false,
    }),
  });
  assert.equal(gateG1Underwater(withLien).fired, true);

  const noLien = baseFacts({ defendant_insurance_signal: minLimits });
  assert.equal(gateG1Underwater(noLien).fired, false);
});

// ---------- G2 deadline-adjacent --------------------------------------------

test("G2 fires on each observed trigger and caps out develop", () => {
  for (const [factId, flag] of [
    ["sol_adjacent_signal", "sol_adjacent"],
    ["government_entity_signal", "government_entity_window"],
    ["perishable_evidence_signal", "perishable_evidence"],
  ]) {
    const facts = baseFacts({
      [factId]: observed({ present: true, description: "trigger" }, "trigger quote"),
    });
    const g = gateG2DeadlineTrap(facts);
    assert.equal(g.fired, true, factId);
    assert.ok(g.flags.includes(flag), factId);
    assert.ok(!g.capped_dispositions.includes("develop"), `${factId} must cap out develop`);
    assert.ok(g.capped_dispositions.includes("sign_now"));
    assert.equal(g.trigger_quote, "trigger quote");
    // Compliance: rationale never contains a computed date.
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(g.rationale));
  }
});

test("G2 does NOT fire on inferred-only signals by default", () => {
  const facts = baseFacts({
    sol_adjacent_signal: inferred({ present: true, description: "sounds old" }),
  });
  assert.equal(gateG2DeadlineTrap(facts).fired, false);
  assert.equal(gateG2DeadlineTrap(facts, { includeInferred: true }).fired, true);
});

// ---------- G3 client risk ---------------------------------------------------

test("G3 fires on two observed markers, raises review flag, NEVER caps dispositions", () => {
  const facts = baseFacts({
    client_risk_markers: observed(
      {
        fee_negotiation_attempt: true,
        attorney_shopping_signal: true,
        value_obsession_signal: false,
        noncooperation_signal: false,
      },
      "can you do twenty-five percent? my last two lawyers wouldn't"
    ),
  });
  const g = gateG3ClientRisk(facts);
  assert.equal(g.fired, true);
  assert.deepEqual(g.capped_dispositions, [...ALL_DISPOSITIONS]); // no auto-decline, ever
  assert.ok(g.flags.includes("attorney_review_required"));
});

test("G3 does NOT fire on a single marker", () => {
  const facts = baseFacts({
    client_risk_markers: observed({
      fee_negotiation_attempt: false,
      attorney_shopping_signal: false,
      value_obsession_signal: true,
      noncooperation_signal: false,
    }),
  });
  assert.equal(gateG3ClientRisk(facts).fired, false);
});

// ---------- G4 trial capital ---------------------------------------------------

test("G4 fires only when trial-only facts observed AND firm has no trial capital", () => {
  const facts = baseFacts({
    trial_posture_signal: observed({ present: true, description: "carrier denied liability outright" }),
  });
  assert.equal(gateG4TrialCapital(facts, SELECTIVE_CFG).fired, true);
  const trialFirm = normalizeConfig({ trial_capital: true });
  assert.equal(gateG4TrialCapital(facts, trialFirm).fired, false);
  assert.equal(gateG4TrialCapital(baseFacts(), SELECTIVE_CFG).fired, false);
});

// ---------- evaluateGates ------------------------------------------------------

test("evaluateGates intersects caps and aggregates flags", () => {
  const facts = baseFacts({
    caller_insured_status: observed("uninsured_owner_operator"),
    sol_adjacent_signal: observed({ present: true, description: "two years ago" }),
  });
  const r = evaluateGates(facts, CFG);
  assert.equal(r.g1.fired, true);
  assert.equal(r.g2.fired, true);
  // G1 allows {refer, decline}; G2 allows {sign, refer, decline} → intersection:
  assert.deepEqual(r.allowed, ["refer_out", "decline_with_grace"]);
  assert.ok(r.flags.includes("sol_adjacent"));
  assert.equal(r.attorney_review_required, false);
});

test("no gates fired → all dispositions allowed", () => {
  const r = evaluateGates(baseFacts(), CFG);
  assert.deepEqual(r.allowed, [...ALL_DISPOSITIONS]);
  assert.equal(r.g1.fired || r.g2.fired || r.g3.fired || r.g4.fired, false);
});

test("gate-relevant fact list covers every fact a gate or overlay reads", () => {
  for (const id of [
    "caller_insured_status",
    "defendant_insurance_signal",
    "lien_treatment_signal",
    "sol_adjacent_signal",
    "government_entity_signal",
    "perishable_evidence_signal",
    "client_risk_markers",
    "trial_posture_signal",
    "defendant_fault_indicators", // §3333.4(c) DUI exception flips G1
    "property_damage_stated", // MIST overlay trigger
  ]) {
    assert.ok(GATE_RELEVANT_FACT_IDS.includes(id), id);
  }
});
