// Packaging + guarantee as product logic (module 11) and the structural
// flat-fee constraint (module 8 / invariant b).
//
// The tester journey is: beta (free, NDA-gated) -> free audit -> paid pilot ->
// flat monthly. Packages are CONFIG OBJECTS validated by assertFlatFeeConfig(),
// which makes outcome-scaled pricing UNREPRESENTABLE: any config with a
// per-case, per-signed, or percentage component hard-fails before it can be
// persisted (CA B&P §§6151-6152 runner/capper; CRPC 5.4; SB 37; AB 931 for
// contracts on/after Jan 1, 2026). billing/invoice.mjs enforces the same rule
// at invoice time; this enforces it at configuration time.
//
// NOTE(Ali): dollar amounts are founder-editable config, NOT decisions made
// here. ops/decisions.md (2026-07-07) locked Charter $1,500 / Core $2,500 /
// Pro $5,000, while the beta-program brief (2026-07-09) specifies a $600-$1,500
// monthly band by call volume. Both are flat-monthly (compliant); the numbers
// conflict. The tiers below carry the locked decision until you change it —
// pricing changes are a human-approval gate (compliance §VII).

export const FORBIDDEN_PRICING_KEYS = Object.freeze([
  "per_case_fee_cents",
  "per_signed_case_cents",
  "percent_of_recovery",
  "success_fee_cents",
  "per_outcome_fee_cents",
  "per_settlement_cents",
]);

// Hard-fail validator for ANY pricing/package config. Flat monthly only.
export function assertFlatFeeConfig(config, label = "pricing config") {
  for (const key of FORBIDDEN_PRICING_KEYS) {
    if (config?.[key] != null && Number(config[key]) !== 0) {
      throw new Error(
        `${label} rejected: '${key}' scales with case outcomes — pricing must be a flat monthly fee (B&P §§6151-6152 / CRPC 5.4 / SB 37)`
      );
    }
  }
  if (config?.pricing_model != null && config.pricing_model !== "flat_monthly") {
    throw new Error(`${label} rejected: pricing_model must be 'flat_monthly'`);
  }
  if (config?.base_monthly_cents != null && Number(config.base_monthly_cents) < 0) {
    throw new Error(`${label} rejected: negative base fee`);
  }
  return true;
}

// The packaging ladder. `access` names the gate a firm must have cleared;
// the beta package is free AND NDA-gated (invariant f).
export const PACKAGES = Object.freeze({
  beta: {
    key: "beta",
    label: "Beta tester",
    pricing_model: "flat_monthly",
    base_monthly_cents: 0,
    requires: ["icp_qualified", "nda_signed"],
    includes: ["intake_audit", "rescue_packets", "ledger", "feedback_loop"],
    plan_name: "beta", // billing_plans row seeded in migration 0021/0023
  },
  audit: {
    key: "audit",
    label: "Free intake audit",
    pricing_model: "flat_monthly",
    base_monthly_cents: 0,
    requires: [], // the public wedge (NDA applies only to beta testers)
    includes: ["intake_audit"],
    plan_name: "pilot",
  },
  pilot: {
    key: "pilot",
    label: "Paid pilot (month one, find-cases-or-free)",
    pricing_model: "flat_monthly",
    base_monthly_cents: 150000, // TODO(Ali): see pricing-conflict note above
    requires: ["audit_delivered"],
    includes: ["intake_audit", "rescue_packets", "ledger", "guarantee_find_cases_or_free"],
    plan_name: "charter",
    guarantee: { type: "find_it_free" }, // encoded + evaluated in billing/guarantee.mjs
  },
  monthly: {
    key: "monthly",
    label: "Flat monthly",
    pricing_model: "flat_monthly",
    // Volume-tiered but FLAT within a tier; month-to-month; no per-minute
    // overages — a firm over its band moves tiers next month, it is never
    // surcharged mid-month. Spanish module + CRM write-back are included or
    // tier-gated, NEVER per-case.
    tiers: [
      { max_monthly_calls: 400, base_monthly_cents: 250000, plan_name: "core" }, // TODO(Ali): pricing conflict
      { max_monthly_calls: null, base_monthly_cents: 500000, plan_name: "pro" },
    ],
    requires: ["pilot_converted_or_direct"],
    includes: ["intake_audit", "rescue_packets", "ledger", "coaching", "spanish_module_option", "crm_writeback"],
  },
});

// Validate the whole ladder at import time — a bad edit to this file fails
// tests immediately, not in production.
for (const pkg of Object.values(PACKAGES)) {
  assertFlatFeeConfig(pkg, `package '${pkg.key}'`);
  for (const tier of pkg.tiers ?? []) assertFlatFeeConfig(tier, `package '${pkg.key}' tier`);
}

// Pick the flat monthly tier for a call volume (module 11 packaging flow).
export function tierForVolume(monthlyCalls) {
  for (const tier of PACKAGES.monthly.tiers) {
    if (tier.max_monthly_calls == null || monthlyCalls <= tier.max_monthly_calls) return tier;
  }
  return PACKAGES.monthly.tiers.at(-1);
}

// "Find-cases-or-free" month-one guarantee as an evaluable state: did the paid
// pilot surface recoverable signable cases worth more than the fee? Pure —
// callers pass the ledger summary + the fee actually charged.
export function guaranteeVerdict({ ledgerSummary, monthlyFeeCents }) {
  const surfacedValueCents = Number(ledgerSummary?.recoveredFeeCents ?? 0);
  const met = surfacedValueCents > Number(monthlyFeeCents ?? 0);
  return {
    met,
    surfacedValueCents,
    monthlyFeeCents: Number(monthlyFeeCents ?? 0),
    outcome: met ? "guarantee_met" : "month_one_free",
  };
}
