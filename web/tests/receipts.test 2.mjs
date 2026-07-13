// Tests for the audit-product Recovered Receipts composer. The disciplines
// under test: firm's-own-number-or-nothing (§IV), misses on the receipt, honest
// attribution (only what the caller passes as unactioned-then-recovered), and a
// plain ROI multiple that is never a percentage or an outcome guarantee.

import { test } from "node:test";
import assert from "node:assert/strict";

import { composeReceipts, receiptHeadline } from "../src/lib/desk/receipts.mjs";

test("no average fee set -> counts only, no dollar lines (§IV)", () => {
  const r = composeReceipts({
    period: "2026-07",
    flagged: 12,
    recovered: [{ id: 1 }, { id: 2 }],
    stillOpen: 3,
    lostAnyway: 1,
    settings: {},
  });
  assert.equal(r.dollars, null, "no fee -> no invented valuation");
  assert.equal(r.roi, null, "no dollars -> no ROI");
  assert.equal(r.recovered.count, 2);
  assert.deepEqual(r.recovered.ids, [1, 2]);
  assert.equal(receiptHeadline(r), "2 signable cases won back");
});

test("with a firm fee -> dollars use the firm's own number, with inputs printed", () => {
  const r = composeReceipts({
    period: "2026-07",
    flagged: 10,
    recovered: [{ id: 1 }, { id: 2 }, { id: 3 }],
    settings: { average_case_fee: 9000 },
  });
  assert.equal(r.dollars.recovered_value, 27000);
  assert.equal(r.dollars.average_case_fee, 9000);
  assert.match(r.dollars.inputs_note, /3 cases you won back × \$9,000/);
  assert.equal(receiptHeadline(r), "3 signable cases won back — about $27,000 in projected fees");
});

test("misses are on the receipt (lost_anyway + still_open surfaced)", () => {
  const r = composeReceipts({
    period: "2026-07",
    flagged: 8,
    recovered: [{ id: 1 }],
    stillOpen: 4,
    lostAnyway: 3,
    settings: { average_case_fee: 5000 },
  });
  assert.equal(r.still_open, 4);
  assert.equal(r.lost_anyway, 3);
});

test("ROI is a plain multiple of the flat fee, never a percentage or guarantee (§I/§IV)", () => {
  const r = composeReceipts({
    period: "2026-07",
    recovered: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    settings: { average_case_fee: 6000 }, // 24000 recovered
    subscription: 1500,
  });
  assert.equal(r.roi.multiple, 16); // 24000 / 1500
  assert.match(r.roi.note, /estimate/);
  assert.match(r.roi.note, /not a guarantee/, "the note explicitly disclaims a guarantee");
  assert.doesNotMatch(r.roi.note, /% of/i, "never a percentage-of-recovery framing (§I)");
});

test("ROI is null when there is no dollar figure (no fee) even if subscription is given", () => {
  const r = composeReceipts({
    period: "2026-07",
    recovered: [{ id: 1 }],
    settings: {},
    subscription: 1500,
  });
  assert.equal(r.roi, null);
});

test("recoveredRange -> a low–high fee estimate from the case-type bands (the desk's model)", () => {
  const r = composeReceipts({
    period: "2026-07",
    recovered: [{ id: 1 }, { id: 2 }],
    recoveredRange: { lowCents: 3_000_000, highCents: 8_100_000 }, // $30k–$81k
    settings: {},
  });
  assert.equal(r.dollars.kind, "range");
  assert.equal(r.dollars.low, 30000);
  assert.equal(r.dollars.high, 81000);
  assert.equal(receiptHeadline(r), "2 signable cases won back — about $30,000–$81,000 in projected fees");
});

test("recoveredRange takes precedence over a stated average fee", () => {
  const r = composeReceipts({
    period: "2026-07",
    recovered: [{ id: 1 }],
    recoveredRange: { lowCents: 1_000_000, highCents: 2_000_000 },
    settings: { average_case_fee: 9999 },
  });
  assert.equal(r.dollars.kind, "range");
});

test("singular grammar for a single recovered case", () => {
  const r = composeReceipts({
    period: "2026-07",
    recovered: [{ id: 1 }],
    settings: { average_case_fee: 8000 },
  });
  assert.match(r.dollars.inputs_note, /1 case you won back/);
  assert.equal(receiptHeadline(r), "1 signable case won back — about $8,000 in projected fees");
});
