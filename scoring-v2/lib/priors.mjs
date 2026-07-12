// scoring-v2/lib/priors.mjs — the "boring prior" (delegated).
//
// Anti-base-rate-neglect countermeasure. Before a firm's own resolved-case
// flywheel has data, the engine shows the attorney the published base rate for
// "cases like this" so a vivid single call cannot swamp the reference class.
//
// HARD COMPLIANCE RAILS (identical spirit to the rest of scoring-v2):
//   - TIER language only, NEVER a dollar figure — not at intake, not ever here.
//   - Every seed carries `is_firm_data: false` and every emitted sentence is
//     labeled "published prior, not this firm's data", so the prior visibly
//     decays as real resolved cases accrue and displace it.
//   - Seeds are ORDINAL / relative. No free California settlement distribution
//     exists to anchor an absolute rate, so confidence is "low" broadly and the
//     numbers are heuristic reference classes, not calibrated probabilities.
//
// Pure ESM. No I/O, no network, no LLM.

// ---------------------------------------------------------------------------
// SEED_PRIORS — case_type id → labeled published-heuristic seed row.
// value_tier_seed uses the same vocab as decision-table.valueTier:
//   "high" | "standard" | "low" | "indeterminate".
// dog_rate ("dog" = a file that resolves low-value / not worth the carry):
//   "low" | "moderate" | "high" | "unknown".
// settle_prob is "high" across PI intake — the overwhelming majority of filed
// PI matters settle rather than try (~95% practitioner heuristic).
const SEEDS = {
  mva_standard: {
    value_tier_seed: "standard",
    dog_rate: "moderate", // soft-tissue / MIST share of the intake funnel
    settle_prob: "high",
    source: "BJS Tort Trials + practitioner heuristics",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Reference class dominated by soft-tissue / minor-impact files; objective injury lifts an individual call above this prior.",
  },
  mva_commercial: {
    value_tier_seed: "high",
    dog_rate: "low", // commercial policies + higher limits reduce the dog share
    settle_prob: "high",
    source: "FMCSA limits + practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Commercial defendant / higher mandated limits; coverage path is usually the strong leg.",
  },
  trucking: {
    value_tier_seed: "high",
    dog_rate: "low", // FMCSA-mandated minimums well above private auto
    settle_prob: "high",
    source: "FMCSA limits + practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Interstate motor-carrier minimums (FMCSA) sit far above private-auto floors; treated as mva_commercial with a truck.",
  },
  rideshare: {
    value_tier_seed: "standard",
    dog_rate: "moderate",
    settle_prob: "high",
    source: "TNC coverage schedule + practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Strongly period-dependent: off-app, waiting, and en-route/passenger periods carry very different coverage layers.",
  },
  premises: {
    value_tier_seed: "standard",
    dog_rate: "high", // liability-discounted; ~39% plaintiff-win at trial
    settle_prob: "high",
    source: "BJS",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Liability is the choke point — plaintiff wins at trial only ~39% of the time; notice/dangerous-condition proof gates value.",
  },
  dog_bite: {
    value_tier_seed: "standard",
    dog_rate: "moderate",
    settle_prob: "high",
    source: "III dog-bite data",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Strict-liability statute, but value is collectability-gated on homeowner/renter coverage being present and adequate.",
  },
  product: {
    value_tier_seed: "high",
    dog_rate: "high", // expert-heavy; many files die on causation/cost
    settle_prob: "high",
    source: "practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Expert- and capital-heavy; strong outcomes exist but the dog rate at intake is high, favoring develop-or-refer.",
  },
  med_mal: {
    value_tier_seed: "high",
    dog_rate: "high", // ~0.70 intake-denominator dog rate; capital-gated → refer
    settle_prob: "high",
    source: "CRICO/Candello + Studdert gradient",
    confidence: "low",
    is_firm_data: false,
    notes:
      "About 0.70 of intake-denominator files are dogs; MICRA cap + expert cost make this capital-gated — usually refer rather than keep.",
  },
  motorcycle: {
    value_tier_seed: "high",
    dog_rate: "moderate", // high severity, comparative-fault exposure
    settle_prob: "high",
    source: "practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "High injury severity lifts value, but comparative-fault / bias exposure keeps a moderate dog share.",
  },
  pedestrian_bicycle: {
    value_tier_seed: "high",
    dog_rate: "moderate", // high severity, comparative-fault exposure
    settle_prob: "high",
    source: "practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Severe injuries common; comparative-fault and coverage-of-the-striking-vehicle drive the moderate dog share.",
  },
  government_entity: {
    value_tier_seed: "standard",
    dog_rate: "high", // procedural traps (claim presentation, short SOL)
    settle_prob: "high",
    source: "practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Procedural traps — Gov. Code claim presentation and short deadlines — knock out otherwise-meritorious files.",
  },
  elder_abuse: {
    value_tier_seed: "high",
    dog_rate: "moderate", // fee-shift on recklessness lifts marginal files
    settle_prob: "high",
    source: "WIC 15657 practitioner",
    confidence: "low",
    is_firm_data: false,
    notes:
      "Recklessness findings unlock enhanced remedies / fee-shifting (WIC 15657), lifting files that would otherwise read low.",
  },
  // Fallback reference class for unknown / unmapped case types.
  other_pi: {
    value_tier_seed: "indeterminate",
    dog_rate: "unknown",
    settle_prob: "high",
    source: "no published reference class",
    confidence: "low",
    is_firm_data: false,
    notes:
      "No usable published reference class for this case type — the prior abstains; develop the file rather than lean on a base rate.",
  },
};

// Deep-freeze so no downstream caller can mutate a shared seed row.
function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const SEED_PRIORS = deepFreeze(SEEDS);

// The row used when a case type is unknown / unmapped.
const DEFAULT_KEY = "other_pi";

// ---------------------------------------------------------------------------
// Phrasing helpers — tier / rate language only, never a number-with-a-dollar.

function seedFor(caseType) {
  return (caseType && SEED_PRIORS[caseType]) || SEED_PRIORS[DEFAULT_KEY];
}

function tierPhrase(tier) {
  switch (tier) {
    case "high":
      return "the high value tier";
    case "standard":
      return "the standard value tier";
    case "low":
      return "the low value tier";
    default:
      return "no clear value tier (indeterminate at intake)";
  }
}

function dogPhrase(rate) {
  switch (rate) {
    case "low":
      return "a low rate of files that become low-value 'dogs'";
    case "moderate":
      return "a moderate rate of files that become low-value 'dogs'";
    case "high":
      return "a high rate of files that become low-value 'dogs'";
    default:
      return "an unknown rate of files that become low-value 'dogs'";
  }
}

function settlePhrase(prob) {
  // Ordinal, not a computed probability — "high" is the only PI-intake value.
  return prob === "high"
    ? "the strong majority settle rather than try"
    : "settlement-versus-trial split is unclear";
}

// Rank ordered tiers so we can note when a LIVE read diverges from the prior.
// "indeterminate" / unknown is intentionally unranked (returns null).
const TIER_RANK = { low: 1, standard: 2, high: 3 };

function divergencePhrase(seedTier, liveTier) {
  const s = TIER_RANK[seedTier];
  const l = TIER_RANK[liveTier];
  if (!s || !l || s === l) return null;
  return l > s
    ? " This call currently reads higher than the published prior."
    : " This call currently reads lower than the published prior.";
}

// ---------------------------------------------------------------------------
// boringPrior — one tier-only, labeled sentence for the attorney UI.
// NEVER emits a dollar figure. Always carries the "published prior, not this
// firm's data" label and the decay note.
export function boringPrior({ caseType, valueTier } = {}) {
  const seed = seedFor(caseType);
  // Echo the id we actually resolved to (default row for unknown types).
  const resolvedType =
    caseType && SEED_PRIORS[caseType] ? caseType : DEFAULT_KEY;

  const divergence = divergencePhrase(seed.value_tier_seed, valueTier);

  return (
    `Published prior (not this firm's data): cases like this (${resolvedType}) ` +
    `typically land in ${tierPhrase(seed.value_tier_seed)}, with ` +
    `${dogPhrase(seed.dog_rate)}; ${settlePhrase(seed.settle_prob)}. ` +
    `Source: ${seed.source}.` +
    (divergence || "") +
    ` This is a published prior, not this firm's data, and it decays as the ` +
    `firm's own resolved cases accrue.`
  );
}
