// composeIntakeFile — turn a cockpit/triage record (the form the specialist
// confirmed + the engine's verdict) into a records-grade INTAKE FILE: the
// structured artifact that writes into the firm's case-management system and
// stands as the Rule 1.18 record. Pure and deterministic (no I/O), so it's
// testable and reusable across the Filevine/Lead Docket/Clio adapters.
//
// Classification carries the SALI Area-of-Law code (the legal industry's own
// taxonomy) so the record speaks the standard vocabulary every major CRM/vendor
// already understands — interoperability + a records-grade classification, not a
// bespoke one. No dollar figure (§IV); a recommendation for the attorney.

import { dispositionPlain, valueTierPlain } from "./triage-view.mjs";

// Our case-type ids -> SALI LMSS Area-of-Law codes (PI lives under TORT-*).
const SALI_AREA = {
  mva_standard: "TORT-NGMP",
  motorcycle: "TORT-NGMP",
  pedestrian_bicycle: "TORT-NGMP",
  trucking: "TORT-NGMP",
  rideshare: "TORT-NGMP",
  premises: "TORT-NGMP",
  dog_bite: "TORT-NGMP",
  product: "TORT-PRDL",
  med_mal: "TORT-NGMP",
  nursing_home: "TORT-NGMP",
  work_injury: "TORT-NGMP",
  dram_shop: "TORT-NGMP",
  wrongful_death: "TORT-NGMP",
  other_pi: "TORT",
};

const LIABILITY_PLAIN = {
  clear: "Clearly the other side",
  disputed: "Disputed",
  unclear: "Not yet clear",
  client_mostly_at_fault: "Mostly our caller",
};
const INJURY_PLAIN = {
  none: "None / property only",
  soft_tissue: "Soft tissue",
  moderate: "Moderate, ongoing treatment",
  hard: "Fracture / surgery / TBI",
  catastrophic: "Catastrophic",
  death: "Death",
};
const COVERAGE_PLAIN = {
  unknown: "Unknown",
  none_uninsured: "Uninsured",
  minimal: "Minimal (~$15-25k)",
  moderate: "Moderate (~$50-100k)",
  high: "High ($100k+)",
  commercial_deep: "Commercial / deep pocket",
};
const MODIFIER_LABELS = {
  police_report_favorable: "Police report blames the other side",
  independent_witnesses: "Independent witnesses",
  objective_findings: "Imaging / surgery / ER",
  ambulance_transport: "Ambulance / ER transport",
  significant_property_damage: "Significant property damage",
  treatment_gap: "Gap in treatment",
  client_has_um: "Caller has UM / UIM",
  government_defendant: "Government defendant",
  minor: "Minor",
};

function caseTypeLabel(caseTypes, id) {
  const hit = Array.isArray(caseTypes) ? caseTypes.find((c) => c.id === id) : null;
  return hit?.label ?? String(id ?? "Injury");
}

/**
 * @param {{ id?: string | number | null,
 *           form?: Record<string, unknown>,
 *           verdict?: Record<string, unknown> | null,
 *           caseTypes?: Array<{ id: string, label: string }> }} [opts]
 */
export function composeIntakeFile({ id, form = {}, verdict = null, caseTypes = [] } = {}) {
  const caseType = String(form.case_type ?? "other_pi");
  const facts = [];
  if (form.liability) facts.push({ key: "liability", label: "Liability", value: LIABILITY_PLAIN[String(form.liability)] ?? String(form.liability) });
  if (form.injury) facts.push({ key: "injury", label: "Injury", value: INJURY_PLAIN[String(form.injury)] ?? String(form.injury) });
  if (form.coverage) facts.push({ key: "coverage", label: "Coverage", value: COVERAGE_PLAIN[String(form.coverage)] ?? String(form.coverage) });
  if (form.client_insured_status && form.client_insured_status !== "unknown")
    facts.push({ key: "client_insured_status", label: "Caller insured (Prop 213)", value: String(form.client_insured_status) });
  for (const [k, label] of Object.entries(MODIFIER_LABELS)) {
    if (form[k]) facts.push({ key: k, label, value: "yes" });
  }
  const redFlags = (form.red_flags && typeof form.red_flags === "object" ? form.red_flags : {});
  if (redFlags.already_represented) facts.push({ key: "already_represented", label: "Already represented", value: "yes — Rule 4.2" });

  const disposition = verdict?.disposition ? String(verdict.disposition) : null;
  const sol = (verdict?.sol ?? {});

  return {
    external_ref: id != null ? String(id) : null,
    person: {
      name: form.caller_name ? String(form.caller_name) : null,
      phone: form.caller_phone ? String(form.caller_phone) : null,
    },
    incident: {
      case_type: caseType,
      case_type_label: caseTypeLabel(caseTypes, caseType),
      area_of_law_sali: SALI_AREA[caseType] ?? "TORT",
      incident_date: form.incident_date ? String(form.incident_date) : null,
      sol_deadline: sol.deadline_date ? String(sol.deadline_date) : null,
      sol_urgency: sol.urgency ? String(sol.urgency) : null,
    },
    facts,
    disposition,
    disposition_plain: disposition ? dispositionPlain(disposition) : null,
    value_tier: verdict?.value_tier ? valueTierPlain(String(verdict.value_tier)) : null,
    driving_reason: verdict?.driving_reason ? String(verdict.driving_reason) : null,
    attorney_review: Boolean(verdict?.attorney_review_required),
    summary: buildSummary({ facts, disposition, sol, caseTypes, caseType, verdict }),
  };
}

function buildSummary({ facts, disposition, sol, caseTypes, caseType, verdict }) {
  const lines = [];
  lines.push(`Intake QA — ${caseTypeLabel(caseTypes, caseType)}.`);
  if (disposition) lines.push(`Read: ${dispositionPlain(disposition)}${verdict?.value_tier ? ` · ${valueTierPlain(String(verdict.value_tier))}` : ""}.`);
  if (verdict?.driving_reason) lines.push(String(verdict.driving_reason));
  for (const f of facts) lines.push(`• ${f.label}: ${f.value}`);
  if (sol?.deadline_date) lines.push(`Filing clock: est. ${sol.deadline_date}${sol.urgency ? ` (${sol.urgency})` : ""}.`);
  if (verdict?.attorney_review_required) lines.push("Flagged for attorney review.");
  lines.push("Recommendation for attorney review, not a final decision or legal advice.");
  return lines.join("\n");
}
