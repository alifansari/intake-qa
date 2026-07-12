// scoring-v2/lib/liens.mjs — net-recovery / lien-compression model. Pure, no I/O.
//
// The single biggest structural edge over gross-bill scoring: "underwater" must
// be judged on PROJECTED NET after statutory lien reduction, not gross bills.
// Each lien type compresses recovery by a very different, statutorily-defined
// amount — a large Medi-Cal lien nets down to little, while an ERISA self-funded
// plan can claw back ~100% off the top. So the same gross lien against the same
// limits is "fine" for Medi-Cal and "underwater" for ERISA self-funded.
//
// COMPLIANCE RAIL: tiers only, never dollars. This module outputs a
// `lien_load_tier` and a basis string; it never emits an amount at intake.

// pass_through = fraction of the gross lien that survives reduction and eats
// the client's net (higher = worse for net recovery). rank 1 = most reducible.
// Sources verified in the R1/R2 corpus (Ahlborn/WIC 14124.78; Civ. 3045.4;
// Witt v. Jackson; 42 CFR 411.37; US Airways v. McCutchen).
export const LIEN_REDUCIBILITY = Object.freeze({
  medi_cal: { rank: 1, pass_through: 0.25, basis: "Medi-Cal: Ahlborn medical-only + 25% fee reduction (WIC 14124.72(d)) + 50%-of-net cap (WIC 14124.78) — most reducible" },
  medpay: { rank: 1, pass_through: 0.3, basis: "MedPay/PIP: often waivable or reducible; low net drag" },
  hospital_lien: { rank: 2, pass_through: 0.4, basis: "Hospital Lien Act: 50%-of-net cap (Civ. 3045.4) + Howell/Huff reasonableness" },
  wc_thirdparty: { rank: 3, pass_through: 0.5, basis: "Workers'-comp lien on 3rd-party recovery: reducible via pro-rata fee/cost share + Witt v. Jackson employer fault (litigated)" },
  private_health: { rank: 3, pass_through: 0.5, basis: "Private (fully-insured) health plan: made-whole/common-fund often apply — moderate" },
  medicare: { rank: 3, pass_through: 0.6, basis: "Medicare conditional payments: reducible chiefly by procurement-cost fee-share (42 CFR 411.37); federal super-lien" },
  erisa_insured: { rank: 3, pass_through: 0.6, basis: "ERISA fully-INSURED plan: made-whole/common-fund may apply (not deemer-exempt) — moderate" },
  lop: { rank: 4, pass_through: 0.7, basis: "Letters of protection / attorney-affiliated clinic: typically paid near full off the top" },
  erisa_selffunded: { rank: 5, pass_through: 1.0, basis: "ERISA SELF-FUNDED plan: plan language trumps made-whole + common-fund (US Airways v. McCutchen) — can claw back ~100%; THE disposition-flipper" },
  unknown: { rank: null, pass_through: null, basis: "lien source/reducibility not established on call" },
});

export const LIEN_LOAD_TIERS = Object.freeze(["none", "light", "moderate", "heavy", "unknown"]);

// Map the biggest reducibility-adjusted lien source, optionally scaled by a
// gross-size hint (treatment intensity), to a lien_load_tier.
//   grossLoadHint: "light" | "moderate" | "heavy" | undefined
// Critical abstention rule: when any lien source is unresolved — especially
// ERISA funding status (self-funded vs insured is almost never knowable on
// the call) — the tier is `unknown` and the caller routes to DEVELOP, never a
// worst-case guess and never an auto-decline.
export function projectedNetLienTier({ lien_sources, grossLoadHint } = {}) {
  const v = lien_sources && typeof lien_sources === "object" ? lien_sources.value : lien_sources;
  const sources = v && Array.isArray(v.sources) ? v.sources.slice() : [];
  const erisaFunding = (v && v.erisa_funding_status) || "unknown";

  if (sources.length === 0)
    return { tier: "none", reducibility_unknown: false, worst_source: null, basis: "no lien source stated" };

  // Resolve ERISA ambiguity: a bare "erisa" or an erisa source with unknown
  // funding is treated as reducibility-unknown → DEVELOP (obtain SPD).
  const normalized = sources.map((s) => {
    if (s === "erisa" || s === "erisa_selffunded" || s === "erisa_insured") {
      if (erisaFunding === "self_funded") return "erisa_selffunded";
      if (erisaFunding === "insured") return "erisa_insured";
      return "erisa_unknown";
    }
    return s;
  });

  const hasUnknown = normalized.some((s) => s === "unknown" || s === "erisa_unknown" || !LIEN_REDUCIBILITY[s]);

  // Worst (highest pass-through) KNOWN source drives the base tier.
  let worst = null;
  let worstPass = -1;
  for (const s of normalized) {
    const r = LIEN_REDUCIBILITY[s];
    if (r && typeof r.pass_through === "number" && r.pass_through > worstPass) {
      worstPass = r.pass_through;
      worst = s;
    }
  }

  // Unknown/unresolved reducibility dominates: abstain to DEVELOP.
  if (hasUnknown) {
    return {
      tier: "unknown",
      reducibility_unknown: true,
      worst_source: worst,
      basis: "lien reducibility unresolved (e.g. ERISA self-funded vs insured, or unspecified source) — DEVELOP: obtain SPD / plan funding status; never guess worst-case, never auto-decline",
    };
  }

  // Base tier from the worst reducibility-adjusted source.
  let tier = worstPass >= 0.85 ? "heavy" : worstPass >= 0.55 ? "moderate" : worstPass >= 0.3 ? "light" : "light";

  // Scale by the gross-size hint (a big gross even of a reducible lien still
  // compresses net; a small gross of an unreducible lien may not).
  const bump = { heavy: 1, moderate: 0, light: -1 };
  const order = ["light", "moderate", "heavy"];
  if (grossLoadHint && bump[grossLoadHint] !== undefined) {
    const idx = Math.min(2, Math.max(0, order.indexOf(tier) + bump[grossLoadHint]));
    tier = order[idx];
  }

  return {
    tier,
    reducibility_unknown: false,
    worst_source: worst,
    basis: LIEN_REDUCIBILITY[worst] ? LIEN_REDUCIBILITY[worst].basis : "lien load assessed on reducibility-adjusted net",
  };
}

// Does the lien picture support an UNDERWATER read against a min-limits/low
// coverage signal? Used by G1. Fires only on a heavy projected-net lien tier
// against a min-limits signal with no objective anchors; a heavy-but-UNKNOWN
// tier routes to review/develop, never fires the cap.
export function lienUnderwater({ lien_sources, minLimitsSignal, objectiveAnchors, grossLoadHint }) {
  if (objectiveAnchors) return { fired: false, review: false, tier: null, basis: "objective injury anchors present — never gated underwater from intake" };
  const net = projectedNetLienTier({ lien_sources, grossLoadHint });
  if (net.tier === "unknown")
    return { fired: false, review: true, tier: net.tier, basis: net.basis };
  const fired = net.tier === "heavy" && minLimitsSignal === true;
  return {
    fired,
    review: false,
    tier: net.tier,
    basis: fired
      ? `Heavy projected-NET lien load (${net.worst_source}) against a minimal-limits signal, no objective anchors — lien plausibly meets/exceeds net recovery. ${net.basis}`
      : net.basis,
  };
}
