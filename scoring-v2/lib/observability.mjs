// scoring-v2/lib/observability.mjs — call-quality vs. normal-unknown
// separation (scoring-v2.2, "observability" layer). Pure ESM, no I/O.
//
// PURPOSE. confidence.mjs decides when the engine ABSTAINS on thin data.
// This module answers a different, narrower question: when a fact is
// unknown, is that a NORMAL unknown (benign → abstain-and-develop, never a
// penalty) or evidence of a LOW-QUALITY CALL (the rep never captured
// something a competent intake always captures → re-contact / call-quality
// flag)?
//
// The distinction keeps the fairness rail honest. A caller not knowing the
// defendant's exact policy limits, DUI conviction status, lien sources, or
// truck GVW is NORMAL — those are developed after intake and their absence
// must NEVER cost the file anything. A rep who never establishes the
// incident date, the mechanism, the injuries, or the defendant's status is a
// CALL-QUALITY problem — a floor the intake should always cover.
//
// COMPLIANCE / FAIRNESS. This module measures only whether the REP captured
// the floor. It never judges the caller. develop_only unknowns are never a
// penalty and never contribute to the call-quality flag. Language, accent,
// distress, and demographics are not inputs here (they are structurally
// excluded upstream by the fact schema) and can never appear.

// -----------------------------------------------------------------------------
// OBSERVABILITY_DEFAULTS — how normally a given fact/field is stateable by the
// caller on the intake call itself. Three bands:
//
//   caller_stateable — a caller can normally state this. FLOOR-ish: if it is
//                      unknown the rep probably did not ask. Grade at face
//                      value.
//   sometimes        — a caller may self-report it, but often cannot or is
//                      unreliable. Grade if stated, but confidence.mjs caps
//                      confidence; absence is not by itself a quality problem.
//   develop_only     — essentially never known to the caller at intake
//                      (defendant assets, exact policy limits, DUI conviction,
//                      lien sources, GVW, ERISA plan-funding status). Absence
//                      is NORMAL, never negative — abstain-and-develop.
// -----------------------------------------------------------------------------
export const OBSERVABILITY_DEFAULTS = Object.freeze({
  // caller_stateable — the intake floor a caller can normally speak to.
  incident_date_stated: "caller_stateable",
  case_type_primary: "caller_stateable",
  caller_role: "caller_stateable",
  injury_claims: "caller_stateable",
  treatment_status: "caller_stateable",
  defendant_type: "caller_stateable", // coarse ("individual/commercial/...")
  retained_or_prior_attorney: "caller_stateable",
  independent_witnesses: "caller_stateable",
  police_report: "caller_stateable",
  work_impact: "caller_stateable",
  property_damage_stated: "caller_stateable",

  // sometimes — caller may self-report; grade but cap confidence.
  caller_insured_status: "sometimes",
  defendant_insurance_signal: "sometimes",
  caller_um_uim_signal: "sometimes",
  imaging_or_surgery_signal: "sometimes",
  objective_findings: "sometimes",
  liability_admission_span: "sometimes",
  defendant_fault_indicators: "sometimes",
  treatment_gap_signal: "sometimes",
  prior_injury_disclosure: "sometimes",

  // develop_only — essentially never from the caller; absence is NORMAL and is
  // NEVER a penalty. Includes anything about defendant assets, exact policy
  // limits, GVW, and ERISA plan-funding status.
  "coverage_stack.def_bi_limits_stated": "develop_only",
  lien_sources: "develop_only",
  defendant_dui: "develop_only", // conviction status unknowable at intake
  "commercial_truck.evidence_present": "develop_only",
  prior_claims_same_region: "develop_only",
  medicare_status: "develop_only",
  defendant_assets: "develop_only",
  exact_policy_limits: "develop_only",
  gross_vehicle_weight: "develop_only", // truck GVW
  plan_funding_status: "develop_only", // ERISA self-funded vs. insured
});

// -----------------------------------------------------------------------------
// The intake floor. Two representations of the same idea:
//   MUST_ASK_FLOOR          — the checklist QUESTION ids a competent intake must
//                             cover (maps to the engine's question_capture ids).
//   MUST_ASK_FLOOR_CONCEPTS — the conceptual floor, each backed by a
//                             caller_stateable fact (see FLOOR_CONCEPT_FACTS).
// -----------------------------------------------------------------------------
export const MUST_ASK_FLOOR = Object.freeze([
  "q1_exact_incident_date",
  "q2_prop213_insured_status",
  "q7_coverage_um",
  "q10_retained_elsewhere",
]);

export const MUST_ASK_FLOOR_CONCEPTS = Object.freeze([
  "mechanism / what happened",
  "injuries",
  "defendant status/type",
]);

// Which caller_stateable fact backs each conceptual floor item. A concept is
// "covered" when its fact is present and observed on the call.
export const FLOOR_CONCEPT_FACTS = Object.freeze({
  "mechanism / what happened": "case_type_primary",
  injuries: "injury_claims",
  "defendant status/type": "defendant_type",
});

// Observability values that mean "not actually captured on the call".
const UNCAPTURED_OBSERVABILITY = Object.freeze(["unknown", "not_on_call"]);

// A floor FACT is missing when it is absent, or present but never captured on
// the call (observability unknown / not_on_call).
function floorFactMissing(fact) {
  if (!fact || typeof fact !== "object") return true;
  return UNCAPTURED_OBSERVABILITY.includes(fact.observability);
}

// A develop_only field is "unknown" (benign) unless the backing fact is
// present, observed on the call, and — for a nested path — the sub-field is a
// non-null value. Nested ids use dotted paths resolved through `fact.value`.
function developUnknown(id, facts) {
  const parts = id.split(".");
  const fact = facts[parts[0]];
  if (!fact || typeof fact !== "object") return true;
  if (fact.observability !== "observed_on_call") return true;
  if (parts.length === 1) return false;
  let cursor = fact.value;
  for (let i = 1; i < parts.length; i++) {
    if (cursor == null || typeof cursor !== "object") return true;
    cursor = cursor[parts[i]];
  }
  return cursor == null;
}

const DEVELOP_ONLY_IDS = Object.freeze(
  Object.keys(OBSERVABILITY_DEFAULTS).filter(
    (id) => OBSERVABILITY_DEFAULTS[id] === "develop_only"
  )
);

// -----------------------------------------------------------------------------
// classifyCallQuality — separate call-quality problems from benign unknowns.
//
//   floor_missing            — floor items the rep never established: a
//                              MUST_ASK_FLOOR q-id explicitly `not_asked`, or a
//                              conceptual-floor fact absent / not-on-call.
//   call_quality_flag        — true when >= 2 floor items are missing AND there
//                              is actual call data to judge. A single missing
//                              floor item is not yet a quality problem (mirrors
//                              the engine's 2-strike spirit); an empty payload
//                              is a no-op, never a bad call.
//   benign_develop_unknowns  — develop_only fields that are unknown/absent.
//                              Listed for transparency; NEVER a penalty and
//                              NEVER counted toward call_quality_flag.
//
// Always safe on empty / partial input.
// -----------------------------------------------------------------------------
export function classifyCallQuality({ facts = {}, question_capture = {} } = {}) {
  const factsObj = facts && typeof facts === "object" ? facts : {};
  const qcObj =
    question_capture && typeof question_capture === "object"
      ? question_capture
      : {};

  const floor_missing = [];

  // Conceptual floor — backed by caller_stateable facts.
  for (const concept of MUST_ASK_FLOOR_CONCEPTS) {
    const factId = FLOOR_CONCEPT_FACTS[concept];
    if (floorFactMissing(factsObj[factId])) floor_missing.push(factId);
  }

  // Question-id floor — only an explicit `not_asked` counts as a proven skip.
  // An absent entry is unknown capture, not proof the rep skipped it.
  for (const qid of MUST_ASK_FLOOR) {
    const entry = qcObj[qid];
    if (entry && typeof entry === "object" && entry.status === "not_asked")
      floor_missing.push(qid);
  }

  const benign_develop_unknowns = DEVELOP_ONLY_IDS.filter((id) =>
    developUnknown(id, factsObj)
  );

  // Only raise a call-quality flag when there is real call data to judge.
  // An empty payload yields no flag even if `floor_missing` is non-empty.
  const callObserved =
    Object.keys(factsObj).length > 0 || Object.keys(qcObj).length > 0;
  const call_quality_flag = callObserved && floor_missing.length >= 2;

  return { floor_missing, call_quality_flag, benign_develop_unknowns };
}
