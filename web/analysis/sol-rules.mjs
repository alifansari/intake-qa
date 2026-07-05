// SOL rules as DATA, keyed by state (Phase 7 groundwork). California is the
// pilot's only VERIFIED jurisdiction — its rules are copied verbatim from the
// original inline table in sol.mjs, so CA estimates are byte-identical to before.
//
// Other states are deliberate PLACEHOLDERS marked `verified: false`. computeSol
// refuses to guess a deadline for an unverified state and instead returns a
// "state rules not yet verified — California only in pilot" result. This is
// structure only: no new legal claims are made for TX/FL/GA/NY here.

export const STATE_RULES = {
  CA: {
    verified: true,
    name: "California",
    rules: {
      government_claim: {
        statute: "Cal. Gov. Code §911.2",
        label: "Government tort claim",
        months: 6,
      },
      medical_malpractice: {
        statute: "Cal. Code Civ. Proc. §340.5 (MICRA)",
        label: "Medical malpractice (MICRA)",
        years: 1,
      },
      general_pi: {
        statute: "Cal. Code Civ. Proc. §335.1",
        label: "General personal injury",
        years: 2,
      },
    },
  },
  // Placeholders — NOT verified. Rendered as "not yet verified" until an attorney
  // confirms the periods, government-claim windows, and minor-tolling rules.
  TX: { verified: false, name: "Texas" },
  FL: { verified: false, name: "Florida" },
  GA: { verified: false, name: "Georgia" },
  NY: { verified: false, name: "New York" },
};

export const DEFAULT_STATE = "CA";

export function stateVerified(state) {
  return STATE_RULES[state]?.verified === true;
}

export function rulesForState(state) {
  const s = STATE_RULES[state];
  return s?.verified ? s.rules : null;
}

export function stateName(state) {
  return STATE_RULES[state]?.name ?? state;
}
