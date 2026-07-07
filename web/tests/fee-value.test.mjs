// Tests for the estimated-fee-value math (item 12): case value × contingency,
// ranges only, matching the METHODOLOGY.md worked example.

import { test } from "node:test";
import assert from "node:assert/strict";
import { feeRangeCents, feeRangeFromRow, feeBandFromPoint, DEFAULT_CONTINGENCY, DEFAULT_SPREAD_FACTOR } from "../analysis/fee-value.mjs";

test("default contingency is 33 1/3%", () => {
  assert.ok(Math.abs(DEFAULT_CONTINGENCY - 1 / 3) < 1e-9);
});

test("worked example: $18,000–$45,000 case at 33 1/3% -> $6,000–$15,000 fee", () => {
  const r = feeRangeCents(1_800_000, 4_500_000);
  assert.equal(r.lowCents, 600_000); // $6,000
  assert.equal(r.highCents, 1_500_000); // $15,000
});

test("a firm's own contingency overrides the default", () => {
  const r = feeRangeCents(1_800_000, 4_500_000, 0.4);
  assert.equal(r.lowCents, 720_000); // $7,200
  assert.equal(r.highCents, 1_800_000); // $18,000
});

test("always returns low <= high (a range, never a point)", () => {
  const r = feeRangeFromRow({ low_cents: 5_000_000, high_cents: 1_500_000 });
  assert.ok(r.lowCents <= r.highCents);
});

test("null row -> null", () => {
  assert.equal(feeRangeFromRow(null), null);
});

test("feeBandFromPoint: point -> conservative LOW anchor, widened to a band", () => {
  const b = feeBandFromPoint(1_200_000); // $12,000 point fee
  assert.equal(b.feeLowCents, 1_200_000); // point is the low
  assert.equal(b.feeHighCents, Math.round(1_200_000 * DEFAULT_SPREAD_FACTOR)); // 2.5x
  assert.ok(b.feeHighCents > b.feeLowCents); // a range, never a point
  // Reconstructed case-value band = fee / contingency.
  assert.equal(b.caseLowCents, Math.round(1_200_000 / DEFAULT_CONTINGENCY));
  assert.equal(b.caseHighCents, Math.round(b.feeHighCents / DEFAULT_CONTINGENCY));
});

test("feeBandFromPoint: zero/garbage point degrades to a zero band", () => {
  const b = feeBandFromPoint(0);
  assert.equal(b.feeLowCents, 0);
  assert.equal(b.feeHighCents, 0);
});
