// The monthly statement composer: real firm flags → DocData, using the desk's
// own case types and the vetted fee source (so statement == desk on dollars).

import { test } from "node:test";
import assert from "node:assert/strict";
import { composeMonthlyStatement } from "../src/lib/documents/from-firm-month.mjs";

// Mirrors the desk's fee: "Auto accident" case value $18k-$45k × 33⅓% = $6k-$15k.
const feeRangeFor = (ct) =>
  ct === "Auto accident" ? { lowCents: 600000, highCents: 1500000 } : null;

const flags = [
  {
    id: "abcd1234",
    case_type: "Auto accident",
    caller_name: "Jordan Rivera",
    received_at: "2026-06-08T10:00:00Z",
    confidence_tier: "strong",
    save_status: "needs_callback",
    reason: "Rear-ended; treating; no callback.",
    citations: [{ verbatim_snippet: "the other driver admitted fault", start_ms: 192000 }],
  },
  {
    id: "efgh5678",
    case_type: "Auto accident",
    caller_name: "Maria Ortiz",
    received_at: "2026-06-20T10:00:00Z",
    confidence_tier: "moderate",
    save_status: "reached_out", // left a message → a save in progress
    reason: "Low-speed collision; unsure of injury.",
    citations: [],
  },
  {
    id: "ijkl9012",
    case_type: "Product liability", // unmapped → no fee, shows type only
    caller_name: "Sam Lee",
    received_at: "2026-06-25T10:00:00Z",
    confidence_tier: "strong",
    save_status: "signed", // terminal → resolved
    reason: "Defective ladder.",
    citations: [],
  },
];

test("statement fee matches the desk (vetted range × contingency), sums the range", () => {
  const doc = composeMonthlyStatement({
    firm: { id: "1", name: "Sunset & Vine Injury Law", code: "SUNSET" },
    flags,
    feeRangeFor,
    period: { label: "June 2026", start: "2026-06-01", end: "2026-06-30", year: 2026, seq: 6 },
    issuedDate: "2026-07-01",
  });
  // Two Auto accident flags at $6k-$15k each; Product liability contributes $0 (no fabricated fee).
  assert.equal(doc.missedLowCents, 1200000);
  assert.equal(doc.missedHighCents, 3000000);
  assert.equal(doc.leaksFlagged, 3);
  assert.equal(doc.savesInProgress, 1); // the reached_out one
  assert.equal(doc.resolvedCount, 1); // the signed one
});

test("unmapped case type shows the type but no fabricated fee/derivation (§IV)", () => {
  const doc = composeMonthlyStatement({
    firm: { name: "F" }, flags, feeRangeFor,
    period: { label: "June 2026", year: 2026, seq: 6 }, issuedDate: "2026-07-01",
  });
  const prod = doc.leaks.find((l) => l.caseType === "Product liability");
  assert.equal(prod.feeLowCents, 0);
  assert.equal(prod.feeDerivation, null);
  assert.equal(prod.caseLowCents, undefined); // no invented case-value band
});

test("qualifying facts carry a real [mm:ss] cite; uncited flags carry none", () => {
  const doc = composeMonthlyStatement({
    firm: { name: "F" }, flags, feeRangeFor,
    period: { label: "June 2026", year: 2026, seq: 6 }, issuedDate: "2026-07-01",
  });
  assert.equal(doc.leaks[0].qualifyingFacts.length, 1);
  assert.equal(doc.leaks[0].qualifyingFacts[0].cite, "[03:12]"); // 192000ms
  assert.equal(doc.leaks[1].qualifyingFacts.length, 0); // no citations
});

test("reconciliation defaults balance when not supplied", () => {
  const doc = composeMonthlyStatement({
    firm: { name: "F" }, flags, feeRangeFor,
    period: { label: "June 2026", year: 2026, seq: 6 }, issuedDate: "2026-07-01",
  });
  const r = doc.reconciliation;
  assert.equal(r.received, r.processed + r.excluded + r.failed);
});
