// scoring-v2/lib/decision-table.mjs — deterministic aggregation (stage 4).
// Dimension reads + gates + PART B posture config → recommended disposition,
// value tier, develop payload, refer-out comparison. Pure, table-driven,
// no I/O, no LLM. Every output is a RECOMMENDATION for lawyer ratification —
// nothing here is terminal, and nothing here emits a dollar or a date.

import { postureFor, thinThresholdFor } from "./config.mjs";
import { actionable } from "./gates.mjs";

export const LOAD_BEARING_DIMS = Object.freeze([
  "liability_comparative_fault",
  "damages_credibility",
  "coverage_path",
  "collectability_deep_pocket",
]);

const level = (dims, name) => (dims[name] ? dims[name].level : "unknown");
const tierOf = (tiers, name) => (tiers && tiers[name] ? tiers[name].tier : "unknown");

// ---------------------------------------------------------------------------
// MIST profile: minor-impact soft-tissue — minimal property impact stated,
// no objective injury anchors, damages read thin or unknown.
// The minimal-impact trigger requires observed_on_call exactly like the
// gates: an INFERRED trigger never acts here — confidence.mjs probes for it
// (includeInferred) and routes the call to human review instead.
export function isMistProfile(facts, dims, opts = {}) {
  const pd = facts.property_damage_stated;
  const imaging = facts.imaging_or_surgery_signal;
  const minimalImpact =
    actionable(pd, opts.includeInferred) &&
    pd.value &&
    typeof pd.value === "object" &&
    pd.value.minimal_impact_signal === true;
  const anchors =
    imaging &&
    imaging.observability === "observed_on_call" &&
    imaging.value &&
    typeof imaging.value === "object" &&
    imaging.value.present === true;
  const damages = level(dims, "damages_credibility");
  return Boolean(minimalImpact && !anchors && (damages === "thin" || damages === "unknown"));
}

// ---------------------------------------------------------------------------
// Value tier lookup — TIERS ONLY, never dollars (compliance rail).
// Keyed on the damages read against the best coverage/collectability read,
// with G1 (underwater) forcing low.
export function valueTier(dims, gates) {
  if (gates.g1.fired) return "low";
  const damages = level(dims, "damages_credibility");
  const coverage = level(dims, "coverage_path");
  const collect = level(dims, "collectability_deep_pocket");
  const bestPath = [coverage, collect];
  if (damages === "unknown") return "indeterminate";
  if (damages === "fatal") return "low";
  if (damages === "strong" && bestPath.includes("strong")) return "high";
  if (damages === "strong") return bestPath.includes("adequate") ? "standard" : "indeterminate";
  if (damages === "adequate")
    return bestPath.includes("strong") || bestPath.includes("adequate")
      ? "standard"
      : "indeterminate";
  return "low"; // damages thin
}

// ---------------------------------------------------------------------------
// Develop payload: the option is only rational while information is cheaper
// than the EV swing it resolves — so name the resolving facts, class the
// info cost, and pre-register the exit condition (anti-sunk-cost device).
const RESOLVING_FACT_MAP = {
  liability_comparative_fault:
    "police report / witness statements (liability corroboration)",
  damages_credibility: "imaging result / treatment records (damages)",
  coverage_path: "defendant limits letter / UM confirmation (coverage path)",
  collectability_deep_pocket:
    "coverage and asset investigation (collectability)",
};

// NOTE: no urgency_flags field here — a develop payload only exists when the
// recommendation IS develop, and G2 (the only urgency source) caps develop
// out, so the field could never be non-empty. Urgency flags live at the top
// level of the recommendation (rec.urgency_flags).
export function buildDevelopPayload(dims, tiers, posture) {
  const resolving = LOAD_BEARING_DIMS.filter((d) =>
    ["unknown", "thin"].includes(level(dims, d))
  ).map((d) => RESOLVING_FACT_MAP[d]);
  const capital = tierOf(tiers, "capital_tier");
  const effort = tierOf(tiers, "effort_tier");
  const info_cost_class =
    capital === "heavy"
      ? "expensive_workup"
      : effort === "heavy_lit"
        ? "moderate_workup"
        : "cheap_records";
  return {
    resolving_facts: resolving.length ? resolving : ["full qualification set — call was thin"],
    info_cost_class,
    exit_condition_template:
      `Developing to learn: ${resolving.join("; ") || "the qualification set"}. ` +
      `If the facts resolve favorably, expected disposition: sign_now. ` +
      `If they resolve adversely, expected disposition: ` +
      `${posture === "selective" ? "decline_with_grace" : "decline_with_grace or refer_out"}. ` +
      `Pre-registered at entry; restate this question at review and grade only new information ` +
      `(invested hours are deliberately not displayed). The firm dockets its own review date — ` +
      `this engine never computes dates.`,
  };
}

// ---------------------------------------------------------------------------
// Refer-out comparison — surfaced whenever refer-out plausibly wins per-hour
// (goal-model §5: referral fee ≈ fee > 0 at hours ≈ 0). Tier language only.
export function buildReferComparison(dims, tiers, vTier) {
  const effort = tierOf(tiers, "effort_tier");
  const surfaced =
    (vTier === "high" && effort === "heavy_lit") ||
    level(dims, "case_type_fit") === "fatal";
  if (!surfaced) return null;
  return {
    kept_in_house: { value_tier: vTier, effort_tier: effort, capital_tier: tierOf(tiers, "capital_tier"), carry_tier: tierOf(tiers, "carry_tier") },
    referred_out: {
      fee_basis: "referral share of specialist recovery (CRPC 1.5.1, written client consent)",
      effort_tier: "near_zero",
      capital_tier: "none",
      carry_tier: tierOf(tiers, "carry_tier"),
    },
    likely_per_hour_winner: "refer_out",
    note: "Tier comparison only — the attorney ratifies keep-vs-refer; no dollar figures at intake.",
  };
}

// ---------------------------------------------------------------------------
// THE DECISION TABLE. Rules apply in order; the first matching base rule
// sets the base disposition, then overlays (MIST, capital, urgency) and gate
// caps adjust it. Every applied rule is recorded in disposition_basis.
export function decideDisposition({ llmOutput, gates, config }) {
  const dims = llmOutput.dimension_reads || {};
  const tiers = llmOutput.resource_tiers || {};
  const facts = llmOutput.extracted_facts || {};
  const caseType =
    (facts.case_type_primary && facts.case_type_primary.value) || "other_pi";
  const posture = postureFor(config, caseType);
  const thinThreshold = thinThresholdFor(config, caseType);
  const basis = [];

  const lb = LOAD_BEARING_DIMS.map((d) => ({ dim: d, level: level(dims, d) }));
  const fatalLB = lb.filter((x) => x.level === "fatal");
  const unknownLB = lb.filter((x) => x.level === "unknown");
  const thinLB = lb.filter((x) => x.level === "thin");
  const damages = level(dims, "damages_credibility");
  const fitFatal = level(dims, "case_type_fit") === "fatal";
  const mist = isMistProfile(facts, dims);

  // --- base rules (first match wins) --------------------------------------
  let base;
  if (fitFatal) {
    base = "refer_out";
    basis.push(
      "R1 case_type_fit=fatal → refer_out (out-of-scope is a referral, never a decline; declining forfeits a legitimate CRPC 1.5.1 fee and abandons a meritorious caller)"
    );
  } else if (fatalLB.length > 0) {
    base = damages === "strong" ? "refer_out" : "decline_with_grace";
    basis.push(
      `R2 fatal load-bearing read (${fatalLB.map((x) => x.dim).join(", ")}) → ${base}`
    );
  } else if (unknownLB.length > 0) {
    base = "develop";
    basis.push(
      `R3 unknown load-bearing read (${unknownLB.map((x) => x.dim).join(", ")}) → develop (cheap information before irreversible commitment)`
    );
  } else if (thinLB.length >= thinThreshold) {
    base = posture === "volume" ? "develop" : "decline_with_grace";
    basis.push(
      `R4 borderline (${thinLB.length} thin load-bearing ≥ threshold ${thinThreshold}) → posture ${posture} → ${base}`
    );
  } else if (thinLB.length === 1) {
    base = posture === "volume" ? "sign_now" : "develop";
    basis.push(`R5 single thin load-bearing read → posture ${posture} → ${base}`);
  } else {
    base = "sign_now";
    basis.push("R6 all load-bearing reads strong/adequate → sign_now");
  }

  // --- MIST overlay (borderline files only) --------------------------------
  if (mist && ["R4", "R5"].some((r) => basis[basis.length - 1].startsWith(r))) {
    const mapped = { develop: "develop", decline: "decline_with_grace", sign: "sign_now" }[
      config.mist_handling
    ];
    if (mapped !== base) basis.push(`R-MIST mist_handling=${config.mist_handling} → ${mapped}`);
    else basis.push(`R-MIST profile flagged; mist_handling=${config.mist_handling} leaves ${base}`);
    base = mapped;
  }

  // --- capital overlay ------------------------------------------------------
  if (
    base === "sign_now" &&
    tierOf(tiers, "capital_tier") === "heavy" &&
    config.capital_budget_tier === "minimal"
  ) {
    base = "refer_out";
    basis.push(
      "R7 capital_tier=heavy against capital_budget_tier=minimal → refer_out (costs-to-develop exceed the firm's advanceable-capital class)"
    );
  }

  // --- urgency overlay (G2: the file cannot sit) ---------------------------
  let r8ReviewRequired = false;
  if (gates.g2.fired && base === "develop") {
    if (fatalLB.length === 0 && thinLB.length <= 1 && unknownLB.length <= 1) {
      base = "sign_now";
      basis.push(
        "R8 deadline-adjacent + near-clean profile → develop flips to sign_now (forced option exercise; sign-and-investigate under the clock)"
      );
    } else if (fatalLB.length === 0 && thinLB.length <= 1) {
      // Marginality driven ONLY by unknown load-bearing reads: no cited
      // adverse evidence exists, and unobserved must never produce a decline.
      base = "refer_out";
      r8ReviewRequired = true;
      basis.push(
        `R8 deadline pressure + unresolved facts (${unknownLB.map((x) => x.dim).join(", ")} unknown; no cited adverse evidence) → refer_out + attorney review — refer or expedite workup; do not sit`
      );
    } else {
      base = damages === "strong" ? "refer_out" : "decline_with_grace";
      basis.push(
        `R8 deadline-adjacent + marginal profile (cited adverse evidence on load-bearing reads) → develop is a malpractice trap → ${base}`
      );
    }
  }

  // --- gate caps (intersection of allowed dispositions) --------------------
  let recommended = base;
  if (!gates.allowed.includes(recommended)) {
    if (damages === "strong" && gates.allowed.includes("refer_out")) {
      recommended = "refer_out";
    } else if (gates.allowed.includes("decline_with_grace")) {
      recommended = "decline_with_grace";
    } else {
      recommended = gates.allowed[0] || "decline_with_grace";
    }
    basis.push(
      `R9 gate cap: ${base} not in allowed {${gates.allowed.join(", ")}} → ${recommended}`
    );
  }

  const vTier = valueTier(dims, gates);
  const develop_payload =
    recommended === "develop" ? buildDevelopPayload(dims, tiers, posture) : null;
  const refer_comparison = buildReferComparison(dims, tiers, vTier);

  return {
    recommended_disposition: recommended,
    value_tier: vTier,
    posture_applied: posture,
    case_type: caseType,
    mist_flag: mist,
    urgency_flags: gates.g2.flags,
    attorney_review_required: gates.attorney_review_required || r8ReviewRequired,
    develop_payload,
    refer_comparison,
    disposition_basis: basis,
    compliance: {
      recommendation_only: true,
      requires_attorney_ratification: true,
      no_dollar_output: true,
      no_computed_deadlines: true,
    },
  };
}
