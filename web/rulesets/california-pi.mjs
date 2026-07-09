// California Personal Injury ruleset — the ONLY shipped, active ruleset.
//
// This is configuration, not scoring code: the calibrated engine under
// scoring/ (FROZEN — system-prompt.md + firm config + 3 gold examples) remains
// the scorer. This object names the dimensions that engine's output maps onto,
// the red flags, and the per-firm tunables — so the rest of the product reads
// practice-area facts from a ruleset, never from hardcoded PI assumptions.
//
// Empathy is deliberately NOT a signal: it folds into next_step_secured
// (was the caller converted to a concrete next step), per the no-vanity-scores
// rule.

export const ruleset = Object.freeze({
  key: "california-pi",
  displayName: "California Personal Injury",
  version: 1,
  active: true,

  // Case-quality signals (about the CASE). Each scored flag carries a
  // confidence tier (flag_confidence) — never a certainty claim.
  caseSignals: [
    { key: "injury_severity", label: "Injury severity", description: "Treatment-warranting injury described by the caller" },
    { key: "liability_clarity", label: "Liability clarity", description: "How clearly fault points away from the caller" },
    { key: "treatment_status", label: "Treatment status", description: "Whether the caller is receiving / has received treatment" },
    { key: "insurance_coverage", label: "Insurance / coverage indicators", description: "Defendant insurance, UM/UIM, policy signals" },
    { key: "sol_posture", label: "Statute-of-limitations posture", description: "Time remaining under the applicable CA statute (computed deterministically in analysis/sol.mjs, never by the LLM)" },
    { key: "prior_representation", label: "Prior representation", description: "Whether another firm already represents or rejected the caller" },
  ],

  // Handling signals (about the FIRM'S PERFORMANCE on the call).
  handlingSignals: [
    { key: "speed_to_lead", label: "Speed to lead", description: "Time to a live answer; voicemail = worst band" },
    { key: "screening_completeness", label: "Screening completeness", description: "Did intake capture the facts needed to evaluate the case" },
    { key: "next_step_secured", label: "Next step secured", description: "Was an appointment/callback locked in before hangup (empathy folds in here)" },
    { key: "objection_handling", label: "Objection handling", description: "Were caller hesitations addressed rather than dropped" },
  ],

  redFlags: [
    { key: "prior_attorney", label: "Already represented" },
    { key: "sol_expired", label: "Statute already run" },
    { key: "caller_at_fault", label: "Caller clearly at fault" },
    { key: "no_injury", label: "No treatment-warranting injury" },
    { key: "outside_geography", label: "Outside the firm's geography" },
  ],

  // Per-firm tunables (defaults). A firm's overrides live in
  // firm_ruleset_overrides and merge over these via rulesets/index.mjs —
  // unknown keys are ignored, so firms tune criteria, never invent them.
  tunables: {
    caseTypesWanted: ["auto_accident", "motorcycle", "pedestrian", "slip_and_fall", "dog_bite", "wrongful_death"],
    caseTypesExcluded: ["medical_malpractice", "workers_comp"],
    minimumSeverity: "treatment_warranted", // 'any' | 'treatment_warranted' | 'serious'
    geography: { state: "CA", counties: [] }, // empty counties = statewide
    solWindows: {
      // Deterministic CA references consumed by analysis/sol.mjs — informative
      // defaults here; the SOL engine's own rule table is authoritative.
      general_pi_years: 2,
      government_claim_days: 180,
      urgentThresholdDays: 90, // packet items inside this window get the SOL badge
    },
    minimumQualificationScore: 70, // flags below this never enqueue for review
  },

  // Where the actual scorer plugs in. The engine is calibrated and FROZEN;
  // a future ruleset would point at its own prompt + gold examples and satisfy
  // the same contract (see docs in rulesets/index.mjs).
  engine: {
    systemPromptPath: "scoring/system-prompt.md",
    goldExamplesOrder: [2, 1, 3],
    // TODO(engine): when a second ruleset ever ships, lift the request assembly
    // in lib/score-call.js behind this config instead of its current fixed paths.
  },
});
