// Unit tests: date-indexed CA statutory constants. Pure, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STATUTES,
  PRACTITIONER_SEEDS,
  solTable,
  autoMinLimits,
  micraNoneconomicCap,
  rideshareCoverage,
  survivalNoneconomicAllowed,
  limitedCivilCeiling,
  fmcsaFloor,
  parseYear,
} from "../lib/statutes.mjs";

test("auto minimums branch on policy/loss date (SB 1107)", () => {
  assert.equal(autoMinLimits({ policyOrLossDateISO: "2024-06-01" }).per_person, 15000);
  assert.equal(autoMinLimits({ policyOrLossDateISO: "2025-06-01" }).per_person, 30000);
  assert.equal(autoMinLimits({ policyOrLossDateISO: "2025-06-01" }).per_accident, 60000);
  assert.equal(autoMinLimits({ policyOrLossDateISO: "2036-01-01" }).per_person, 50000);
  // Unknown date defaults to current law, flagged date_known:false.
  const dflt = autoMinLimits({});
  assert.equal(dflt.per_person, 30000);
  assert.equal(dflt.date_known, false);
});

test("MICRA cap follows the AB 35 resolution-year schedule", () => {
  assert.equal(micraNoneconomicCap({ resolutionYear: 2023, kind: "injury" }).amount, 350000);
  assert.equal(micraNoneconomicCap({ resolutionYear: 2026, kind: "injury" }).amount, 470000);
  assert.equal(micraNoneconomicCap({ resolutionYear: 2026, kind: "death" }).amount, 650000);
  assert.equal(micraNoneconomicCap({ resolutionYear: 2033, kind: "injury" }).amount, 750000);
  assert.equal(micraNoneconomicCap({ resolutionYear: 2033, kind: "death" }).amount, 1000000);
  // 2034 = plateau + 2%.
  assert.equal(micraNoneconomicCap({ resolutionYear: 2034, kind: "injury" }).amount, 765000);
  // Pre-2023 filings stay at the old flat cap.
  assert.equal(micraNoneconomicCap({ resolutionYear: 2022, kind: "injury" }).amount, 250000);
  // Default (no year) = 2026.
  assert.equal(micraNoneconomicCap({}).amount, 470000);
});

test("rideshare coverage branches on period + at-fault party + date", () => {
  assert.equal(rideshareCoverage({ period: "unknown", atFaultParty: "unknown" }).branch, "abstain");
  assert.equal(
    rideshareCoverage({ period: "enroute_or_passenger", atFaultParty: "rideshare_driver" }).branch,
    "liability_1m"
  );
  // Passenger, uninsured third party, post-2026 crash → $60k/$300k cap.
  const capped = rideshareCoverage({
    period: "enroute_or_passenger",
    atFaultParty: "third_party",
    crashDateISO: "2026-03-01",
  });
  assert.equal(capped.branch, "umuim_capped");
  assert.equal(capped.per_person, 60000);
  // Same facts, pre-2026 crash → $1M UM/UIM still applies.
  const legacy = rideshareCoverage({
    period: "enroute_or_passenger",
    atFaultParty: "third_party",
    crashDateISO: "2025-06-01",
  });
  assert.equal(legacy.branch, "umuim_1m");
  assert.equal(rideshareCoverage({ period: "on_waiting", atFaultParty: "third_party" }).branch, "period1");
});

test("survival non-economic follows the SB 447 sunset with elder-abuse carve-out", () => {
  assert.equal(survivalNoneconomicAllowed({ filingDateISO: "2024-06-01" }).allowed, true);
  assert.equal(survivalNoneconomicAllowed({ filingDateISO: "2026-03-01" }).allowed, false);
  // Elder abuse is exempt regardless of filing date.
  assert.equal(survivalNoneconomicAllowed({ filingDateISO: "2026-03-01", elderAbuse: true }).allowed, true);
  // Unknown date defaults to current (post-sunset) law.
  assert.equal(survivalNoneconomicAllowed({}).allowed, false);
});

test("limited civil ceiling is $35k via SB 71 (not AB 2347)", () => {
  const c = limitedCivilCeiling();
  assert.equal(c.amount, 35000);
  assert.match(c.bill, /SB 71/);
});

test("FMCSA floor keys off cargo type", () => {
  assert.equal(fmcsaFloor({ cargoType: "general" }).amount, 750000);
  assert.equal(fmcsaFloor({ cargoType: "hazmat" }).amount, 5000000);
  assert.equal(fmcsaFloor({ passenger: true, seatsOver15: true }).amount, 5000000);
});

test("practitioner seeds are labeled not-firm-data", () => {
  assert.equal(PRACTITIONER_SEEDS.is_firm_data, false);
  assert.equal(PRACTITIONER_SEEDS.prior_attorney_walk_count, 2);
  assert.equal(PRACTITIONER_SEEDS.mist_pd_low_ceiling, 1500);
});

test("SOL table is flags-only descriptors and STATUTES is frozen", () => {
  assert.equal(solTable.med_mal.years, 1);
  assert.equal(solTable.government_entity.months, 6);
  assert.throws(() => {
    "use strict";
    STATUTES.micra = {};
  });
});

test("parseYear handles ISO, bare year, and null", () => {
  assert.equal(parseYear("2026-01-01").year, 2026);
  assert.equal(parseYear(2030).year, 2030);
  assert.equal(parseYear(null), null);
});
