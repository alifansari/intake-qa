// Packaging + the structural flat-fee constraint (module 11 / invariant b).
// The REQUIRED guarantee: a pricing config that scales with case outcomes or
// case counts is unrepresentable — assertFlatFeeConfig hard-fails it before it
// can be persisted anywhere.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  assertFlatFeeConfig,
  PACKAGES,
  tierForVolume,
  guaranteeVerdict,
  FORBIDDEN_PRICING_KEYS,
} from "../billing/packaging.mjs";

test("assertFlatFeeConfig hard-fails every outcome-scaled pricing shape", () => {
  for (const key of FORBIDDEN_PRICING_KEYS) {
    assert.throws(
      () => assertFlatFeeConfig({ pricing_model: "flat_monthly", [key]: 50000 }),
      /flat monthly fee/,
      `expected '${key}' to be rejected`
    );
  }
  assert.throws(() => assertFlatFeeConfig({ pricing_model: "percent_of_recovery" }), /flat_monthly/);
  assert.throws(() => assertFlatFeeConfig({ base_monthly_cents: -100 }), /negative/);

  // Flat configs pass; an explicit zero on a forbidden key is tolerated (the
  // legacy billing_plans rows carry per_case_fee_cents = 0).
  assert.equal(assertFlatFeeConfig({ pricing_model: "flat_monthly", base_monthly_cents: 150000 }), true);
  assert.equal(assertFlatFeeConfig({ pricing_model: "flat_monthly", per_case_fee_cents: 0 }), true);
});

test("every shipped package is flat-monthly and the beta package is free + NDA-gated", () => {
  for (const pkg of Object.values(PACKAGES)) {
    assert.equal(assertFlatFeeConfig(pkg), true);
  }
  assert.equal(PACKAGES.beta.base_monthly_cents, 0);
  assert.ok(PACKAGES.beta.requires.includes("nda_signed"));
  assert.ok(PACKAGES.beta.requires.includes("icp_qualified"));
});

test("tierForVolume picks the flat tier by call volume", () => {
  assert.equal(tierForVolume(100).plan_name, "core");
  assert.equal(tierForVolume(400).plan_name, "core");
  assert.equal(tierForVolume(401).plan_name, "pro");
  assert.equal(tierForVolume(10000).plan_name, "pro");
});

test("guaranteeVerdict: find-cases-or-free is an evaluable state", () => {
  const met = guaranteeVerdict({
    ledgerSummary: { recoveredFeeCents: 1200000 },
    monthlyFeeCents: 150000,
  });
  assert.equal(met.met, true);
  assert.equal(met.outcome, "guarantee_met");

  const unmet = guaranteeVerdict({
    ledgerSummary: { recoveredFeeCents: 0 },
    monthlyFeeCents: 150000,
  });
  assert.equal(unmet.met, false);
  assert.equal(unmet.outcome, "month_one_free");
});
