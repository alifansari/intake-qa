// scoring-v2/lib/ca-gates.mjs
//
// California statutory HARD GATES that the calibrated v2 gates (G1-G4) do not
// yet cover. These are legal walls, not firm preferences: when one fires it
// OVERRIDES appetite and score. A dram-shop-immunity call can never be a sign,
// no matter how strong the injury reads.
//
// Pure functions. No I/O, no LLM, no dollars, no computed dates. Every gate
// names the controlling California authority so the recommendation traces to a
// statute (citation guard: no citation, no claim). Nothing here is terminal:
// every result is a RECOMMENDATION the attorney ratifies.
//
// Design: this layer runs AFTER the calibrated decideDisposition. Each gate
// returns whether it fired, the disposition it forces, a plain-English reason,
// the statute, and the single fact that would flip it (flip_fact). The engine
// applies the most severe firing gate as an override and records it in the
// basis trail.

// Disposition severity, worst to best. An override never makes a case BETTER
// than the calibrated engine already found it; it only holds or lowers it.
const SEVERITY = Object.freeze({
  decline_with_grace: 0,
  refer_out: 1,
  develop: 2,
  sign_now: 3,
});

function worse(a, b) {
  return SEVERITY[a] <= SEVERITY[b] ? a : b;
}

// ---------------------------------------------------------------------------
// CA-G1 DRAM SHOP / SOCIAL HOST IMMUNITY (Bus. & Prof. Code 25602; Civ. Code
// 1714(b),(c)). Furnishing alcohol is not the proximate cause of later injury;
// consumption is. Broad civil immunity. The ONLY openings: a licensee that
// served an obviously intoxicated MINOR (Bus. & Prof. 25602.1), or a social
// host who served a minor (Civ. Code 1714(c)/(d)). Absent that, decline.
export function caDramShopGate(input) {
  if (!isDramShop(input.case_type)) return notFired("CA-G1");
  const licenseeMinor =
    input.dram_shop_licensed_vendor === true &&
    input.dram_shop_obviously_intoxicated_minor === true;
  const socialHostMinor =
    input.dram_shop_served_a_minor === true; // Civ. Code 1714(c)/(d) opening
  if (licenseeMinor || socialHostMinor) {
    // An exception is in play. This is not an auto-decline; it is a real but
    // narrow case that turns on proof of the "obviously intoxicated" state and
    // proximate cause. Route to attorney review rather than override.
    return {
      gate: "CA-G1",
      name: "dram_shop_immunity_exception",
      fired: false,
      review: true,
      citation: licenseeMinor ? "Bus. & Prof. Code 25602.1" : "Civ. Code 1714(c)",
      reason:
        "Possible dram-shop exception (alcohol furnished to an obviously intoxicated minor). " +
        "Most furnishing claims are barred, but this narrow opening is viable. Attorney to confirm the minor and the obviously-intoxicated state.",
      flip_fact: "Confirm the person served was a minor and was obviously intoxicated at the time of service.",
      flags: ["attorney_review_required", "ca_dram_shop_exception"],
    };
  }
  return {
    gate: "CA-G1",
    name: "dram_shop_immunity",
    fired: true,
    override_disposition: "decline_with_grace",
    citation: "Bus. & Prof. Code 25602; Civ. Code 1714(b)",
    reason:
      "California immunizes furnishing alcohol: consumption, not service, is the proximate cause. " +
      "No claim against the bar, restaurant, or social host absent the narrow obviously-intoxicated-minor exception.",
    flip_fact:
      "Was the drinker a minor served by a licensee (25602.1) or a social host (1714(c))? If yes, this is not barred.",
    flags: ["ca_dram_shop_barred"],
  };
}

// ---------------------------------------------------------------------------
// CA-G2 WORKERS' COMP EXCLUSIVE REMEDY / THIRD-PARTY CARVE-OUT (Lab. Code 3602
// exclusivity; 3852 third-party action). A work injury is comp-only against
// the employer. A civil PI case exists ONLY if a non-employer third party is at
// fault (another driver, a product maker, a property owner, a subcontractor).
// No third party -> refer to a comp specialist (the CRPC 1.5.1 referral keeps
// the caller helped and the fee legitimate; declining forfeits both).
export function caWorkersCompGate(input) {
  if (!isWorkInjury(input)) return notFired("CA-G2");
  const thirdParty = input.work_injury_third_party;
  if (thirdParty === true) {
    return {
      gate: "CA-G2",
      name: "workers_comp_third_party_live",
      fired: false,
      citation: "Lab. Code 3852",
      reason:
        "Work injury WITH a third-party tortfeasor: a civil PI claim runs alongside the comp claim. " +
        "Note the comp lien (Lab. Code 3856/3861) rides any recovery, reduced by employer fault (Witt v. Jackson).",
      flip_fact: null,
      flags: ["ca_wc_third_party", "ca_wc_lien_applies"],
    };
  }
  if (thirdParty === false) {
    return {
      gate: "CA-G2",
      name: "workers_comp_only",
      fired: true,
      override_disposition: "refer_out",
      citation: "Lab. Code 3602 (exclusive remedy)",
      reason:
        "Work injury with no third-party defendant: comp exclusivity bars a civil suit against the employer. " +
        "Refer to a workers' comp specialist rather than decline.",
      flip_fact:
        "Was anyone other than the employer at fault (another driver, a product, a property owner, a subcontractor)? If yes, a civil case opens.",
      flags: ["ca_wc_comp_only"],
    };
  }
  // Unknown third-party status: do not override, raise it as the thing to learn.
  return {
    gate: "CA-G2",
    name: "workers_comp_third_party_unknown",
    fired: false,
    review: true,
    citation: "Lab. Code 3852",
    reason:
      "Work injury with third-party fault not yet known. Whether a civil case exists turns entirely on this.",
    flip_fact: "Ask whether anyone other than the employer caused the injury.",
    flags: ["attorney_review_required", "ca_wc_third_party_unknown"],
  };
}

// ---------------------------------------------------------------------------
// CA-G3 ELDER ABUSE HEIGHTENED-REMEDY THRESHOLD (Welf. & Inst. Code 15657;
// Delaney v. Baker; Civ. Code 3333.2 MICRA). A nursing-home / dependent-adult
// case is a VALUE FORK, not a decline. Proving reckless neglect by clear and
// convincing evidence unlocks mandatory attorney fees, survival of the elder's
// pre-death pain and suffering, and (per Delaney) escape from the MICRA
// non-economic cap. A plain professional-negligence theory stays MICRA-capped.
// This gate never declines; it flags which track the case is on.
export function caElderAbuseGate(input) {
  if (!isElderAbuse(input.case_type)) return notFired("CA-G3");
  const reckless = input.elder_abuse_reckless_neglect === true;
  if (reckless) {
    return {
      gate: "CA-G3",
      name: "elder_abuse_heightened_remedy",
      fired: false,
      citation: "Welf. & Inst. Code 15657; Delaney v. Baker (1999)",
      reason:
        "Reckless-neglect indicators present: the 15657 track unlocks mandatory attorney fees, survival of pre-death " +
        "pain and suffering, and escape from the MICRA cap (Delaney). High-value if proven by clear and convincing evidence.",
      flip_fact:
        "Confirm a pattern of reckless neglect (not an isolated error): failure to turn, feed, hydrate, or provide skin care.",
      flags: ["ca_elder_abuse_heightened", "attorney_review_required"],
      value_hint: "high",
    };
  }
  return {
    gate: "CA-G3",
    name: "elder_abuse_professional_negligence",
    fired: false,
    review: true,
    citation: "Civ. Code 3333.2 (MICRA cap)",
    reason:
      "Elder / nursing-home matter reading as ordinary professional negligence: non-economic damages stay under the MICRA " +
      "cap. The 15657 heightened remedies are what make these cases worthwhile, so probe for reckless neglect before pricing.",
    flip_fact:
      "Is there a pattern of reckless neglect (recurring, not a one-time error)? That flips this to the uncapped 15657 track.",
    flags: ["ca_elder_abuse_capped"],
    value_hint: "standard",
  };
}

// ---------------------------------------------------------------------------
// CA-G4 NO BODILY INJURY (viability floor). Property damage alone is not a
// personal-injury case. A pure-property or no-injury call is not a decline of a
// PI file; it is not a PI file. Handled here so appetite never signs it.
export function caNoInjuryGate(input) {
  const noInjury =
    input.property_damage_only === true || input.injury === "none";
  if (!noInjury) return notFired("CA-G4");
  return {
    gate: "CA-G4",
    name: "no_bodily_injury",
    fired: true,
    override_disposition: "decline_with_grace",
    citation: "Personal injury requires bodily harm (CACI 3900 et seq.)",
    reason:
      "No bodily injury stated: a personal-injury claim needs harm to a person, not only to property. " +
      "Property-damage-only is handled by the carrier, not a PI retainer.",
    flip_fact: "Is there any bodily injury, even soft-tissue pain that appeared after the incident?",
    flags: ["ca_no_injury"],
  };
}

// ---------------------------------------------------------------------------
// CA-G5 STATUTE OF LIMITATIONS EXPIRED (hard stop). The SOL clock itself is
// computed by the firm-visible analysis/sol.mjs (with its disclaimer). This
// gate only turns an already-computed "expired" urgency into an override, so
// appetite never signs a time-barred file. `solResult` is the computeSol()
// return; a minor-tolling flag suppresses the override (verify, do not decline).
export function caSolExpiredGate(solResult) {
  if (!solResult) return notFired("CA-G5");
  if (solResult.urgency !== "expired") return notFired("CA-G5");
  if (solResult.minorTollingMayApply === true) {
    return {
      gate: "CA-G5",
      name: "sol_expired_but_minor_tolling",
      fired: false,
      review: true,
      citation: solResult.statute || "CCP 335.1; CCP 352 (minor tolling)",
      reason:
        "The general deadline appears passed, but the claimant is a minor and tolling likely extends it. Verify the date of birth before treating it as barred.",
      flip_fact: "Confirm the claimant's date of birth and current age to compute the tolled deadline.",
      flags: ["attorney_review_required", "ca_sol_minor_tolling"],
    };
  }
  return {
    gate: "CA-G5",
    name: "sol_expired",
    fired: true,
    override_disposition: "decline_with_grace",
    citation: solResult.statute || "CCP 335.1",
    reason:
      "The statute of limitations appears to have expired on the facts given. A time-barred claim cannot be pursued. " +
      solResult.disclaimer,
    flip_fact:
      "Is the incident date correct? Any tolling (minor, delayed discovery, defendant absence) that would extend the deadline?",
    flags: ["ca_sol_expired"],
  };
}

// ---------------------------------------------------------------------------
// Aggregate: run every CA gate, return the fired overrides, review flags, and
// the single most severe override disposition (or null).
export function evaluateCaGates(input, solResult) {
  const results = [
    caNoInjuryGate(input),
    caSolExpiredGate(solResult),
    caDramShopGate(input),
    caWorkersCompGate(input),
    caElderAbuseGate(input),
  ];
  const fired = results.filter((r) => r.fired);
  const review = results.filter((r) => !r.fired && r.review);
  const informational = results.filter((r) => !r.fired && !r.review && r.gate && !isNoOp(r));

  let override = null;
  for (const r of fired) {
    override = override
      ? worse(override, r.override_disposition)
      : r.override_disposition;
  }
  // The controlling (most severe) fired gate drives the headline reason.
  const controlling =
    fired.slice().sort(
      (a, b) => SEVERITY[a.override_disposition] - SEVERITY[b.override_disposition]
    )[0] || null;

  const flags = [...new Set(results.flatMap((r) => r.flags || []))];
  const valueHint =
    results.map((r) => r.value_hint).find((v) => v === "high") ||
    results.map((r) => r.value_hint).find((v) => v === "standard") ||
    null;

  return {
    fired,
    review,
    informational,
    override_disposition: override,
    controlling,
    value_hint: valueHint,
    attorney_review_required: flags.includes("attorney_review_required"),
    flags,
  };
}

// --- helpers ---------------------------------------------------------------
function notFired(gate) {
  return { gate, fired: false, review: false, flags: [] };
}
function isNoOp(r) {
  return r.review === false && r.fired === false && !r.reason;
}
function isDramShop(caseType) {
  return caseType === "dram_shop" || caseType === "social_host";
}
function isElderAbuse(caseType) {
  return caseType === "elder_abuse" || caseType === "nursing_home";
}
function isWorkInjury(input) {
  return (
    input.case_type === "workers_comp" ||
    input.case_type === "work_injury" ||
    input.work_injury === true
  );
}

export { SEVERITY as CA_DISPOSITION_SEVERITY, worse as worseDisposition };
