// Canonical registry of per-firm feature flags.
//
// Ground rule 0.5: every strategic enhancement ships behind one of these flags,
// default OFF, rolled out firm-by-firm by the operator. Defining the keys once,
// here, keeps the pipeline (.mjs) and the screens (TS importing this .mjs) in
// agreement — a typo'd flag key can't silently read as "off forever" in one
// place and "on" in another.
//
// The stored table (firm_features, migration 0008) only holds explicit on/off
// rows; the DEFAULT-OFF behaviour lives in the facade ops (isFeatureEnabled).

export const FEATURES = {
  LEAK_AUDIT: "leak_audit", // Phase 1 — multi-call Leak Audit funnel
  BILLING: "billing", // Phase 2 — per-recovered-case metering & invoicing
  BENCHMARKS: "benchmarks", // Phase 3 — peer benchmarking
  SPANISH_INTAKE: "spanish_intake", // Phase 4 — Spanish-language intake
  CRM_INTEGRATIONS: "crm_integrations", // Phase 5 — CRM connectors
  SPEED_TO_LEAD: "speed_to_lead", // Phase 6 — callback SLA command center
  PUBLIC_CALIBRATION: "public_calibration", // Phase 7 — shareable calibration snapshot
  LIVE_COACH: "live_coach", // Pro-tier — live in-call coach (CIPA §632 consent-gated)
};

// Every known flag key, for the operator toggle UI and validation.
export const ALL_FEATURES = Object.values(FEATURES);

// Human-readable labels for the operator toggle UI. Keyed by flag key.
export const FEATURE_LABELS = {
  [FEATURES.LEAK_AUDIT]: "Leak Audit funnel",
  [FEATURES.BILLING]: "Per-case billing & invoicing",
  [FEATURES.BENCHMARKS]: "Peer benchmarking",
  [FEATURES.SPANISH_INTAKE]: "Spanish-language intake",
  [FEATURES.CRM_INTEGRATIONS]: "CRM integrations",
  [FEATURES.SPEED_TO_LEAD]: "Speed-to-lead SLA",
  [FEATURES.PUBLIC_CALIBRATION]: "Public calibration snapshot",
  [FEATURES.LIVE_COACH]: "Live in-call coach (Pro)",
};

// Is a string a known feature key? Unknown keys are treated as OFF everywhere.
export function isKnownFeature(feature) {
  return ALL_FEATURES.includes(feature);
}
