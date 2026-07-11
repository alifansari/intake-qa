// Tests for the AuditReport -> DocData bridge that powers the real (non-demo)
// Readout + Leak Report PDFs. Pure function; no I/O.
//
// Covers the P0-B (citations: no citation, no claim -> drop the fact) and P0-C
// (fee RANGES, never a point estimate) upgrades.

import { test } from "node:test";
import assert from "node:assert/strict";
import { auditReportToDocData } from "../src/lib/documents/from-audit.mjs";

const sampleReport = {
  ok: true,
  summary: { callsReviewed: 3, leakedSignable: 2, totalFeeAtRisk: 21000 },
  calls: [
    {
      status: "done",
      leaked: true,
      feeAtRisk: 12000,
      signabilityScore: 90,
      // Bare-string quotes with NO citation source -> must be DROPPED (§IV).
      evidenceQuotes: ["Driver admitted fault", "Treating twice a week", "No callback scheduled"],
      summary: "Strong rear-end PNC, no ask.",
      sol: { daysRemaining: 20, urgency: "critical", deadlineDate: "2026-08-15" },
      // Stored transcript citations for TWO of the three quotes.
      citations: [
        { verbatim_snippet: "Driver admitted fault", start_ms: 192000 },
        { verbatim_snippet: "Treating twice a week", start_ms: 341000 },
      ],
    },
    {
      status: "done",
      leaked: true,
      feeAtRisk: 9000,
      signabilityScore: 62,
      evidenceQuotes: ["Slipped on wet floor"], // no citation -> dropped
      sol: { daysRemaining: 700, urgency: "ok" },
    },
    { status: "done", leaked: false, feeAtRisk: 0, signabilityScore: 20 }, // not leaked → excluded
    { status: "error" }, // failed → counted in reconciliation.failed only
  ],
};

test("fee is a RANGE (low<high), never a point estimate; low = engine point anchor", () => {
  const doc = auditReportToDocData(sampleReport, { issuedDate: "2026-07-06" });
  const [a] = doc.leaks;
  assert.equal(a.feeLowCents, 1200000); // $12,000 point -> conservative low
  assert.ok(a.feeHighCents > a.feeLowCents); // widened to a band
  assert.equal(a.feeHighCents, 3000000); // 2.5x default spread
  assert.ok(a.caseLowCents > a.feeLowCents); // reconstructed case value > fee
  assert.ok(typeof a.feeDerivation === "string" && a.feeDerivation.includes("case value"));
});

test("qualifying facts carry a real [mm:ss] cite; uncited quotes are DROPPED (§IV)", () => {
  const doc = auditReportToDocData(sampleReport, {});
  const [a, b] = doc.leaks;
  // Two of three quotes had citations -> two cited facts; the third dropped.
  assert.equal(a.qualifyingFacts.length, 2);
  assert.equal(a.qualifyingFacts[0].cite, "[03:12]"); // 192000ms -> 03:12
  assert.equal(a.qualifyingFacts[1].cite, "[05:41]"); // 341000ms -> 05:41
  assert.ok(a.qualifyingFacts.every((f) => f.cite && f.cite.trim() !== ""));
  // Second call had a quote but no citation -> zero facts (never cite:"").
  assert.equal(b.qualifyingFacts.length, 0);
});

test("confidence + severity still map from score/statute", () => {
  const doc = auditReportToDocData(sampleReport, {});
  const [a, b] = doc.leaks;
  assert.equal(a.confidence, "strong"); // 90 >= 75
  assert.equal(a.severity, "critical"); // 20 days
  assert.equal(a.statuteDays, 20);
  assert.equal(a.deadlineDate, "2026-08-15");
  assert.equal(a.callerInitials, "—"); // anonymized
  assert.equal(b.confidence, "moderate"); // 62 < 75
  assert.equal(b.severity, "awareness"); // 700 days
});

test("quotes carrying inline timing ({quote, timestamp}) are cited directly", () => {
  const report = {
    ok: true,
    summary: { callsReviewed: 1, totalFeeAtRisk: 6000 },
    calls: [
      {
        status: "done",
        leaked: true,
        feeAtRisk: 6000,
        signabilityScore: 88,
        evidenceQuotes: [{ quote: "You've got years for this", timestamp: "00:38-01:10" }],
        sol: { daysRemaining: 30, urgency: "critical" },
      },
    ],
  };
  const doc = auditReportToDocData(report, {});
  assert.equal(doc.leaks[0].qualifyingFacts.length, 1);
  assert.equal(doc.leaks[0].qualifyingFacts[0].cite, "[00:38]"); // first of the range
});

test("reconciliation reconciles: received = processed + excluded + failed", () => {
  const doc = auditReportToDocData(sampleReport, {});
  const r = doc.reconciliation;
  // 4 calls attached: 3 done (2 leaked + 1 not-leaked) + 1 errored.
  // received is the TRUE total, so the identity actually balances (was 3=3+0+1
  // before — a false equation on the "every call accounted for" table).
  assert.equal(r.received, 4);
  assert.equal(r.processed, 3);
  assert.equal(r.failed, 1);
  assert.equal(r.excluded, 0);
  assert.equal(r.received, r.processed + r.excluded + r.failed); // genuinely balances
});

test("statement headline = arithmetic sum of the derived per-leak fee bands", () => {
  const doc = auditReportToDocData(sampleReport, {});
  // low = 1,200,000 + 900,000 ; high = 3,000,000 + 2,250,000
  assert.equal(doc.missedLowCents, 2100000);
  assert.equal(doc.missedHighCents, 5250000);
  assert.equal(doc.leaksFlagged, 2);
});

test("empty / missing report degrades safely", () => {
  const doc = auditReportToDocData({}, {});
  assert.equal(doc.leaks.length, 0);
  assert.deepEqual(doc.reconciliation, { received: 0, processed: 0, excluded: 0, failed: 0 });
  assert.equal(doc.firmName, "Your intake calls");
  assert.equal(doc.metrics.length, 0);
  assert.equal(doc.missedLowCents, 0);
  assert.equal(doc.missedHighCents, 0);
});
