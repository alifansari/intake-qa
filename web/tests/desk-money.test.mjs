// The desk's money math — the hero number that answers "where's the value?".
// Pure aggregation, no I/O. Pins the honesty rails: on-the-table excludes
// signed AND lost cases, won-back counts only signed, and a case with no
// sourced fee still COUNTS but contributes $0 (we never invent a value).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeMoney,
  fmtBigRange,
  fmtK,
  fmtKRange,
  ON_THE_TABLE_STATUSES,
  valueTier,
  tierBreakdown,
  VALUE_TIER,
} from "../src/lib/desk/money.mjs";

const leak = (status, feeLowCents, feeHighCents) => ({ status, feeLowCents, feeHighCents });

test("on-the-table sums active/winnable cases; excludes signed and lost", () => {
  const { onTheTable } = summarizeMoney([
    leak("needs_callback", 1_000_00, 3_000_00),
    leak("reached_out", 2_000_00, 4_000_00),
    leak("back_in_touch", 500_00, 1_500_00),
    leak("signed", 9_000_00, 9_000_00), // won, not on the table
    leak("didnt_sign", 9_000_00, 9_000_00), // lost, excluded
    leak("bad_number", 9_000_00, 9_000_00), // lost, excluded
  ]);
  assert.equal(onTheTable.count, 3);
  assert.equal(onTheTable.lowCents, 3_500_00);
  assert.equal(onTheTable.highCents, 8_500_00);
});

test("won-back counts only signed cases", () => {
  const { wonBack } = summarizeMoney([
    leak("signed", 1_000_00, 2_000_00),
    leak("signed", 3_000_00, 5_000_00),
    leak("needs_callback", 9_000_00, 9_000_00),
  ]);
  assert.equal(wonBack.count, 2);
  assert.equal(wonBack.lowCents, 4_000_00);
  assert.equal(wonBack.highCents, 7_000_00);
});

test("a null status counts as on-the-table (untouched)", () => {
  const { onTheTable } = summarizeMoney([leak(null, 1_000_00, 2_000_00)]);
  assert.equal(onTheTable.count, 1);
  assert.equal(onTheTable.lowCents, 1_000_00);
});

test("a case with no sourced fee still COUNTS but adds $0", () => {
  const { onTheTable } = summarizeMoney([
    leak("needs_callback", null, null),
    leak("needs_callback", 1_000_00, 2_000_00),
  ]);
  assert.equal(onTheTable.count, 2); // both counted
  assert.equal(onTheTable.valued, 1); // only one had a sourced value
  assert.equal(onTheTable.lowCents, 1_000_00); // unsourced one added nothing
});

test("empty / non-array input is safe", () => {
  const z = summarizeMoney(undefined);
  assert.equal(z.onTheTable.count, 0);
  assert.equal(z.wonBack.count, 0);
});

test("fmtBigRange is whole-dollar, range-only, en-dash joined", () => {
  assert.equal(fmtBigRange(34_000_00, 81_000_00), "$34,000–$81,000");
  assert.equal(fmtBigRange(0, 0), "$0");
  assert.equal(fmtBigRange(5_000_00, 5_000_00), "$5,000"); // equal low/high collapses
});

test("fmtK is compact k-notation; exact under $1,000", () => {
  assert.equal(fmtK(25_000_00), "$25k");
  assert.equal(fmtK(120_000_00), "$120k");
  assert.equal(fmtK(1_200_00), "$1.2k");
  assert.equal(fmtK(800_00), "$800");
  assert.equal(fmtK(0), "$0");
});

test("fmtKRange collapses equal low/high", () => {
  assert.equal(fmtKRange(25_000_00, 60_000_00), "$25k–$60k");
  assert.equal(fmtKRange(25_000_00, 25_000_00), "$25k");
});

test("status set is the winnable trio", () => {
  assert.ok(ON_THE_TABLE_STATUSES.has("needs_callback"));
  assert.ok(!ON_THE_TABLE_STATUSES.has("signed"));
});

// B-022 — value TIER replaces the estimated dollar on the callback surfaces.
test("valueTier bands the fee-value high end (tunable thresholds)", () => {
  assert.equal(valueTier(45_000_00).key, "high"); // commercial MVA / catastrophic
  assert.equal(valueTier(150_000_00).key, "high"); // wrongful death
  assert.equal(valueTier(35_000_00).key, "high"); // exactly at the high floor
  assert.equal(valueTier(18_000_00).key, "standard"); // premises
  assert.equal(valueTier(8_000_00).key, "standard"); // at the standard floor
  assert.equal(valueTier(4_000_00).key, "modest"); // minor
});

test("valueTier returns null when no fee value is sourced (no basis, no claim)", () => {
  assert.equal(valueTier(0), null);
  assert.equal(valueTier(null), null);
  assert.equal(valueTier(undefined), null);
  assert.equal(valueTier(NaN), null);
});

test("VALUE_TIER labels are firm-facing and stable", () => {
  assert.equal(VALUE_TIER.high.label, "High-value");
  assert.equal(VALUE_TIER.standard.label, "Standard-value");
  assert.equal(VALUE_TIER.modest.label, "Modest-value");
});

test("tierBreakdown counts ONLY on-the-table cases by tier; unsourced don't count", () => {
  const leaks = [
    leak("needs_callback", 20_000_00, 45_000_00), // high
    leak("reached_out", 6_000_00, 18_000_00), // standard
    leak("back_in_touch", 1_000_00, 4_000_00), // modest
    leak("signed", 20_000_00, 45_000_00), // excluded (won-back, not on table)
    leak("didnt_sign", 20_000_00, 45_000_00), // excluded (lost)
    leak("needs_callback", null, null), // on table but unsourced → no tier
  ];
  assert.deepEqual(tierBreakdown(leaks), { high: 1, standard: 1, modest: 1 });
});
