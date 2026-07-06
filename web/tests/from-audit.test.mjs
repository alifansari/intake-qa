// Tests for the AuditReport -> DocData bridge that powers the real (non-demo)
// Readout + Leak Report PDFs. Pure function; no I/O.

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
      evidenceQuotes: ["Driver admitted fault", "Treating twice a week", "No callback scheduled"],
      summary: "Strong rear-end PNC, no ask.",
      sol: { daysRemaining: 20, urgency: "critical", deadlineDate: "2026-08-15" },
    },
    {
      status: "done",
      leaked: true,
      feeAtRisk: 9000,
      signabilityScore: 62,
      evidenceQuotes: ["Slipped on wet floor"],
      sol: { daysRemaining: 700, urgency: "ok" },
    },
    { status: "done", leaked: false, feeAtRisk: 0, signabilityScore: 20 }, // not leaked → excluded
    { status: "error" }, // failed → counted in reconciliation.failed only
  ],
};

test("maps only leaked+done calls into leaks, with cents + confidence + severity", () => {
  const doc = auditReportToDocData(sampleReport, { issuedDate: "2026-07-06" });
  assert.equal(doc.leaks.length, 2);
  const [a, b] = doc.leaks;
  assert.equal(a.feeLowCents, 1200000); // $12,000 -> cents
  assert.equal(a.feeHighCents, 1200000);
  assert.equal(a.confidence, "strong"); // 90 >= 75
  assert.equal(a.severity, "critical"); // 20 days ≤ 30
  assert.equal(a.statuteDays, 20);
  assert.equal(a.deadlineDate, "2026-08-15");
  assert.equal(a.qualifyingFacts.length, 3);
  assert.equal(a.callerInitials, "—"); // anonymized
  assert.equal(b.confidence, "moderate"); // 62 < 75
  assert.equal(b.severity, "awareness"); // 700 days
});

test("reconciliation reconciles: received = processed + excluded + failed", () => {
  const doc = auditReportToDocData(sampleReport, {});
  const r = doc.reconciliation;
  assert.equal(r.received, 3); // summary.callsReviewed
  assert.equal(r.processed, 3); // done calls
  assert.equal(r.failed, 1);
  assert.equal(r.excluded, 0); // max(0, 3 - 3 - 1)
});

test("headline missed value comes from summary.totalFeeAtRisk in cents", () => {
  const doc = auditReportToDocData(sampleReport, {});
  assert.equal(doc.missedLowCents, 2100000); // $21,000
  assert.equal(doc.leaksFlagged, 2);
});

test("empty / missing report degrades safely", () => {
  const doc = auditReportToDocData({}, {});
  assert.equal(doc.leaks.length, 0);
  assert.deepEqual(doc.reconciliation, { received: 0, processed: 0, excluded: 0, failed: 0 });
  assert.equal(doc.firmName, "Your intake calls");
  assert.equal(doc.metrics.length, 0);
});
