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
