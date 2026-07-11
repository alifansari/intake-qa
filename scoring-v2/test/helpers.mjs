// Shared builders for scoring-v2 unit tests. Pure data helpers.

import { normalizeConfig } from "../lib/config.mjs";

export function fact(overrides = {}) {
  return {
    value: null,
    evidence: "checked, absent",
    observability: "unknown",
    confidence: "high",
    ...overrides,
  };
}

export function observed(value, quote = "quoted span") {
  return {
    value,
    evidence: { quote, timestamp: "00:10", speaker: "CALLER" },
    observability: "observed_on_call",
    confidence: "high",
  };
}

export function inferred(value) {
  return {
    value,
    evidence: { quote: "derived from stated facts", timestamp: "00:10", speaker: "CALLER" },
    observability: "inferred",
    confidence: "medium",
  };
}

const absentSignal = () => fact({ value: { present: false, description: null } });

// A neutral fact set: every gate-relevant fact present and non-triggering.
export function baseFacts(overrides = {}) {
  return {
    case_type_primary: observed("mva_standard"),
    incident_date_stated: observed("March 14"),
    incident_age_signal: observed("three weeks ago"),
    government_entity_signal: absentSignal(),
    sol_adjacent_signal: absentSignal(),
    perishable_evidence_signal: absentSignal(),
    caller_insured_status: observed("insured"),
    defendant_insurance_signal: observed({
      carrier: "State Farm",
      minimal_limits_signal: false,
      commercial: false,
      uninsured: false,
    }),
    lien_treatment_signal: fact({
      value: { treating_on_lien: false, no_health_insurance: false, solicited_clinic_referral: false },
    }),
    imaging_or_surgery_signal: fact({ value: { present: false, description: null } }),
    client_risk_markers: fact({
      value: {
        fee_negotiation_attempt: false,
        attorney_shopping_signal: false,
        value_obsession_signal: false,
        noncooperation_signal: false,
      },
    }),
    trial_posture_signal: absentSignal(),
    rep_committing_action: observed("no ask"),
    property_damage_stated: observed({ described: "rear damage", minimal_impact_signal: false }),
    ...overrides,
  };
}

const DIM_IDS = [
  "liability_comparative_fault",
  "damages_credibility",
  "coverage_path",
  "collectability_deep_pocket",
  "procedural_urgency",
  "client_risk_markers",
  "case_type_fit",
];

// dims({ damages_credibility: "thin", ... }) — unspecified dims default to
// "adequate". Non-unknown levels get a cited evidence array.
export function dims(levels = {}) {
  const out = {};
  for (const id of DIM_IDS) {
    const level = levels[id] || "adequate";
    out[id] = {
      evidence:
        level === "unknown"
          ? "checked, absent"
          : [{ quote: `span for ${id}`, timestamp: "00:20", speaker: "CALLER" }],
      level,
      basis: `test basis for ${id}`,
    };
  }
  return out;
}

export function tiers(effort = "standard", carry = "medium", capital = "minimal") {
  const mk = (tier) => ({
    evidence: [{ quote: "tier span", timestamp: "00:30", speaker: "CALLER" }],
    tier,
    basis: "test",
  });
  return { effort_tier: mk(effort), carry_tier: mk(carry), capital_tier: mk(capital) };
}

export function questionCapture(askedCount = 8) {
  const out = {};
  for (let i = 1; i <= 10; i++) {
    out[`q${i}_test`] = {
      asked: i <= askedCount,
      answer_summary: i <= askedCount ? "answered" : null,
      evidence: i <= askedCount ? "asked span" : "checked, absent",
    };
  }
  return out;
}

export function llmOutput({
  facts = baseFacts(),
  dimensionReads = dims(),
  resourceTiers = tiers(),
  questionsAsked = 8,
  scoreable = true,
} = {}) {
  return {
    engine: "scoring-v2",
    schema_version: "2.0",
    call_id: "test-call",
    transcript_quality: { scoreable, language: "en", issues: [] },
    call_type: "new_pi_inquiry",
    extracted_facts: facts,
    question_capture: questionCapture(questionsAsked),
    dimension_reads: dimensionReads,
    resource_tiers: resourceTiers,
  };
}

// Meridian-equivalent config (mirrors firm-config-template PART B).
export const CFG = normalizeConfig({
  posture_default: "selective",
  posture_by_case_type: { mva_commercial: "selective", mva_standard: "volume" },
  develop_thin_threshold: 2,
  thin_threshold_by_case_type: { dog_bite: 1 },
  trial_capital: false,
  capital_budget_tier: "moderate",
  mist_handling: "develop",
});

export const SELECTIVE_CFG = normalizeConfig({
  posture_default: "selective",
  trial_capital: false,
});
export const VOLUME_CFG = normalizeConfig({
  posture_default: "volume",
  trial_capital: false,
});
