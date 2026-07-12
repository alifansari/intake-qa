// scoring-v2/lib/develop-actions.mjs — the DEVELOP action conveyor (stage 4b).
// Pure, table-driven, no I/O, no LLM. Turns a bare "resolving facts" list into
// a ranked CA-PI workup conveyor: every unknown / low-confidence dimension,
// gate abstention, or observed high-value posture fact maps to a concrete
// SUGGESTED attorney action carrying obtainability + latency + ethics tags.
//
// Compliance rails (identical to the rest of the engine):
//   - Never a dollar. Never a computed date. `latency_criticality` is a
//     QUALITATIVE flag (critical | time_critical | routine), never a deadline.
//   - Every row is a SUGGESTION for the attorney to ratify — nothing terminal.
//   - Code ACTS on a fact only when observability === "observed_on_call"
//     (mirrors gates.mjs); merely inferred facts never surface an action.
//
// NOTE: there is deliberately NO "ISO ClaimSearch" action. ISO ClaimSearch
// discloses claim history to INSURERS, not to plaintiff counsel — prior-claim
// history is developed by structured client interview instead.

// Ethics-tag vocabulary (attach where a step touches these rails):
//   recorded_statement_all_party_consent — PEN 632 / 632.7 two-party consent
//   no_contact_if_represented            — CRPC 4.2 (represented parties)
//   no_solicitation_of_prospect          — CRPC 7.3 / B&P 6152 (runners/capping)
const ETHICS = Object.freeze({
  RECORDED: "recorded_statement_all_party_consent",
  NO_CONTACT_REPRESENTED: "no_contact_if_represented",
  NO_SOLICITATION: "no_solicitation_of_prospect",
});

export const DEVELOP_ACTIONS = Object.freeze([
  Object.freeze({
    trigger: "liability_comparative_fault unknown",
    action_id: "chp_crash_report",
    label:
      "Pull the CHP / local crash report (CHP-190 request, signed client authorization).",
    resolves: "liability_comparative_fault",
    obtainability: "pre_suit",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "liability unknown + perishable-evidence flag",
    action_id: "preserve_scene_evidence",
    label:
      "Preserve perishable scene proof (911 audio, body/dashcam, canvass nearby CCTV before overwrite).",
    resolves: "liability_comparative_fault",
    obtainability: "pre_suit",
    latency_criticality: "time_critical",
    // canvassing/witness contact + any recording touches consent + solicitation rails
    ethics_tags: Object.freeze([ETHICS.RECORDED, ETHICS.NO_SOLICITATION]),
  }),
  Object.freeze({
    trigger: "commercial_truck present (liability + collectability)",
    action_id: "truck_spoliation_letter",
    label:
      "Send a spoliation / evidence-preservation letter for ELD/ECM data, dashcam, and the driver-qualification file (send within 24-48 hours before routine overwrite).",
    resolves: "liability_comparative_fault, collectability_deep_pocket",
    obtainability: "pre_suit",
    latency_criticality: "critical",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "coverage_path unknown (defendant BI limits)",
    action_id: "defendant_limits_demand",
    label:
      "Establish defendant BI limits: CCP 999 time-limited policy-limit demand pre-suit, or post-filing Form Interrogatory 4.1 in discovery.",
    resolves: "coverage_path",
    obtainability: "pre_suit",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "coverage_path unknown (client UM/UIM)",
    action_id: "client_dec_page",
    label:
      "Obtain the client's own auto declarations page to confirm UM/UIM and MedPay coverage.",
    resolves: "coverage_path",
    obtainability: "client_immediate",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "damages_credibility unknown / prior-claim history",
    action_id: "prior_claim_client_interview",
    label:
      "Run a structured client interview covering prior claims and same-body-part history (roughly a five-year lookback). Do NOT run an ISO ClaimSearch pull — that database reports to insurers, not to plaintiff counsel.",
    resolves: "damages_credibility",
    obtainability: "client_immediate",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "lien existence unknown (G1 underwater abstention)",
    action_id: "lien_existence_intake",
    label:
      "Collect insurance cards, health-plan type, and any DHCS/Medi-Cal notice to establish whether a statutory lien exists.",
    resolves: "lien_load_tier",
    obtainability: "client_immediate",
    latency_criticality: "time_critical",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "ERISA lien reducibility unknown",
    action_id: "erisa_spd_request",
    label:
      "Request the plan SPD and confirm ERISA funding status (self-funded vs insured) to project net lien reducibility.",
    resolves: "lien_load_tier",
    obtainability: "pre_suit",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "collectability_deep_pocket unknown",
    action_id: "collectability_asset_search",
    label:
      "Investigate collectability: Secretary of State entity search, UCC / real-property records, and scope-of-employment for a solvent deep pocket.",
    resolves: "collectability_deep_pocket",
    obtainability: "pre_suit",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "prior/current counsel retained",
    action_id: "prior_counsel_termination",
    label:
      "Obtain written termination of any current counsel and note the prior attorney's quantum-meruit fee lien before proceeding.",
    resolves: "retained_or_prior_attorney",
    obtainability: "client_immediate",
    latency_criticality: "routine",
    // do not contact a still-represented client's current attorney's client improperly
    ethics_tags: Object.freeze([ETHICS.NO_CONTACT_REPRESENTED]),
  }),
  Object.freeze({
    trigger: "med_mal + SOL-adjacent flag",
    action_id: "micra_364_notice",
    label:
      "Route to a med-mal specialist for CCP 364 ninety-day notice-of-intent mechanics before suit.",
    resolves: "sol_adjacent",
    obtainability: "pre_suit",
    latency_criticality: "time_critical",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "public_entity / government defendant",
    action_id: "govt_claim_presentation",
    label:
      "Confirm government-claim presentation status under Gov. Code 911.2 (whether the claim has been filed / rejected).",
    resolves: "government_entity_window",
    obtainability: "client_immediate",
    latency_criticality: "critical",
    ethics_tags: Object.freeze([]),
  }),
  Object.freeze({
    trigger: "defendant DUI / punitive-value posture",
    action_id: "dui_conviction_and_assets",
    label:
      "Confirm the defendant's conviction / BAC status and investigate defendant assets and entity structure for punitive-value exposure.",
    resolves: "collectability_deep_pocket",
    obtainability: "pre_suit",
    latency_criticality: "routine",
    ethics_tags: Object.freeze([]),
  }),
]);

// ---------------------------------------------------------------------------
// Observed-only helpers (mirror gates.mjs discipline).
function observedValue(fact) {
  return fact && fact.observability === "observed_on_call" ? fact.value : undefined;
}
function observedPresent(fact) {
  const v = observedValue(fact);
  return Boolean(v && typeof v === "object" && v.present === true);
}

// Trigger predicates keyed by action_id. Each returns true only when the
// triggering condition is actually present in the resolved inputs. Kept
// separate from the frozen data rows so the rows stay pure data.
const MATCHERS = Object.freeze({
  chp_crash_report: ({ unknownDims }) =>
    unknownDims.includes("liability_comparative_fault"),

  preserve_scene_evidence: ({ unknownDims, gateFlags }) =>
    unknownDims.includes("liability_comparative_fault") &&
    gateFlags.includes("perishable_evidence"),

  truck_spoliation_letter: ({ facts }) => observedPresent(facts.commercial_truck),

  defendant_limits_demand: ({ unknownDims }) => unknownDims.includes("coverage_path"),

  client_dec_page: ({ unknownDims }) => unknownDims.includes("coverage_path"),

  prior_claim_client_interview: ({ facts, unknownDims }) =>
    unknownDims.includes("damages_credibility") ||
    observedPresent(facts.prior_claims_same_region),

  lien_existence_intake: ({ gateFlags }) => gateFlags.includes("underwater_profile"),

  erisa_spd_request: ({ facts }) => {
    const v = observedValue(facts.lien_sources);
    if (!v || typeof v !== "object") return false;
    const sources = Array.isArray(v.sources) ? v.sources : [];
    return (
      sources.includes("erisa_selffunded") ||
      sources.includes("erisa_insured") ||
      v.erisa_funding_status === "unknown"
    );
  },

  collectability_asset_search: ({ unknownDims }) =>
    unknownDims.includes("collectability_deep_pocket"),

  prior_counsel_termination: ({ facts }) => {
    const v = observedValue(facts.retained_or_prior_attorney);
    if (v === undefined || v === null) return false;
    if (typeof v === "object") return v.present === true || v.current === true;
    return v === true;
  },

  micra_364_notice: ({ facts, gateFlags }) => {
    const ct = facts.case_type_primary;
    const isMedMal = ct && ct.value === "med_mal";
    return Boolean(isMedMal) && gateFlags.includes("sol_adjacent");
  },

  govt_claim_presentation: ({ facts, gateFlags }) =>
    observedPresent(facts.public_entity_defendant) ||
    gateFlags.includes("government_entity_window"),

  dui_conviction_and_assets: ({ facts }) => {
    const v = observedValue(facts.defendant_dui);
    if (!v || typeof v !== "object") return false;
    return ["convicted", "charged", "alleged"].includes(v.status);
  },
});

// Ranking weights: latency first (critical rides ahead of everything), then
// obtainability (client-immediate and pre-suit both precede discovery-only).
const LATENCY_RANK = Object.freeze({ critical: 0, time_critical: 1, routine: 2 });
const OBTAIN_RANK = Object.freeze({
  client_immediate: 0,
  pre_suit: 1,
  discovery_only: 2,
});

// rankDevelopActions — surface only the actions whose trigger is present, then
// rank them. Always safe on empty / absent input (returns []).
export function rankDevelopActions({ facts = {}, unknownDims = [], gateFlags = [] } = {}) {
  const ctx = {
    facts: facts || {},
    unknownDims: Array.isArray(unknownDims) ? unknownDims : [],
    gateFlags: Array.isArray(gateFlags) ? gateFlags : [],
  };
  const matched = DEVELOP_ACTIONS.filter((row) => {
    const m = MATCHERS[row.action_id];
    return typeof m === "function" && m(ctx) === true;
  });
  // Stable sort (Array.prototype.sort is stable): latency, then obtainability;
  // table order breaks any remaining tie.
  return matched.slice().sort((a, b) => {
    const dl = LATENCY_RANK[a.latency_criticality] - LATENCY_RANK[b.latency_criticality];
    if (dl !== 0) return dl;
    return OBTAIN_RANK[a.obtainability] - OBTAIN_RANK[b.obtainability];
  });
}
