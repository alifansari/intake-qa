// ============================================================================
// Escalation engine — trigger derivation + tiering. DETERMINISTIC, pure.
//
// Four trigger families over the canonical intake record:
//   case_value       — signals a potentially significant case (catastrophic
//                      treatment, clear liability + treatment)
//   time_decay       — deadlines eating the case: SOL near, government
//                      claims-notice window, perishable evidence (spoliation)
//   competitive_loss — the prospect is actively shopping other firms
//   human_judgment   — the machine knows it doesn’t know: low confidence,
//                      distress cues, "something else" matters
//
// Three tiers: hot (page someone now) > warm (same-day) > flagged (review).
//
// OVER-ESCALATION IS THE SAFE DEFAULT (spec): rules fire on partial signal;
// the Phase-5 tuning loop is the only sanctioned way to quiet them, and even
// it only PROPOSES — an attorney approves.
//
// PROTECTED triggers cannot be disabled or downgraded by firm config: a
// misconfigured dashboard must never silence a fatality or a claims-notice
// deadline. mergeConfig() enforces this; Phase 5 adds the deliberate,
// friction-ful loosening flow for them.
// ============================================================================

export const TIERS = ["hot", "warm", "flagged"];
const TIER_RANK = { hot: 0, warm: 1, flagged: 2 };

// The trigger registry. `derive` inspects a canonical intake record and
// returns truthy (optionally a reasons array) when the trigger fires.
export const TRIGGERS = [
  {
    key: "emergency",
    family: "human_judgment",
    tier: "hot",
    protected: true,
    description: "Visitor reported an active emergency / catastrophic injury",
    derive: (r) => r.incident?.emergency === "yes",
  },
  {
    key: "gov_claims_notice",
    family: "time_decay",
    tier: "hot",
    protected: true,
    description: "Government-entity defendant — claims-notice window (~6 months)",
    derive: (r) => r.path_data?.location_type === "government",
  },
  {
    key: "sol_near",
    family: "time_decay",
    tier: "hot",
    protected: true,
    description: "Filing window closes within 90 days",
    derive: (r) => r.routing?.sol?.status === "near",
  },
  {
    key: "evidence_decay",
    family: "time_decay",
    tier: "warm",
    protected: true, // spoliation is a protected family member (spec)
    description: "Perishable evidence — hazard still present and undocumented",
    derive: (r) =>
      r.path_data?.hazard_still_present === "still_there" &&
      !(r.path_data?.photos?.length > 0),
  },
  {
    key: "child_victim",
    family: "human_judgment",
    tier: "hot",
    protected: false,
    description: "Minor victim — handling and limitations differ",
    derive: (r) => r.path_data?.victim_is_child === "yes",
  },
  {
    key: "catastrophic_treatment",
    family: "case_value",
    tier: "warm",
    protected: false,
    description: "ER-level treatment reported",
    derive: (r) =>
      r.path_data?.treatment === "er" || r.path_data?.injury_severity === "er",
  },
  {
    key: "clear_liability_treated",
    family: "case_value",
    tier: "warm",
    protected: false,
    description: "Clear reported liability plus treated injury",
    derive: (r) =>
      r.matter_type === "mva" &&
      r.path_data?.fault === "other" &&
      r.path_data?.injured === "treated",
  },
  {
    key: "shopping_other_firms",
    family: "competitive_loss",
    tier: "warm",
    protected: false,
    description: "Prospect has already talked to another attorney (not signed)",
    derive: (r) => r.incident?.prior_representation === "talked",
  },
  {
    key: "distress_cues",
    family: "human_judgment",
    tier: "warm",
    protected: false,
    description: "Narrative interpreter flagged distress cues",
    derive: (r) => r.incident?.distress_cues === true,
  },
  {
    key: "low_confidence_routing",
    family: "human_judgment",
    tier: "flagged",
    protected: false,
    description: "Routing confidence below the gate — a person should look",
    derive: (r) =>
      Array.isArray(r.routing?.reasons) && r.routing.reasons.includes("low_confidence"),
  },
  {
    key: "other_matter",
    family: "human_judgment",
    tier: "flagged",
    protected: false,
    description: "Matter type outside the qualification paths",
    derive: (r) => r.matter_type === "other",
  },
];

const TRIGGER_BY_KEY = new Map(TRIGGERS.map((t) => [t.key, t]));
export function getTrigger(key) {
  return TRIGGER_BY_KEY.get(key) ?? null;
}

// Merge firm overrides into the registry defaults. Overrides shape:
//   { "<trigger_key>": { tier?, enabled?, loosened?: boolean } }
// PROTECTED triggers: disable is ignored, and a tier override may only move
// them UP (toward hot) — UNLESS the override carries `loosened: true`, which
// only the Phase-5 friction flow writes (typed confirmation phrase + named
// attorney approval). Ordinary config edits can never set it.
export function mergeConfig(overrides = {}) {
  const merged = new Map();
  for (const t of TRIGGERS) {
    const o = overrides?.[t.key] ?? {};
    let enabled = o.enabled !== false;
    let tier = TIERS.includes(o.tier) ? o.tier : t.tier;
    if (t.protected) {
      enabled = true; // cannot be silenced, loosened or not
      const isDowngrade = TIER_RANK[tier] > TIER_RANK[t.tier];
      if (isDowngrade && o.loosened !== true) tier = t.tier; // friction flow only
    }
    merged.set(t.key, { ...t, tier, enabled });
  }
  return merged;
}

/**
 * Derive the escalations a completed intake record should fire.
 * @param {object} record — canonical intake record
 * @param {object} overrides — firm_escalation_config.overrides
 * @returns {Array<{trigger_key:string, family:string, tier:string, protected:boolean, description:string}>}
 */
export function deriveEscalations(record, overrides = {}) {
  const config = mergeConfig(overrides);
  const out = [];
  for (const t of TRIGGERS) {
    const c = config.get(t.key);
    if (!c.enabled) continue;
    let fired = false;
    try {
      fired = Boolean(t.derive(record ?? {}));
    } catch {
      // A broken rule must never take down intake; over-escalate instead.
      fired = true;
    }
    if (fired) {
      out.push({
        trigger_key: t.key,
        family: t.family,
        tier: c.tier,
        protected: t.protected,
        description: t.description,
      });
    }
  }
  // Highest urgency first (hot → warm → flagged) for routing order.
  return out.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
}

// The single most urgent tier across a derivation (or null).
export function highestTier(escalations) {
  if (!escalations?.length) return null;
  return escalations.reduce(
    (best, e) => (TIER_RANK[e.tier] < TIER_RANK[best] ? e.tier : best),
    "flagged",
  );
}
