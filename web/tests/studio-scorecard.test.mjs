// Tests for the pure scorecard-content helpers: the dynamic disclosures (never
// hardcode n=1), ref_code format, and the single cited-excerpt exhibit picker.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  disclosures,
  generateRefCode,
  pickKeyExcerpt,
  SIGNATURE_ANALYST,
} from "../src/lib/studio/scorecard-content.mjs";

// --- Disclosures (dynamic call count) --------------------------------------
test("disclosures always includes all four non-deletable statements", () => {
  const d = disclosures(3);
  assert.ok(d.scope && d.independence && d.flatFee && d.limitation);
});

test("scope for 1 call says 'single' and 'not representative'", () => {
  const d = disclosures(1);
  assert.match(d.scope, /single intake call/);
  assert.match(d.scope, /not a representative, firm-wide/);
});

test("scope for N>1 calls states the actual number dynamically", () => {
  const d = disclosures(4);
  assert.match(d.scope, /4 intake calls/);
  assert.doesNotMatch(d.scope, /\bn=1\b/); // never the hardcoded n=1
});

// Hard rule #1: the audit output never uses "recording"/"recorded" language.
test("disclosures scope contains no recording/recorded language (hard rule #1)", () => {
  for (const n of [1, 2, 5]) {
    const d = disclosures(n);
    assert.doesNotMatch(d.scope, /record(ed|ing)/i);
  }
});

test("independence + flat-fee statements are outcome-neutral (compliance)", () => {
  const d = disclosures(2);
  assert.match(d.independence, /independent scorer/);
  assert.match(d.independence, /not a participant in the firm's fees/);
  assert.match(d.flatFee, /flat monthly fee/);
  // The flat-fee statement affirmatively DISAVOWS outcome-tied pricing (it names
  // and negates it) — that negation must be present.
  assert.match(d.flatFee, /Nothing here is priced as a percentage of recovery/);
  assert.match(d.flatFee, /tied to any case outcome/);
});

test("limitation is the AICPA-style statement", () => {
  const d = disclosures(1);
  assert.match(d.limitation, /did not conduct a comprehensive examination/);
  assert.match(d.limitation, /other matters might have come to my attention/);
});

// --- ref_code ---------------------------------------------------------------
test("ref_code matches SC-YYYYMMDD-XXXX", () => {
  const code = generateRefCode(new Date(Date.UTC(2026, 6, 8)));
  assert.match(code, /^SC-20260708-[0-9A-Z]{4}$/);
});

test("ref_code encodes the given date", () => {
  const code = generateRefCode(new Date(Date.UTC(2025, 0, 3)));
  assert.match(code, /^SC-20250103-/);
});

// --- Signature --------------------------------------------------------------
test("signature is the analyst of record", () => {
  assert.equal(SIGNATURE_ANALYST, "Ali Ansari, Analyst of Record");
});

// --- pickKeyExcerpt ---------------------------------------------------------
test("prefers a critical-fail quote", () => {
  const q = pickKeyExcerpt({
    critical_fails: [{ code: "CF-2", quote: "It's a slam dunk." }],
    alerts: { revenue_at_risk: { evidence_quotes: ["other"] } },
  });
  assert.equal(q, "It's a slam dunk.");
});

test("falls back to a revenue-at-risk evidence quote", () => {
  const q = pickKeyExcerpt({
    alerts: { revenue_at_risk: { evidence_quotes: ["The other driver admitted fault."] } },
  });
  assert.equal(q, "The other driver admitted fault.");
});

test("returns null when there is no evidence (never fabricates)", () => {
  assert.equal(pickKeyExcerpt({}), null);
  assert.equal(pickKeyExcerpt(null), null);
  assert.equal(pickKeyExcerpt({ alerts: { revenue_at_risk: { evidence_quotes: [] } } }), null);
});
