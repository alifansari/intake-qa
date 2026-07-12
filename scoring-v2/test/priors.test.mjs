// Unit tests for the "boring prior" seed table + sentence builder.
// Compliance-first: tier language only, labeled, never a dollar. Zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_PRIORS, boringPrior } from "../lib/priors.mjs";

// Every case type the spec enumerates must have a seed row.
const LISTED_CASE_TYPES = [
  "mva_standard",
  "mva_commercial",
  "trucking",
  "rideshare",
  "premises",
  "dog_bite",
  "product",
  "med_mal",
  "motorcycle",
  "pedestrian_bicycle",
  "government_entity",
  "elder_abuse",
  "other_pi",
];

const VALID_TIERS = new Set(["high", "standard", "low", "indeterminate"]);
const VALID_DOG = new Set(["low", "moderate", "high", "unknown"]);
// Never a dollar: no "$", and no digit-adjacent currency pattern.
const DOLLAR_SIGN = /\$/;
const DIGIT_DOLLAR = /(\$\s*\d|\d[\d,.]*\s*(?:dollars?|usd))/i;

test("every listed case type has a SEED_PRIORS row with is_firm_data:false", () => {
  for (const ct of LISTED_CASE_TYPES) {
    const row = SEED_PRIORS[ct];
    assert.ok(row, `missing seed row for ${ct}`);
    assert.equal(row.is_firm_data, false, `${ct} must carry is_firm_data:false`);
    assert.ok(VALID_TIERS.has(row.value_tier_seed), `${ct} bad value_tier_seed`);
    assert.ok(VALID_DOG.has(row.dog_rate), `${ct} bad dog_rate`);
    assert.equal(row.settle_prob, "high", `${ct} settle_prob should be high`);
    assert.ok(typeof row.source === "string" && row.source.length > 0);
    assert.ok(["low", "medium"].includes(row.confidence), `${ct} bad confidence`);
  }
});

test("med_mal seed reads high value / high dog rate (capital-gated → refer)", () => {
  assert.equal(SEED_PRIORS.med_mal.value_tier_seed, "high");
  assert.equal(SEED_PRIORS.med_mal.dog_rate, "high");
});

test("mva_commercial and trucking both read high value / low dog rate", () => {
  for (const ct of ["mva_commercial", "trucking"]) {
    assert.equal(SEED_PRIORS[ct].value_tier_seed, "high");
    assert.equal(SEED_PRIORS[ct].dog_rate, "low");
  }
});

test("default / other_pi row abstains (indeterminate / unknown, low confidence)", () => {
  const row = SEED_PRIORS.other_pi;
  assert.equal(row.value_tier_seed, "indeterminate");
  assert.equal(row.dog_rate, "unknown");
  assert.equal(row.confidence, "low");
});

test("boringPrior returns a labeled tier-only string with no dollar figure", () => {
  for (const ct of LISTED_CASE_TYPES) {
    const s = boringPrior({ caseType: ct });
    assert.equal(typeof s, "string");
    assert.match(s, /published prior/i, `${ct} must be labeled`);
    assert.ok(s.includes(ct), `${ct} sentence should name the case type`);
    assert.ok(!DOLLAR_SIGN.test(s), `${ct} sentence leaked a "$"`);
    assert.ok(!DIGIT_DOLLAR.test(s), `${ct} sentence leaked a dollar figure`);
    assert.match(s, /decays/i, `${ct} sentence must state the decay condition`);
  }
});

test("unknown case type falls back to the default (other_pi) row", () => {
  const s = boringPrior({ caseType: "totally_made_up_type" });
  assert.match(s, /published prior/i);
  assert.match(s, /other_pi/, "unknown type should resolve to other_pi");
  assert.match(s, /indeterminate/i, "default row is indeterminate");
  assert.ok(!DOLLAR_SIGN.test(s));
});

test("boringPrior handles a missing/empty argument object", () => {
  const s = boringPrior();
  assert.equal(typeof s, "string");
  assert.match(s, /published prior/i);
  assert.match(s, /other_pi/);
});

test("a live valueTier diverging from the seed is noted in tier language only", () => {
  // premises seed is "standard"; a "high" live read should read higher.
  const higher = boringPrior({ caseType: "premises", valueTier: "high" });
  assert.match(higher, /reads higher/i);
  assert.ok(!DOLLAR_SIGN.test(higher));
  // med_mal seed is "high"; a "low" live read should read lower.
  const lower = boringPrior({ caseType: "med_mal", valueTier: "low" });
  assert.match(lower, /reads lower/i);
  // Matching tier → no divergence clause.
  const same = boringPrior({ caseType: "premises", valueTier: "standard" });
  assert.ok(!/reads higher|reads lower/i.test(same));
});

test("SEED_PRIORS is frozen (table and rows immutable)", () => {
  assert.ok(Object.isFrozen(SEED_PRIORS));
  assert.ok(Object.isFrozen(SEED_PRIORS.med_mal));
  assert.throws(() => {
    "use strict";
    SEED_PRIORS.med_mal.dog_rate = "low";
  }, TypeError);
  assert.equal(SEED_PRIORS.med_mal.dog_rate, "high");
});
