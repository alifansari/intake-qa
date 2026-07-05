// Tests for the Leak Audit backend (Phase 1): the honest aggregation math, the
// projection with/without a supplied call volume, the 10-call session cap, the
// 7-day per-fingerprint session cap, expiry, and end-to-end report building —
// all on demo-isolated tables (no firm data ever touched).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  aggregateAudit,
  normalizeVolume,
  startAuditSession,
  addCallToAuditSession,
  buildAuditReport,
  resolveSession,
  expireAuditSessions,
  DEFAULT_MONTHLY_VOLUME,
  MAX_CALLS_PER_SESSION,
} from "../ingest/audit.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-audit-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

// Insert a completed demo_calls row carrying a result_json, return its id.
function makeDoneDemoCall(db, result, filename = "call.mp3") {
  const info = db
    .prepare(
      `INSERT INTO demo_calls (filename, status, result_json) VALUES (?, 'done', ?)`,
    )
    .run(filename, JSON.stringify(result));
  return Number(info.lastInsertRowid);
}

const R = (overallScore, signabilityScore, leaked, feeAtRisk) => ({
  overallScore,
  signabilityScore,
  leaked,
  feeAtRisk: leaked ? feeAtRisk : 0,
});

// --- Pure aggregation --------------------------------------------------------

test("aggregateAudit computes counts, fee-at-risk, average and best/worst", () => {
  const results = [
    R(30, 90, true, 12000), // leaked + signable
    R(75, 40, false, 0), // not signable
    R(50, 80, true, 8000), // leaked + signable
    R(90, 70, false, 0), // signable, not leaked
  ];
  const a = aggregateAudit({ results, monthlyCallVolume: 200 });
  assert.equal(a.callsReviewed, 4);
  assert.equal(a.signableCalls, 3); // 90,80,70 >= 60
  assert.equal(a.leakedSignable, 2);
  assert.equal(a.totalFeeAtRisk, 20000);
  assert.equal(a.avgHandlingScore, Math.round((30 + 75 + 50 + 90) / 4)); // 61
  assert.equal(a.best.overallScore, 90);
  assert.equal(a.worst.overallScore, 30);
  // perCallLeak = 20000/4 = 5000; projection = 5000 * 200 = 1,000,000
  assert.equal(a.perCallLeak, 5000);
  assert.equal(a.monthlyCallVolume, 200);
  assert.equal(a.assumedVolume, false);
  assert.equal(a.projectedMonthlyLeakage, 1_000_000);
});

test("aggregateAudit assumes the default volume when none is supplied", () => {
  const a = aggregateAudit({ results: [R(40, 90, true, 10000)], monthlyCallVolume: null });
  assert.equal(a.assumedVolume, true);
  assert.equal(a.monthlyCallVolume, DEFAULT_MONTHLY_VOLUME);
  // perCallLeak = 10000/1 = 10000; projection = 10000 * 100
  assert.equal(a.projectedMonthlyLeakage, 10000 * DEFAULT_MONTHLY_VOLUME);
});

test("aggregateAudit handles an empty set without dividing by zero", () => {
  const a = aggregateAudit({ results: [], monthlyCallVolume: 50 });
  assert.equal(a.callsReviewed, 0);
  assert.equal(a.totalFeeAtRisk, 0);
  assert.equal(a.avgHandlingScore, null);
  assert.equal(a.projectedMonthlyLeakage, 0);
  assert.equal(a.best, null);
});

test("normalizeVolume rejects junk and keeps positive integers", () => {
  assert.equal(normalizeVolume(null), null);
  assert.equal(normalizeVolume(0), null);
  assert.equal(normalizeVolume(-5), null);
  assert.equal(normalizeVolume("abc"), null);
  assert.equal(normalizeVolume(150), 150);
  assert.equal(normalizeVolume("120"), 120);
  assert.equal(normalizeVolume(99.7), 99);
});

// --- Session lifecycle -------------------------------------------------------

test("startAuditSession enforces one session per fingerprint per 7 days", async (t) => {
  const db = makeDb(t);
  const first = await startAuditSession({ db, fingerprint: "fp-1" });
  assert.equal(first.ok, true);
  const second = await startAuditSession({ db, fingerprint: "fp-1" });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "session_limit");
  // A different fingerprint is unaffected.
  const other = await startAuditSession({ db, fingerprint: "fp-2" });
  assert.equal(other.ok, true);
});

test("addCallToAuditSession caps a session at 10 calls", async (t) => {
  const db = makeDb(t);
  const { token } = await startAuditSession({ db, fingerprint: "fp-cap" });
  for (let i = 0; i < MAX_CALLS_PER_SESSION; i++) {
    const id = makeDoneDemoCall(db, R(50, 70, false, 0), `c${i}.mp3`);
    const res = await addCallToAuditSession({ db, token, demoCallId: id });
    assert.equal(res.ok, true, `call ${i} should attach`);
  }
  const overflowId = makeDoneDemoCall(db, R(50, 70, false, 0), "overflow.mp3");
  const res = await addCallToAuditSession({ db, token, demoCallId: overflowId });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "call_limit");
});

test("expired sessions are unavailable", async (t) => {
  const db = makeDb(t);
  // Start "35 days ago" so the 30-day TTL has passed by now.
  const past = new Date(Date.now() - 35 * 24 * 3600 * 1000);
  const { token } = await startAuditSession({ db, fingerprint: "fp-exp", now: past });
  const resolved = await resolveSession({ db, token });
  assert.equal(resolved.ok, false);
  assert.equal(resolved.reason, "expired");
  const n = await expireAuditSessions({ db });
  assert.ok(n >= 1);
});

test("buildAuditReport aggregates a session end-to-end (demo-isolated)", async (t) => {
  const db = makeDb(t);
  const { token } = await startAuditSession({
    db,
    fingerprint: "fp-report",
    monthlyCallVolume: 300,
  });
  const calls = [R(20, 95, true, 15000), R(80, 30, false, 0), R(45, 75, true, 9000)];
  for (const [i, c] of calls.entries()) {
    const id = makeDoneDemoCall(db, c, `r${i}.mp3`);
    await addCallToAuditSession({ db, token, demoCallId: id });
  }
  const report = await buildAuditReport({ db, token });
  assert.equal(report.ok, true);
  assert.equal(report.calls.length, 3);
  assert.equal(report.summary.callsReviewed, 3);
  assert.equal(report.summary.leakedSignable, 2);
  assert.equal(report.summary.totalFeeAtRisk, 24000);
  // Stored volume (300) is used when the caller doesn't override.
  assert.equal(report.summary.monthlyCallVolume, 300);
  // perCallLeak = 24000/3 = 8000; projection = 8000 * 300
  assert.equal(report.summary.projectedMonthlyLeakage, 8000 * 300);
});

test("buildAuditReport returns not_found for an unknown token", async (t) => {
  const db = makeDb(t);
  const report = await buildAuditReport({ db, token: "nope" });
  assert.equal(report.ok, false);
  assert.equal(report.reason, "not_found");
});
