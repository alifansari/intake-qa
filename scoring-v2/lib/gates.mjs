// scoring-v2/lib/gates.mjs — the four catastrophe gates (objective-spec §2).
// Pure functions over the extracted-facts JSON. No I/O, no LLM.
//
// Gates fire ONLY on facts the model marked observed_on_call (a quote exists).
// Facts that WOULD trigger a gate but are merely inferred do not fire the
// gate — confidence.mjs detects that situation and abstains to human review
// instead (call with { includeInferred: true } to probe for it).
//
// Each gate returns:
//   { gate, name, fired, trigger_quote, rationale,
//     capped_dispositions,   // the dispositions still ALLOWED after the gate
//     flags }                // extra flags (e.g. attorney_review, urgency)
//
// One confirmed gate can legitimately zero a file (goal-model §2): these are
// caps, never additive penalties. G3 is the deliberate exception — it NEVER
// caps anything (never auto-declines); it raises an attorney-review flag.

export const ALL_DISPOSITIONS = Object.freeze([
  "sign_now",
  "develop",
  "refer_out",
  "decline_with_grace",
]);

function actionable(fact, includeInferred) {
  if (!fact) return false;
  if (fact.observability === "observed_on_call") return true;
  return includeInferred === true && fact.observability === "inferred";
}

function quoteOf(fact) {
  return fact &&
    fact.evidence &&
    typeof fact.evidence === "object" &&
    typeof fact.evidence.quote === "string"
    ? fact.evidence.quote
    : null;
}

function signalPresent(fact, includeInferred) {
  return (
    actionable(fact, includeInferred) &&
    fact.value &&
    typeof fact.value === "object" &&
    fact.value.present === true
  );
}

// G1 — UNDERWATER: lien load ≈/> plausible limits, or a Prop 213 profile
// where the recoverable scope collapses to economic-only on a soft-tissue
// file. Two trigger profiles, both requiring the ABSENCE of observed
// objective-injury anchors (imaging/surgery) — a surgical case is never
// gated underwater from an intake call.
export function gateG1Underwater(facts, opts = {}) {
  const inc = opts.includeInferred;
  const insured = facts.caller_insured_status;
  const defIns = facts.defendant_insurance_signal;
  const lien = facts.lien_treatment_signal;
  const imaging = facts.imaging_or_surgery_signal;

  const objectiveAnchors =
    actionable(imaging, false) &&
    imaging.value &&
    typeof imaging.value === "object" &&
    imaging.value.present === true;

  // Profile A — Prop 213 (Civ. Code §3333.4): uninsured owner/operator, no
  // objective anchors → non-economic damages barred, economic-only remains.
  const prop213 =
    actionable(insured, inc) &&
    insured.value === "uninsured_owner_operator" &&
    !objectiveAnchors;

  // Profile B — min-limits + treating on lien + no objective anchors:
  // lien load plausibly ≈/> limits.
  const minLimits =
    actionable(defIns, inc) &&
    defIns.value &&
    typeof defIns.value === "object" &&
    defIns.value.minimal_limits_signal === true;
  const onLien =
    actionable(lien, inc) &&
    lien.value &&
    typeof lien.value === "object" &&
    lien.value.treating_on_lien === true;
  const underwater = minLimits && onLien && !objectiveAnchors;

  const fired = prop213 || underwater;
  return {
    gate: "G1",
    name: "underwater",
    fired,
    trigger_quote: fired ? quoteOf(prop213 ? insured : defIns) : null,
    rationale: fired
      ? prop213
        ? "Uninsured owner/operator with no objective injury anchors: §3333.4 bars non-economic damages; economic-only recovery profile."
        : "Minimal-limits signal with lien-based treatment and no objective injury anchors: lien load plausibly meets or exceeds limits."
      : null,
    capped_dispositions: fired
      ? ["refer_out", "decline_with_grace"]
      : [...ALL_DISPOSITIONS],
    flags: fired ? ["underwater_profile"] : [],
  };
}

// G2 — MALPRACTICE TRAP / DEADLINE-ADJACENT: aging-claim signal, government
// entity indicator, or perishable evidence. Never computes a date. Effect:
// the file may not sit in a develop queue — the option must be exercised now
// (sign / refer / decline), and urgency flags ride along.
export function gateG2DeadlineTrap(facts, opts = {}) {
  const inc = opts.includeInferred;
  const sol = facts.sol_adjacent_signal;
  const gov = facts.government_entity_signal;
  const perishable = facts.perishable_evidence_signal;

  const flags = [];
  let trigger = null;
  if (signalPresent(sol, inc)) {
    flags.push("sol_adjacent");
    trigger = trigger || sol;
  }
  if (signalPresent(gov, inc)) {
    flags.push("government_entity_window");
    trigger = trigger || gov;
  }
  if (signalPresent(perishable, inc)) {
    flags.push("perishable_evidence");
    trigger = trigger || perishable;
  }

  const fired = flags.length > 0;
  return {
    gate: "G2",
    name: "malpractice_trap_deadline_adjacent",
    fired,
    trigger_quote: fired ? quoteOf(trigger) : null,
    rationale: fired
      ? "Deadline-adjacent or perishable-evidence facts stated on the call: the file cannot sit undecided. Flags only — no date is computed anywhere in this engine."
      : null,
    capped_dispositions: fired
      ? ["sign_now", "refer_out", "decline_with_grace"] // develop is capped out
      : [...ALL_DISPOSITIONS],
    flags,
  };
}

// G3 — CLIENT RISK: observed risk-marker BEHAVIORS (fee negotiation, prior-
// attorney shopping, value obsession, noncooperation). Fires on >= 2 markers
// or on the fee-negotiation + attorney-shopping pair. NEVER caps any
// disposition and NEVER auto-declines — it raises attorney_review_required.
// Fairness rails: markers are behaviors on the call only; demographics,
// language, distress, and deferential speech can never appear here (they are
// structurally excluded upstream by the fact schema).
export function gateG3ClientRisk(facts, opts = {}) {
  const inc = opts.includeInferred;
  const markers = facts.client_risk_markers;
  const v =
    actionable(markers, inc) && markers.value && typeof markers.value === "object"
      ? markers.value
      : {};
  const observed = [
    "fee_negotiation_attempt",
    "attorney_shopping_signal",
    "value_obsession_signal",
    "noncooperation_signal",
  ].filter((k) => v[k] === true);

  const fired =
    observed.length >= 2 ||
    (v.fee_negotiation_attempt === true && v.attorney_shopping_signal === true);

  return {
    gate: "G3",
    name: "client_risk",
    fired,
    trigger_quote: fired ? quoteOf(markers) : null,
    rationale: fired
      ? `Observed client-risk behaviors: ${observed.join(", ")}. Routed to attorney review — this gate never caps or declines.`
      : null,
    capped_dispositions: [...ALL_DISPOSITIONS], // structurally uncapped, always
    flags: fired ? ["attorney_review_required"] : [],
  };
}

// G4 — TRIAL-CAPITAL EXPOSURE: stated facts imply the case cannot resolve
// without trying it, and the firm's PART B config says no trial capital.
export function gateG4TrialCapital(facts, config, opts = {}) {
  const inc = opts.includeInferred;
  const trial = facts.trial_posture_signal;
  const fired = signalPresent(trial, inc) && config.trial_capital !== true;
  return {
    gate: "G4",
    name: "trial_capital",
    fired,
    trigger_quote: fired ? quoteOf(trial) : null,
    rationale: fired
      ? "Stated facts imply trial-only resolution and the firm carries no trial capital: keeping it in-house risks the firm's own capital on a defense verdict."
      : null,
    capped_dispositions: fired
      ? ["refer_out", "decline_with_grace"]
      : [...ALL_DISPOSITIONS],
    flags: fired ? ["trial_only_resolution"] : [],
  };
}

// Evaluate all four. Returns { g1, g2, g3, g4, allowed, flags,
// attorney_review_required } where `allowed` is the intersection of every
// gate's capped_dispositions (G3 never narrows it).
export function evaluateGates(facts, config, opts = {}) {
  const g1 = gateG1Underwater(facts, opts);
  const g2 = gateG2DeadlineTrap(facts, opts);
  const g3 = gateG3ClientRisk(facts, opts);
  const g4 = gateG4TrialCapital(facts, config, opts);
  const gates = [g1, g2, g3, g4];
  const allowed = ALL_DISPOSITIONS.filter((d) =>
    gates.every((g) => g.capped_dispositions.includes(d))
  );
  const flags = [...new Set(gates.flatMap((g) => g.flags))];
  return {
    g1,
    g2,
    g3,
    g4,
    allowed,
    flags,
    attorney_review_required: g3.fired,
  };
}

// Fact ids whose observed values can fire a gate — used by confidence.mjs
// for the inferred-trigger abstention rule.
export const GATE_RELEVANT_FACT_IDS = Object.freeze([
  "caller_insured_status",
  "defendant_insurance_signal",
  "lien_treatment_signal",
  "sol_adjacent_signal",
  "government_entity_signal",
  "perishable_evidence_signal",
  "client_risk_markers",
  "trial_posture_signal",
]);
