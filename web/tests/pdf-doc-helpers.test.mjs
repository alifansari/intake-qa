// Tests for the pure PDF document helpers (formatting, statute phrasing, IDs,
// reconciliation, verbatim blocks). The .tsx templates render these; rendering
// itself is verified against the live route. Additive; no frozen-core impact.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fmtMoney,
  fmtMoneyRange,
  fmtDate,
  statuteClock,
  statuteBand,
  reconciles,
  trendVerdict,
  statementId,
  readoutId,
  ATTESTATION,
  SAVE_STATUSES,
} from "../src/pdf/doc-helpers.mjs";

test("money: no cents, thousands separators, en-dash ranges", () => {
  assert.equal(fmtMoney(1800000), "$18,000");
  assert.equal(fmtMoneyRange(1800000, 4500000), "$18,000–$45,000");
});

test("dates render as Mon D, YYYY", () => {
  assert.equal(fmtDate("2026-07-05"), "Jul 5, 2026");
  assert.equal(fmtDate("2026-06-30"), "Jun 30, 2026");
});

test("statute clock: months normally, days + time-sensitive under 90", () => {
  assert.equal(statuteClock(690), "Statute: ~23 months remaining (est.)");
  assert.equal(statuteClock(40), "Statute: ~40 days remaining (est.) – time-sensitive");
  assert.equal(statuteBand(690), "neutral");
  assert.equal(statuteBand(120), "amber");
  assert.equal(statuteBand(40), "red");
});

test("reconciliation invariant helper", () => {
  assert.equal(reconciles({ received: 132, processed: 128, excluded: 3, failed: 1 }), true);
  assert.equal(reconciles({ received: 132, processed: 128, excluded: 3, failed: 0 }), false);
});

test("trend verdict is one word", () => {
  assert.equal(trendVerdict(78, 84), "declined");
  assert.equal(trendVerdict(88, 86), "improved");
  assert.equal(trendVerdict(61, 61), "held");
  assert.equal(trendVerdict(90, null), "held");
});

test("document IDs are zero-padded", () => {
  assert.equal(statementId("SUNSET", 2026, 3), "SUNSET-2026-03");
  assert.equal(readoutId("SUNSET", 2026, 3), "SUNSET-LA-2026-03");
});

test("attestation disclaims reserved terms and any recovery guarantee", () => {
  // It must explicitly disclaim being an audit/accounting engagement/financial statement,
  // and must frame estimates as NOT a guarantee of outcome or recovery.
  assert.match(ATTESTATION, /not an audit, an accounting engagement, a financial statement, or legal advice/);
  assert.match(ATTESTATION, /not as a guarantee of outcome or recovery/);
});

test("save-status vocabulary is the finalized fixed set", () => {
  assert.deepEqual(SAVE_STATUSES, [
    "Draft ready",
    "Sent by staff",
    "Contact resumed",
    "Signed",
    "Declined",
    "Statute lapsed",
  ]);
});
