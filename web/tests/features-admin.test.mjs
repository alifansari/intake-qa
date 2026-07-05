// Tests for the operator feature-toggle request validator (the logic behind the
// /api/admin/features route). Covers malformed input and unknown-feature
// rejection — the route stays thin and delegates here, so this is where the
// input-safety guarantees live.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateFeatureToggle } from "../admin/features-admin.mjs";
import { FEATURES } from "../features.mjs";

test("rejects a non-object body", () => {
  for (const bad of [null, undefined, "x", 42, true]) {
    const r = validateFeatureToggle(bad);
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
  }
});

test("requires a firm_id", () => {
  const r = validateFeatureToggle({ feature: FEATURES.LEAK_AUDIT, enabled: true });
  assert.equal(r.ok, false);
  assert.equal(r.status, 422);
});

test("rejects an unknown feature key", () => {
  const r = validateFeatureToggle({
    firm_id: 1,
    feature: "totally_made_up",
    enabled: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 422);
  assert.match(r.error, /unknown feature/);
});

test("rejects a non-boolean enabled", () => {
  const r = validateFeatureToggle({
    firm_id: 1,
    feature: FEATURES.BILLING,
    enabled: "yes",
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 422);
});

test("accepts a well-formed toggle and normalizes the value", () => {
  const r = validateFeatureToggle({
    firm_id: 7,
    feature: FEATURES.BENCHMARKS,
    enabled: false,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    firmId: 7,
    feature: FEATURES.BENCHMARKS,
    enabled: false,
  });
});

test("accepts a string firm_id (Postgres uuid firms)", () => {
  const r = validateFeatureToggle({
    firm_id: "a1b2-uuid",
    feature: FEATURES.SPANISH_INTAKE,
    enabled: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.firmId, "a1b2-uuid");
});
