// scoring-v2/lib/casetypes.mjs — case-type routing overlay (delegated).
// Pure, data-driven lookup: a case_type id → routing FLAGS only. No I/O, no
// LLM, no dollars or dates ever emitted. Dollar/statute references appear only
// inside `notes` as design rationale — never as an output field. Compliance
// rail: these are routing priors for the decision-table overlay, not verdicts.
//
// Row shape:
//   { refer_default, urgency, coverage_floor_source, spoliation, notes }
//     refer_default          — default posture is refer-out (capital/expertise
//                              beyond a standard PI intake); still ratifiable.
//     urgency                — a sharp statutory/evidentiary clock rides along
//                              (FLAG only; no date is computed anywhere).
//     coverage_floor_source  — which coverage-floor table statutes.mjs should
//                              source (tag string, never a dollar).
//     spoliation             — perishable defense-held evidence (ELD/dashcam)
//                              that overwrites fast; preserve-letter posture.
//     notes                  — one-line grounded rationale (cite, no emitted $).

// The safe neutral default for unknown/absent case types. A fresh copy is
// returned per call so callers can never mutate the shared shape.
function neutralDefault() {
  return {
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard_auto",
    spoliation: false,
    notes: "",
  };
}

export const CASE_TYPE_ROUTING = Object.freeze({
  // --- standard auto family: neutral in-house priors ------------------------
  mva_standard: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard_auto",
    spoliation: false,
    notes: "Bread-and-butter auto file; standard financial-responsibility floor, no special posture.",
  }),
  motorcycle: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard_auto",
    spoliation: false,
    notes: "Auto-family collision; standard floor. No auto-decline on rider status (fairness rail).",
  }),
  pedestrian_bicycle: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard_auto",
    spoliation: false,
    notes: "Vehicle-vs-vulnerable-user; standard auto floor with client UM/UIM as a common recovery path.",
  }),

  // --- commercial / trucking: urgency + spoliation --------------------------
  mva_commercial: Object.freeze({
    refer_default: false,
    urgency: true,
    coverage_floor_source: "fmcsa",
    spoliation: true,
    notes: "Commercial defendant: FMCSA floor ($750k general / $5M hazmat); ELD/dashcam overwrite 1-3 days, preserve within 24-48h.",
  }),
  trucking: Object.freeze({
    refer_default: false,
    urgency: true,
    coverage_floor_source: "fmcsa",
    spoliation: true,
    notes: "Trucking (=commercial truck): FMCSA floor ($750k general / $5M hazmat); ELD/dashcam overwrite 1-3 days, spoliation letter 24-48h.",
  }),

  // --- period-dependent coverage -------------------------------------------
  rideshare: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "rideshare",
    spoliation: false,
    notes: "Coverage branches on TNC period: $1M liability layer only if the rideshare driver is at fault; passenger UM/UIM cut to $60k/$300k for crashes on/after 1/1/2026. Resolve period before pricing the path.",
  }),

  // --- premises & animal: coverage collectability priors --------------------
  premises: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "premises",
    spoliation: false,
    notes: "Notice requirement + Rowland factors govern duty; trivial-defect is a soft prior, NOT an auto-decline.",
  }),
  dog_bite: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "homeowner",
    spoliation: false,
    notes: "Civ. Code 3342 strict liability needs a bite + lawful presence; collectability turns on homeowner/renter coverage & breed exclusions.",
  }),

  // --- capital / expertise intensive: refer-out by default ------------------
  product: Object.freeze({
    refer_default: true,
    urgency: false,
    coverage_floor_source: "product",
    spoliation: false,
    notes: "Design-defect / product liability is expert-heavy with a long capital carry; refer unless the firm holds product-trial capital.",
  }),
  med_mal: Object.freeze({
    refer_default: true,
    urgency: false,
    coverage_floor_source: "medmal",
    spoliation: false,
    notes: "Capital/expert intensity (~$30k-$50k+ advance); MICRA noneconomic cap; CCP 364 90-day notice. Route to a med-mal specialist.",
  }),

  // --- special postures -----------------------------------------------------
  wrongful_death: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard",
    spoliation: false,
    notes: "Heir standing (CCP 377.60) + survival-vs-WD posture drive the file; underlying case type sets the coverage floor. Neutral prior pending posture.",
  }),
  government_entity: Object.freeze({
    refer_default: false,
    urgency: true,
    coverage_floor_source: "government",
    spoliation: false,
    notes: "Gov. Code 911.2 six-month claim window is the sharpest deadline trap; file cannot sit in a develop queue. Urgency FLAG only, no date computed.",
  }),
  workers_comp: Object.freeze({
    refer_default: true,
    urgency: false,
    coverage_floor_source: "standard",
    spoliation: false,
    notes: "Comp-only files refer to a comp specialist; keep in-house only when a third-party civil defendant or an exclusive-remedy exception exists.",
  }),
  elder_abuse: Object.freeze({
    refer_default: true,
    urgency: false,
    coverage_floor_source: "standard",
    spoliation: false,
    notes: "WIC 15657 heightened-remedy path is pleading/proof-intensive; route to counsel (attorney-only development).",
  }),

  // --- catch-alls -----------------------------------------------------------
  other_pi: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard",
    spoliation: false,
    notes: "Generic PI matter; neutral prior, develop the specific liability/coverage path before routing.",
  }),
  non_case: Object.freeze({
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard",
    spoliation: false,
    notes: "Not a viable PI matter; no routing posture. Decline-with-grace is a normal outcome, decided by the pipeline, not here.",
  }),
});

// Return the routing row for a case_type id, or a fresh safe neutral default
// for unknown/absent types (a new object each call — never mutate the table).
export function caseTypeRouting(caseType) {
  const row = CASE_TYPE_ROUTING[caseType];
  return row ? row : neutralDefault();
}
