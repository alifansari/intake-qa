// scoring-v2/lib/validate.mjs — structural validation of the LLM's JSON
// before any code-side stage runs. Pure, no dependencies. Returns
// { ok, errors: [...] } — the harness refuses to build a verdict from an
// invalid payload (garbage in must not become an actuarially-laundered
// verdict out).

import { DIMENSION_IDS } from "./confidence.mjs";

export const LEVELS = Object.freeze(["strong", "adequate", "thin", "unknown", "fatal"]);
export const OBSERVABILITY = Object.freeze([
  "observed_on_call",
  "inferred",
  "not_on_call",
  "unknown",
]);
export const EFFORT_TIERS = Object.freeze(["light_prelit", "standard", "heavy_lit", "unknown"]);
export const CARRY_TIERS = Object.freeze(["fast", "medium", "long_tail", "unknown"]);
export const CAPITAL_TIERS = Object.freeze(["minimal", "moderate", "heavy", "unknown"]);

export const REQUIRED_FACT_IDS = Object.freeze([
  "case_type_primary",
  "incident_date_stated",
  "incident_age_signal",
  "government_entity_signal",
  "sol_adjacent_signal",
  "perishable_evidence_signal",
  "caller_insured_status",
  "defendant_insurance_signal",
  "lien_treatment_signal",
  "imaging_or_surgery_signal",
  "client_risk_markers",
  "trial_posture_signal",
  "rep_committing_action",
  "property_damage_stated",
]);

function isEvidence(e) {
  if (e === "checked, absent") return true;
  if (e && typeof e === "object" && !Array.isArray(e) && typeof e.quote === "string")
    return true;
  return false;
}

function isDimEvidence(e) {
  if (e === "checked, absent") return true;
  return (
    Array.isArray(e) && e.every((x) => x && typeof x.quote === "string" && x.quote.length > 0)
  );
}

export function validateLlmOutput(out) {
  const errors = [];
  if (!out || typeof out !== "object") return { ok: false, errors: ["not an object"] };

  if (out.engine !== "scoring-v2") errors.push("engine != scoring-v2");
  if (!out.transcript_quality || typeof out.transcript_quality.scoreable !== "boolean")
    errors.push("transcript_quality.scoreable missing");

  // Compliance rails: the LLM layer must not emit dispositions/scores/values.
  for (const forbidden of [
    "recommended_disposition",
    "disposition",
    "value_tier",
    "overall_score",
    "score",
    "revenue_at_risk",
  ]) {
    if (forbidden in out) errors.push(`forbidden field in LLM output: ${forbidden}`);
  }

  const facts = out.extracted_facts;
  if (!facts || typeof facts !== "object") {
    errors.push("extracted_facts missing");
  } else {
    for (const id of REQUIRED_FACT_IDS) {
      const f = facts[id];
      if (!f) {
        errors.push(`fact missing: ${id}`);
        continue;
      }
      if (!OBSERVABILITY.includes(f.observability))
        errors.push(`fact ${id}: bad observability ${f.observability}`);
      if (!isEvidence(f.evidence)) errors.push(`fact ${id}: bad evidence shape`);
      // No citation, no claim: an observed fact must carry a quote.
      if (f.observability === "observed_on_call" && f.evidence === "checked, absent")
        errors.push(`fact ${id}: observed_on_call without a quote`);
    }
  }

  const dims = out.dimension_reads;
  if (!dims || typeof dims !== "object") {
    errors.push("dimension_reads missing");
  } else {
    for (const d of DIMENSION_IDS) {
      const r = dims[d];
      if (!r) {
        errors.push(`dimension missing: ${d}`);
        continue;
      }
      if (!LEVELS.includes(r.level)) errors.push(`dimension ${d}: bad level ${r.level}`);
      if (!isDimEvidence(r.evidence)) errors.push(`dimension ${d}: bad evidence shape`);
      // Cite-then-claim: a non-unknown level needs at least one quoted span
      // ("fatal" is never inferable; strong/adequate/thin need grounding).
      if (
        r.level !== "unknown" &&
        (r.evidence === "checked, absent" ||
          (Array.isArray(r.evidence) && r.evidence.length === 0))
      )
        errors.push(`dimension ${d}: level ${r.level} without cited evidence`);
      // Evidence-before-level is enforced in the emitted key order by the
      // prompt; post-parse we verify both keys exist and evidence is real.
    }
  }

  const tiers = out.resource_tiers || {};
  const tierChecks = [
    ["effort_tier", EFFORT_TIERS],
    ["carry_tier", CARRY_TIERS],
    ["capital_tier", CAPITAL_TIERS],
  ];
  for (const [name, allowed] of tierChecks) {
    const t = tiers[name];
    if (!t || !allowed.includes(t.tier)) errors.push(`resource tier ${name}: bad/missing`);
  }

  return { ok: errors.length === 0, errors };
}
