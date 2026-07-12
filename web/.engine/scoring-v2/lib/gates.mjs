// scoring-v2/lib/gates.mjs — the four catastrophe gates (objective-spec §2).
// Pure functions over the extracted-facts JSON. No I/O, no LLM.
//
// v2.2 additions (all OPTIONAL, observed-only, backward-compatible): G1 also
// consults the net-recovery lien model (liens.mjs) and rideshare coverage
// compression (statutes.mjs); G2 also consults the richer public-entity fact.
// When the new facts are absent the gates behave exactly as v2.1.
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

import { lienUnderwater } from "./liens.mjs";
import { rideshareCoverage } from "./statutes.mjs";

export const ALL_DISPOSITIONS = Object.freeze([
  "sign_now",
  "develop",
  "refer_out",
  "decline_with_grace",
]);

// Exported: the MIST overlay (decision-table.mjs) applies the same
// observed-only trigger discipline as the gates.
export function actionable(fact, includeInferred) {
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

// caller_insured_status values that put the caller inside the §3333.4 bar:
// an uninsured OWNER/operator, or a non-owner OPERATOR of a vehicle that was
// itself uninsured (§3333.4(a)(3)). A permissive user of an INSURED vehicle
// ("uninsured_driver_of_insured_vehicle") and passengers are excepted.
export const PROP213_BARRED_INSURED_VALUES = Object.freeze([
  "uninsured_owner_operator",
  "uninsured_driver_of_uninsured_vehicle",
]);

// G1 — UNDERWATER: lien load ≈/> plausible limits, or a Prop 213 profile
// where the recoverable scope collapses to economic-only on a soft-tissue
// file. Two trigger profiles, both requiring the ABSENCE of observed
// objective-injury anchors (imaging/surgery) — a surgical case is never
// gated underwater from an intake call.
//
// §3333.4(c) DUI exception: when the caller states facts indicating the
// DEFENDANT was DUI (defendant_fault_indicators.value.dui_indicator, observed
// on call), non-economic damages MAY be restored — but restoration turns on a
// CONVICTION, which is unknowable at intake. The gate must not assume either
// way: it withholds the refer/decline cap and raises attorney_review_required
// so the attorney determines conviction status.
export function gateG1Underwater(facts, opts = {}) {
  const inc = opts.includeInferred;
  const insured = facts.caller_insured_status;
  const defIns = facts.defendant_insurance_signal;
  const lien = facts.lien_treatment_signal;
  const imaging = facts.imaging_or_surgery_signal;
  const faultInd = facts.defendant_fault_indicators;

  const objectiveAnchors =
    actionable(imaging, false) &&
    imaging.value &&
    typeof imaging.value === "object" &&
    imaging.value.present === true;

  // Profile A — Prop 213 (Civ. Code §3333.4): barred uninsured profile, no
  // objective anchors → non-economic damages barred, economic-only remains.
  const prop213Profile =
    actionable(insured, inc) &&
    PROP213_BARRED_INSURED_VALUES.includes(insured.value) &&
    !objectiveAnchors;

  // §3333.4(c) escape hatch: defendant-DUI indicator actionable at this pass.
  const duiIndicated =
    actionable(faultInd, inc) &&
    faultInd.value &&
    typeof faultInd.value === "object" &&
    faultInd.value.dui_indicator === true;

  const prop213 = prop213Profile && !duiIndicated;
  const duiExceptionReview = prop213Profile && duiIndicated;

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

  // Profile C (v2.2) — PROJECTED-NET lien model. When the richer lien_sources
  // fact is stated, judge underwater on projected NET after statutory
  // reduction, not gross: an ERISA self-funded plan (claws ~100%) can sink a
  // file a Medi-Cal lien (reduces to modest net) would not. Unknown
  // reducibility (esp. ERISA self-funded vs insured, unknowable on-call) NEVER
  // fires the cap — it raises a develop/review flag ("obtain SPD").
  const lienSrc = facts.lien_sources;
  const lienEval = actionable(lienSrc, inc)
    ? lienUnderwater({
        lien_sources: lienSrc,
        minLimitsSignal: minLimits,
        objectiveAnchors,
        grossLoadHint: onLien ? "heavy" : undefined,
      })
    : { fired: false, review: false, tier: null, basis: null };
  const lienNetUnderwater = lienEval.fired;
  const lienReducibilityReview = lienEval.review;

  // Profile D (v2.2) — rideshare coverage COMPRESSION. A passenger injured by
  // an uninsured third party on/after 1/1/2026 is capped at $60k/$300k UM/UIM
  // (SB 371). With no objective anchors that can sink a serious file — but
  // treatment magnitude is unobserved on-call, so this is a REVIEW flag that
  // routes to develop, never an auto-cap.
  const rp = facts.rideshare_period;
  let rideshareCapReview = false;
  if (
    actionable(rp, inc) &&
    rp.value &&
    typeof rp.value === "object" &&
    !objectiveAnchors
  ) {
    const cov = rideshareCoverage({
      period: rp.value.period,
      atFaultParty: rp.value.at_fault_party,
      crashDateISO: rp.value.crash_date_stated,
    });
    rideshareCapReview = cov.branch === "umuim_capped";
  }

  const fired = prop213 || underwater || lienNetUnderwater;
  const reviewOnly =
    !fired && (duiExceptionReview || lienReducibilityReview || rideshareCapReview);

  // Pick the quote/rationale for whichever profile actually fired.
  let firedQuote = null;
  let firedRationale = null;
  if (fired) {
    if (prop213) {
      firedQuote = quoteOf(insured);
      firedRationale =
        "Uninsured owner/operator (§3333.4 barred profile) with no objective injury anchors: §3333.4 bars non-economic damages; economic-only recovery profile.";
    } else if (lienNetUnderwater) {
      firedQuote = quoteOf(lienSrc);
      firedRationale = `Underwater on PROJECTED NET after statutory lien reduction (not gross): ${lienEval.basis}`;
    } else {
      firedQuote = quoteOf(defIns);
      firedRationale =
        "Minimal-limits signal with lien-based treatment and no objective injury anchors: lien load plausibly meets or exceeds limits.";
    }
  }

  const reviewFlags = [];
  let reviewQuote = null;
  let reviewRationale = null;
  if (reviewOnly) {
    if (duiExceptionReview) {
      reviewFlags.push("attorney_review_required", "possible_3333_4c_dui_exception");
      reviewQuote = quoteOf(insured);
      reviewRationale =
        "Prop 213 profile with possible §3333.4(c) DUI exception — attorney determines conviction status; underwater cap withheld (conviction status cannot be known at intake).";
    }
    if (lienReducibilityReview) {
      reviewFlags.push("attorney_review_required", "lien_reducibility_unresolved");
      reviewQuote = reviewQuote || quoteOf(lienSrc);
      reviewRationale =
        reviewRationale ||
        `Lien present but reducibility unresolved — DEVELOP (obtain SPD / plan funding status); underwater cap withheld. ${lienEval.basis || ""}`.trim();
    }
    if (rideshareCapReview) {
      reviewFlags.push("attorney_review_required", "rideshare_coverage_capped");
      reviewQuote = reviewQuote || quoteOf(rp);
      reviewRationale =
        reviewRationale ||
        "Rideshare passenger injured by an uninsured third party (post-1/1/2026): UM/UIM capped at $60k/$300k (SB 371) — possible underwater on a serious injury; DEVELOP (confirm treatment magnitude), cap withheld.";
    }
  }

  return {
    gate: "G1",
    name: "underwater",
    fired,
    trigger_quote: fired ? firedQuote : reviewOnly ? reviewQuote : null,
    rationale: fired ? firedRationale : reviewOnly ? reviewRationale : null,
    capped_dispositions: fired
      ? ["refer_out", "decline_with_grace"]
      : [...ALL_DISPOSITIONS],
    flags: fired ? ["underwater_profile"] : reviewOnly ? [...new Set(reviewFlags)] : [],
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

  const pubEntity = facts.public_entity_defendant; // v2.2 richer fact (optional)

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
  // v2.2: the richer public-entity fact also fires the government-claim window,
  // and carries sub-flags. §911.2 6-month claim is the sharpest deadline trap.
  if (signalPresent(pubEntity, inc)) {
    flags.push("government_entity_window");
    trigger = trigger || pubEntity;
    const pv = pubEntity.value;
    if (pv && pv.rejection_letter === true) flags.push("government_claim_rejected_6mo_suit_clock");
    // A minor gets mandatory late-claim relief to ~1yr (Gov 911.4/946.6): do
    // not treat as a hard 6-month CRITICAL — surface the backstop as a flag.
    if (pv && pv.claimant_is_minor === true) flags.push("government_minor_late_claim_relief_may_apply");
    if (pv && pv.claim_already_filed === true) flags.push("government_claim_already_filed");
  }
  if (signalPresent(perishable, inc)) {
    flags.push("perishable_evidence");
    trigger = trigger || perishable;
  }
  // v2.2: commercial-truck evidence is genuinely perishable (ELD/dashcam can
  // overwrite in 1-3 days) — surface a spoliation urgency flag. It rides on
  // G2 (which caps develop out: a truck case cannot sit while evidence rots).
  const truck = facts.commercial_truck;
  if (
    actionable(truck, inc) &&
    truck.value &&
    typeof truck.value === "object" &&
    truck.value.present === true
  ) {
    flags.push("spoliation_letter_needed");
    trigger = trigger || truck;
  }
  flags.splice(0, flags.length, ...new Set(flags));

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
    // G3 firing and the G1 §3333.4(c) DUI-exception path both raise the flag.
    attorney_review_required: flags.includes("attorney_review_required"),
  };
}

// Fact ids whose observed values can fire a gate or change a gate/overlay
// outcome — the abstention probe set (confidence.mjs abstains when any of
// these would change behavior only at inferred observability).
export const GATE_RELEVANT_FACT_IDS = Object.freeze([
  "caller_insured_status",
  "defendant_insurance_signal",
  "lien_treatment_signal",
  "sol_adjacent_signal",
  "government_entity_signal",
  "perishable_evidence_signal",
  "client_risk_markers",
  "trial_posture_signal",
  "defendant_fault_indicators", // §3333.4(c) DUI exception flips G1's outcome
  "property_damage_stated", // minimal-impact trigger drives the MIST overlay
  "lien_sources", // v2.2 — projected-net lien model can fire/withhold G1
  "rideshare_period", // v2.2 — coverage compression can raise a G1 review flag
  "public_entity_defendant", // v2.2 — richer government-claim window (G2)
  "commercial_truck", // v2.2 — spoliation urgency (G2)
]);
