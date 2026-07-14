// scoring-v2/triage-live.mjs
//
// LIVE, deterministic case triage from a short intake form. No transcript, no
// LLM, no API cost: an intake specialist enters what they heard on the call and
// gets an instant grade, the one reason driving it, and the single fact that
// would change it. This is what turns Intake QA from a retroactive call-QA
// report into a tool the desk uses live, on every call.
//
// It REUSES the calibrated v2 decision layer (evaluateGates, decideDisposition,
// value tiers, case-type routing) by shaping the form answers into the same
// facts object the LLM would produce, then layers the California statutory hard
// gates (ca-gates.mjs) on top as overrides. The scored-transcript pipeline and
// its golds/canaries are untouched, so calibration is preserved.
//
// Compliance rails (compliance-invariants IV, VIII): recommendation only,
// attorney ratification required, tiers not dollars, statutes cited, SOL is an
// estimate carrying its disclaimer. Nothing here is terminal or a guarantee.

import { evaluateGates } from "./lib/gates.mjs";
import { decideDisposition } from "./lib/decision-table.mjs";
import { normalizeConfig } from "./lib/config.mjs";
import { evaluateCaGates, worseDisposition } from "./lib/ca-gates.mjs";

export const TRIAGE_SCHEMA_VERSION = "triage-live-1.0";

// SOL is computed by the firm-visible analysis/sol.mjs, injected by the caller
// (opts.computeSol) so this engine stays pure and free of any cross-package
// import. Callers on the web side pass their local computeSol; tests pass the
// real one. Without it, the engine still runs and reports SOL as unknown (never
// guessing a deadline). This is the same disclaimer the real computer carries.
const SOL_DISCLAIMER_FALLBACK =
  "Estimated deadline only - not legal advice. An attorney must independently verify " +
  "every statute of limitations and government-claim date before relying on it.";
function fallbackComputeSol() {
  return {
    statute: null,
    periodLabel: null,
    deadlineDate: null,
    daysRemaining: null,
    urgency: "unknown",
    minorTollingMayApply: false,
    disclaimer: SOL_DISCLAIMER_FALLBACK,
  };
}

// The intake case types the form offers, mapped to the engine's routing ids.
// Extras beyond the engine table (dram_shop, nursing_home, work_injury) are
// handled by the CA gates and fall through to a neutral engine prior.
export const TRIAGE_CASE_TYPES = Object.freeze([
  { id: "mva_standard", label: "Car accident" },
  { id: "motorcycle", label: "Motorcycle accident" },
  { id: "pedestrian_bicycle", label: "Pedestrian / bicycle" },
  { id: "trucking", label: "Truck / commercial vehicle" },
  { id: "rideshare", label: "Rideshare (Uber / Lyft)" },
  { id: "premises", label: "Slip / trip / premises" },
  { id: "habitability", label: "Habitability / mold (landlord)" },
  { id: "dog_bite", label: "Dog bite" },
  { id: "product", label: "Defective product" },
  { id: "med_mal", label: "Medical malpractice" },
  { id: "nursing_home", label: "Nursing home / elder abuse" },
  { id: "work_injury", label: "Work injury" },
  { id: "dram_shop", label: "Bar / over-serving (dram shop)" },
  { id: "wrongful_death", label: "Wrongful death" },
  { id: "other_pi", label: "Other injury" },
]);

function caseTypeLabel(id) {
  const t = TRIAGE_CASE_TYPES.find((c) => c.id === id);
  return t ? t.label.toLowerCase() : "this type of";
}

// --- fact shaping ----------------------------------------------------------
// Everything the intake person enters is, by definition, observed on the call,
// so each fact carries observability "observed_on_call" with a synthetic quote
// pointing back to the entered field (the person is the source).
function observed(value, field) {
  return {
    value,
    observability: "observed_on_call",
    evidence: { quote: `intake entry: ${field}`, timestamp: "00:00", speaker: "INTAKE" },
    confidence: "high",
  };
}

// dimension read level from the form
const LIABILITY_LEVEL = {
  clear: "strong",
  disputed: "thin",
  unclear: "unknown",
  client_mostly_at_fault: "fatal",
};

// Corroboration lifts a merely "disputed" liability read: a police report
// assigning fault to the other side, or independent witnesses, move it up to
// "adequate" (the signals Andrew named as the fallbacks when there's no clean
// admission). Everything else reads straight off the base map.
function liabilityLevel(input) {
  const base = LIABILITY_LEVEL[input.liability] || "unknown";
  if (
    input.liability === "disputed" &&
    (input.police_report_favorable === true || input.independent_witnesses === true)
  ) {
    return "adequate";
  }
  return base;
}

function damagesLevel(input) {
  const inj = input.injury;
  if (inj === "none") return "fatal";
  if (inj === "death" || inj === "catastrophic") return "strong";
  if (inj === "hard") return input.objective_findings ? "strong" : "adequate";
  if (inj === "moderate") {
    if (input.objective_findings) return "adequate";
    // Ambulance / ER transport corroborates an acute injury even before imaging.
    if (input.ambulance_transport === true) return "adequate";
    return "thin";
  }
  if (inj === "soft_tissue") return "thin";
  return "unknown";
}

const COVERAGE_LEVEL = {
  commercial_deep: "strong",
  high: "strong",
  moderate: "adequate",
  minimal: "thin",
  none_uninsured: "fatal",
  unknown: "unknown",
};

function collectabilityLevel(input) {
  if (input.coverage === "commercial_deep") return "strong";
  if (input.coverage === "high") return "adequate";
  if (input.coverage === "moderate") return "adequate";
  if (input.coverage === "minimal") return "thin";
  if (input.coverage === "none_uninsured") {
    // A UM/UIM path on the client's own policy can still recover.
    return input.client_has_um === true ? "thin" : "fatal";
  }
  return "unknown";
}

// case_type_fit: fatal (out of scope -> refer) when the firm does not take it.
function caseTypeFitLevel(input, profile) {
  const accepted = profile && Array.isArray(profile.accepted_case_types)
    ? profile.accepted_case_types
    : null;
  if (!accepted) return "adequate";
  return accepted.includes(input.case_type) ? "adequate" : "fatal";
}

const HEAVY_EFFORT = new Set(["med_mal", "product", "trucking", "nursing_home", "elder_abuse"]);
const LONG_CARRY = new Set(["med_mal", "product", "nursing_home", "elder_abuse", "wrongful_death"]);
const HEAVY_CAPITAL = new Set(["med_mal", "product"]);
const MODERATE_CAPITAL = new Set(["trucking", "nursing_home", "elder_abuse"]);

function effortTier(input) {
  if (HEAVY_EFFORT.has(input.case_type)) return "heavy_lit";
  if (input.injury === "catastrophic" || input.injury === "death") return "heavy_lit";
  return "standard";
}
function carryTier(input) {
  if (LONG_CARRY.has(input.case_type)) return "long_tail";
  if (input.injury === "catastrophic" || input.injury === "death") return "long_tail";
  return "medium";
}
function capitalTier(input) {
  if (HEAVY_CAPITAL.has(input.case_type)) return "heavy";
  if (MODERATE_CAPITAL.has(input.case_type)) return "moderate";
  return "minimal";
}

function buildLlmShape(input, profile) {
  const dimension_reads = {
    liability_comparative_fault: {
      level: liabilityLevel(input),
      basis: "intake liability read",
    },
    damages_credibility: { level: damagesLevel(input), basis: "intake injury read" },
    coverage_path: { level: COVERAGE_LEVEL[input.coverage] || "unknown", basis: "intake coverage read" },
    collectability_deep_pocket: { level: collectabilityLevel(input), basis: "intake collectability read" },
    case_type_fit: { level: caseTypeFitLevel(input, profile), basis: "firm accepted-types check" },
  };

  const resource_tiers = {
    effort_tier: { tier: effortTier(input), basis: "case-type effort prior" },
    carry_tier: { tier: carryTier(input), basis: "case-type carry prior" },
    capital_tier: { tier: capitalTier(input), basis: "case-type capital prior" },
  };

  // Facts the gates read. Only include the ones the form actually captured.
  const extracted_facts = {
    case_type_primary: observed(engineCaseType(input.case_type), "case type"),
    caller_insured_status: observed(input.client_insured_status || "unknown", "client insurance status"),
    defendant_insurance_signal: observed(
      { minimal_limits_signal: input.coverage === "minimal" },
      "defendant coverage"
    ),
    imaging_or_surgery_signal: observed(
      { present: input.objective_findings === true },
      "objective findings (imaging / surgery / ER)"
    ),
    property_damage_stated: observed(
      // Bidirectional: significant property damage defeats the minor-impact
      // (MIST) skepticism — a hard hit and "minor impact" cannot both be true,
      // and the heavy damage corroborates a real collision.
      { minimal_impact_signal: input.minimal_impact === true && input.significant_property_damage !== true },
      "property damage / impact"
    ),
    client_risk_markers: observed(riskMarkers(input.red_flags), "client red flags"),
  };

  if (input.liens && input.liens !== "none") {
    extracted_facts.lien_sources = observed(lienSources(input.liens), "liens");
  }
  if (input.government_defendant === true) {
    extracted_facts.government_entity_signal = observed({ present: true }, "government defendant");
  }
  const solUrgent = input._sol_urgency === "soon" || input._sol_urgency === "critical";
  if (solUrgent) {
    extracted_facts.sol_adjacent_signal = observed({ present: true }, "deadline approaching");
  }

  return { dimension_reads, resource_tiers, extracted_facts };
}

function riskMarkers(rf = {}) {
  return {
    fee_negotiation_attempt: rf.fee_haggling === true,
    attorney_shopping_signal: rf.multiple_prior_attorneys === true,
    value_obsession_signal: rf.unrealistic_expectations === true,
    noncooperation_signal: rf.noncooperative === true,
  };
}

// How many client-behavior markers the intake person observed. Used only to
// tune the firm's review appetite (red_flag_strictness) — never to cap a
// disposition (fairness rail: behaviors route to human review, they do not
// reject a case; see gateG3ClientRisk).
function firmMarkerCount(rf = {}) {
  return [
    rf.fee_haggling === true,
    rf.multiple_prior_attorneys === true,
    rf.unrealistic_expectations === true,
    rf.noncooperative === true,
  ].filter(Boolean).length;
}

// Map the form's lien selection to the liens.mjs source shape (tiers only).
function lienSources(liens) {
  const map = {
    medi_cal: [{ type: "medi_cal" }],
    medicare: [{ type: "medicare" }],
    health_insurance: [{ type: "health_insurance" }],
    erisa_selffunded: [{ type: "erisa_selffunded" }],
    erisa_unknown: [{ type: "erisa_unknown" }],
    hospital: [{ type: "hospital_lien" }],
    unknown: [{ type: "unknown" }],
  };
  return map[liens] || [{ type: "unknown" }];
}

// Unknown-to-the-engine types fall through to a neutral prior; the CA gates
// carry their specific handling.
function engineCaseType(caseType) {
  if (caseType === "nursing_home") return "elder_abuse";
  if (caseType === "work_injury") return "workers_comp";
  if (caseType === "dram_shop" || caseType === "social_host") return "other_pi";
  // Habitability / mold (landlord-tenant) has no dedicated engine prior; route
  // it to the neutral prior so the firm can still accept/decline it as its own
  // type without borrowing the slip-and-fall premises reference class.
  if (caseType === "habitability") return "other_pi";
  return caseType;
}

// Map the form case type to the SOL guardian's expected caseType key.
function solCaseType(caseType) {
  if (caseType === "med_mal") return "medical_malpractice";
  return "general_pi";
}

// --- firm triage profile -> PART B config ----------------------------------
// The six-tap firm profile becomes the code-side posture the decision table
// already understands. Defaults are the calibrated engine defaults.
export function profileToConfig(profile = {}) {
  const posture = profile.posture === "volume" ? "volume" : "selective";
  return normalizeConfig({
    posture_default: posture,
    trial_capital: profile.trial_capital === true,
    capital_budget_tier: profile.cost_fronting === "deep"
      ? "deep"
      : profile.cost_fronting === "minimal"
        ? "minimal"
        : "moderate",
    mist_handling: profile.take_mist === true
      ? "sign"
      : profile.take_mist === false
        ? "decline"
        : "develop",
  });
}

// --- firm collectibility floor (min_policy_limits) -------------------------
// The firm's minimum-limits appetite is a PREFERENCE tier (any / 25k / 50k /
// 100k / 250k), never the defendant's actual dollar limits — those are not
// captured on the call (compliance rail: no dollar output). When the observed
// coverage BAND is clearly below the firm's floor and there is no UM/UIM
// backstop, the case is a real case the firm would rather place elsewhere:
// cap to refer_out, never decline (this is appetite, not a statutory bar).
//
// Guards: unknown coverage never fires (we do not guess); UM/UIM present never
// fires (the client's own policy can still collect). The form's coverage bands
// are coarse, so a 250k floor can only be enforced to the "high ($100k+)" band
// (it cannot tell 100k from 250k); this deliberately UNDER-enforces rather than
// wrongly refer a good-coverage file.
const COVERAGE_RANK = Object.freeze({
  none_uninsured: 0,
  minimal: 1,
  moderate: 2,
  high: 3,
  commercial_deep: 4,
});
const FLOOR_REQUIRED_RANK = Object.freeze({ "25k": 1, "50k": 2, "100k": 3, "250k": 3 });
const FLOOR_PRETTY = Object.freeze({ "25k": "$25k", "50k": "$50k", "100k": "$100k", "250k": "$250k" });

function firmFloorUnmet(input, profile) {
  const floor = profile && profile.min_policy_limits;
  if (!floor || floor === "any") return false;
  const required = FLOOR_REQUIRED_RANK[floor];
  if (required == null) return false;
  const band = input.coverage;
  if (!band || band === "unknown") return false; // never guess on unknown coverage
  if (input.client_has_um === true) return false; // UM/UIM backstop can still collect
  const rank = COVERAGE_RANK[band];
  if (rank == null) return false;
  return rank < required;
}

// --- grade mapping ---------------------------------------------------------
// Disposition + value tier -> the letter grade and color the desk shows. This
// mirrors how PI firms already grade intake (A/B/C/D, green/amber/red), so the
// tool speaks their language back to them.
const GRADE = {
  sign_now: {
    high: { letter: "A", color: "green", headline: "Sign - strong file" },
    standard: { letter: "B", color: "green", headline: "Sign" },
    low: { letter: "B", color: "amber", headline: "Sign - thin value" },
    indeterminate: { letter: "B", color: "amber", headline: "Sign - value unclear" },
  },
  develop: { letter: "C", color: "amber", headline: "Develop - worth a look, get more facts" },
  refer_out: { letter: "B", color: "amber", headline: "Refer out - real case, better placed elsewhere" },
  decline_with_grace: { letter: "D", color: "red", headline: "Decline" },
};

function toGrade(disposition, valueTier) {
  if (disposition === "sign_now") {
    return GRADE.sign_now[valueTier] || GRADE.sign_now.indeterminate;
  }
  return GRADE[disposition] || GRADE.decline_with_grace;
}

// --- driving reason + flip fact --------------------------------------------
function plainReason(rec, caResult) {
  if (caResult.controlling) return caResult.controlling.reason;
  const basis = rec.disposition_basis || [];
  const first = basis[0] || "";
  // Strip the internal rule tag (e.g. "R6 ") for a human-facing line.
  return first.replace(/^R[-A-Z0-9]+\s+/, "") || "Recommendation based on the reads entered.";
}

// The single fact that, if resolved, most likely changes the grade.
function flipFact(input, rec, caResult, dims) {
  if (caResult.controlling) return caResult.controlling.flip_fact;
  const reviewWithFlip = caResult.review.find((r) => r.flip_fact);
  if (reviewWithFlip) return reviewWithFlip.flip_fact;
  // Otherwise the weakest / most-unknown load-bearing read.
  const order = ["coverage_path", "collectability_deep_pocket", "liability_comparative_fault", "damages_credibility"];
  const FLIP = {
    coverage_path: "Confirm the at-fault party's policy limits (and any umbrella / other coverage).",
    collectability_deep_pocket: "Confirm whether there is a solvent, insured, or deep-pocket defendant.",
    liability_comparative_fault: "Nail down who is at fault: police report, witnesses, admissions.",
    damages_credibility: "Confirm the injury: imaging, surgery, ER records, ongoing treatment.",
  };
  const unknown = order.find((d) => ["unknown", "thin"].includes(dims[d] && dims[d].level));
  if (unknown) return FLIP[unknown];
  if (input.coverage === "unknown") return FLIP.coverage_path;
  return null;
}

// Concrete next questions for the intake person, drawn from what is missing.
function nextQuestions(input, dims, sol) {
  const q = [];
  if (!input.incident_date) q.push("What is the exact date of the incident?");
  if (input.coverage === "unknown") q.push("Do you know the other side's insurance or policy limits?");
  if (dims.liability_comparative_fault.level === "unknown")
    q.push("Who caused it, and is there a police report or any witnesses?");
  if (dims.damages_credibility.level === "unknown" || dims.damages_credibility.level === "thin")
    q.push("Have you seen a doctor? Any imaging, surgery, or ongoing treatment?");
  if (input.case_type === "work_injury" && input.work_injury_third_party == null)
    q.push("Was anyone other than your employer at fault?");
  if ((input.case_type === "nursing_home" || input.case_type === "elder_abuse") && input.elder_abuse_reckless_neglect == null)
    q.push("Was this a recurring pattern of neglect (bedsores, dehydration, falls), not a one-time error?");
  if (sol && sol.urgency === "unknown" && !input.incident_date)
    q.push("When did this happen? The filing deadline depends on it.");
  return q.slice(0, 4);
}

// --- main entry ------------------------------------------------------------
export function triageFromFacts(input = {}, profile = {}, opts = {}) {
  const now = opts.now || new Date();
  const config = profileToConfig(profile);
  const computeSol = typeof opts.computeSol === "function" ? opts.computeSol : fallbackComputeSol;

  // SOL first (firm-visible computer, carries its own disclaimer). Its urgency
  // feeds the deadline-adjacent gate.
  const sol = computeSol({
    incidentDate: input.incident_date || null,
    caseType: solCaseType(input.case_type),
    governmentDefendant: input.government_defendant === true,
    minor: input.minor === true,
    now,
  });

  const shaped = { ...input, _sol_urgency: sol.urgency };
  const { dimension_reads, resource_tiers, extracted_facts } = buildLlmShape(shaped, profile);

  const gates = evaluateGates(extracted_facts, config);
  const rec = decideDisposition({
    llmOutput: { dimension_reads, resource_tiers, extracted_facts },
    gates,
    config,
  });

  // California statutory overrides run last: a hard gate holds or lowers the
  // calibrated disposition and takes over the headline reason.
  const caResult = evaluateCaGates(input, sol);
  let disposition = rec.recommended_disposition;
  const basis = [...(rec.disposition_basis || [])];
  if (caResult.override_disposition) {
    const overridden = worseDisposition(disposition, caResult.override_disposition);
    if (overridden !== disposition) {
      basis.push(
        `CA-OVERRIDE ${caResult.controlling.gate} ${caResult.controlling.name} (${caResult.controlling.citation}) -> ${overridden}`
      );
    }
    disposition = overridden;
  }

  // Firm collectibility floor (min_policy_limits appetite) runs after the
  // statutory overrides. Appetite, not law: it can only cap a still-viable
  // file to refer_out, never to decline.
  let firmFloorFired = false;
  if (disposition !== "decline_with_grace" && firmFloorUnmet(input, profile)) {
    const capped = worseDisposition(disposition, "refer_out");
    if (capped !== disposition) {
      disposition = capped;
      firmFloorFired = true;
      basis.push(
        `FIRM-FLOOR min-limits ${profile.min_policy_limits} not met by observed coverage "${input.coverage}" (no UM/UIM backstop) -> refer_out`
      );
    }
  }

  // Firm "decline vs refer" appetite for OUT-OF-APPETITE case types. By default
  // an out-of-appetite but viable case refers out; a firm may instead decline it
  // outright. Only the PURE appetite refer converts (case type not in the accept
  // list) — never a statutory refer (WC comp-only, venue), which a CA gate
  // controls and which stays a refer to the right specialist.
  let appetiteDeclineFired = false;
  if (
    profile &&
    profile.decline_out_of_appetite === true &&
    disposition === "refer_out" &&
    !caResult.controlling &&
    caseTypeFitLevel(input, profile) === "fatal"
  ) {
    disposition = "decline_with_grace";
    appetiteDeclineFired = true;
    basis.push(
      `FIRM-APPETITE ${input.case_type} not accepted and firm declines out-of-appetite types -> decline`
    );
  }

  // Elder-abuse heightened track lifts the value read (never past what the
  // calibrated engine allows to sign, but enough to grade a real 15657 case).
  let valueTier = rec.value_tier;
  if (caResult.value_hint === "high" && valueTier !== "high" && disposition !== "decline_with_grace") {
    valueTier = "high";
    basis.push("CA-VALUE elder-abuse 15657 heightened-remedy track -> value high");
  }

  const grade = toGrade(disposition, valueTier);
  let attorney_review_required =
    rec.attorney_review_required || caResult.attorney_review_required;

  // Firm red-flag strictness (forgiving | balanced | strict): appetite for how
  // eagerly to route a client-behavior file to a human. It can only ADD caution
  // and never caps a disposition. "strict" flags review at the first observed
  // behavior marker; "balanced"/"forgiving" leave the calibrated floor (G3 at
  // >=2 markers) untouched — we never lower the engine's safety floor.
  if (
    profile &&
    profile.red_flag_strictness === "strict" &&
    firmMarkerCount(input.red_flags) >= 1
  ) {
    attorney_review_required = true;
  }

  // When a firm-appetite overlay controls the outcome (no CA statutory gate took
  // over), make it the human-facing reason and flip fact.
  let driving_reason;
  let flip_fact;
  if (appetiteDeclineFired) {
    driving_reason = `The firm does not take ${caseTypeLabel(input.case_type)} cases and declines out-of-appetite types.`;
    flip_fact = `Add ${caseTypeLabel(input.case_type)} to the firm's accepted case types if the firm wants to take it.`;
  } else if (firmFloorFired && !caResult.controlling) {
    driving_reason = `Below the firm's minimum-limits appetite (${FLOOR_PRETTY[profile.min_policy_limits] || profile.min_policy_limits}); real case, better placed elsewhere.`;
    flip_fact = "Confirm higher coverage (umbrella / other policy) or the caller's own UM/UIM — current limits are below the firm's floor.";
  } else {
    driving_reason = plainReason({ ...rec, disposition_basis: basis }, caResult);
    flip_fact = flipFact(input, rec, caResult, dimension_reads);
  }

  return {
    engine: "triage-live",
    schema_version: TRIAGE_SCHEMA_VERSION,
    generated_at: now.toISOString(),
    case_type: input.case_type || null,
    grade,
    disposition,
    value_tier: valueTier,
    driving_reason,
    flip_fact,
    next_questions: nextQuestions(input, dimension_reads, sol),
    // The ranked CA-PI workup conveyor the engine already computes for a
    // "develop" file: what to gather next, most time-critical first. Surfaced
    // only when the FINAL disposition is develop (a signed/declined/referred
    // file has no workup to do here). Slim shape so the UI never depends on
    // engine-internal field names.
    ranked_actions:
      disposition === "develop" &&
      rec.develop_payload &&
      Array.isArray(rec.develop_payload.ranked_actions)
        ? rec.develop_payload.ranked_actions.map((a) => ({
            label: a.label,
            latency: a.latency_criticality,
            obtainability: a.obtainability,
          }))
        : [],
    sol: {
      statute: sol.statute,
      period: sol.periodLabel,
      deadline_date: sol.deadlineDate,
      days_remaining: sol.daysRemaining,
      urgency: sol.urgency,
      disclaimer: sol.disclaimer,
    },
    ca_gates: {
      fired: caResult.fired.map((g) => ({ gate: g.gate, name: g.name, citation: g.citation, reason: g.reason })),
      review: caResult.review.map((g) => ({ gate: g.gate, name: g.name, citation: g.citation, reason: g.reason })),
      flags: caResult.flags,
    },
    attorney_review_required,
    value_tier_read: rec.value_tier,
    disposition_basis: basis,
    compliance: {
      recommendation_only: true,
      requires_attorney_ratification: true,
      no_dollar_output: true,
      estimate_not_legal_advice: true,
    },
  };
}
