// Firm-statement tiered-review tests (migration 0037/0045).
//
// Covers: (1) the pure release logic — both branches + the force_review-blocks-
// auto-release invariant; (2) the REAL firm-pipeline signals reader over a
// migrated SQLite db, including the citation-failure count being a genuine query
// (never a hard-coded 0) and period filtering; (3) the persistence + analyst
// release roundtrip; (4) the flag-OFF no-op property (reading signals never
// writes a review row).
//
// COMPLIANCE §IV is the point: a flag with any citation-guard failure, a moderate/
// unrated confidence tier, or a high dollar figure forces analyst review and can
// never be auto-released.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  reduceFirmStatementSignals,
  firmStatementPeriodWindow,
} from "../analysis/review-router.mjs";
import { decideStatementReview } from "../analysis/statement-review.mjs";
import {
  getFirmStatementReviewSignals,
  getFirmStatementReview,
  upsertFirmStatementReview,
  listFirmStatementReviews,
  setFirmStatementReviewStatus,
} from "../ingest/store.mjs";

// ── Pure release logic ────────────────────────────────────────────────────────

test("decideStatementReview: EVERY flag auto_eligible → released + engine_scored", () => {
  const perFlag = [
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 500000 },
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 300000 },
  ];
  const d = decideStatementReview({ perFlag });
  assert.equal(d.reportStatus, "released");
  assert.equal(d.provenance, "engine_scored");
  assert.equal(d.autoCount, 2);
  assert.equal(d.forceReviewCount, 0);
});

test("decideStatementReview: ANY force_review flag → analyst_review, provenance null", () => {
  const perFlag = [
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 500000 }, // auto
    { confidenceTier: "moderate", citationFailureCount: 0, revenueAtRiskCents: 100000 }, // force (low confidence)
  ];
  const d = decideStatementReview({ perFlag });
  assert.equal(d.reportStatus, "analyst_review");
  assert.equal(d.provenance, null, "provenance is unearned until a human signs off");
  assert.equal(d.autoCount, 1);
  assert.equal(d.forceReviewCount, 1);
});

test("decideStatementReview: a single citation-guard failure BLOCKS auto-release (§IV)", () => {
  const perFlag = [
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 100000 },
    { confidenceTier: "strong", citationFailureCount: 1, revenueAtRiskCents: 100000 }, // citation gap
  ];
  const d = decideStatementReview({ perFlag });
  assert.equal(d.reportStatus, "analyst_review");
  assert.equal(d.forceReviewCount, 1);
  assert.notEqual(d.reportStatus, "released");
});

test("decideStatementReview: a single high-dollar flag BLOCKS auto-release", () => {
  const perFlag = [
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 100000 },
    { confidenceTier: "strong", citationFailureCount: 0, revenueAtRiskCents: 5_000_000 }, // >= $10k line
  ];
  const d = decideStatementReview({ perFlag });
  assert.equal(d.reportStatus, "analyst_review");
  assert.equal(d.forceReviewCount, 1);
});

test("decideStatementReview: unrated (null) confidence forces review", () => {
  const d = decideStatementReview({ perFlag: [{ confidenceTier: null, citationFailureCount: 0, revenueAtRiskCents: 1000 }] });
  assert.equal(d.reportStatus, "analyst_review");
});

test("decideStatementReview: no leaked flags → stays draft, nothing to release", () => {
  const d = decideStatementReview({ perFlag: [] });
  assert.equal(d.reportStatus, "draft");
  assert.equal(d.provenance, null);
  assert.equal(d.autoCount, 0);
  assert.equal(d.forceReviewCount, 0);
});

// ── Pure reducer + period window ──────────────────────────────────────────────

test("firmStatementPeriodWindow: correct inclusive/exclusive month bounds", () => {
  assert.deepEqual(firmStatementPeriodWindow("2026-07"), {
    start: "2026-07-01T00:00:00.000Z",
    endExclusive: "2026-08-01T00:00:00.000Z",
  });
  // December rolls into the next year.
  assert.deepEqual(firmStatementPeriodWindow("2026-12"), {
    start: "2026-12-01T00:00:00.000Z",
    endExclusive: "2027-01-01T00:00:00.000Z",
  });
  assert.equal(firmStatementPeriodWindow("nonsense"), null);
  assert.equal(firmStatementPeriodWindow("2026-13"), null);
});

test("reduceFirmStatementSignals: aggregates worst tier + real failures + max dollars, labels provenance", () => {
  const rows = [
    { flag_id: 1, confidence_tier: "strong", citation_failure_count: 0, revenue_at_risk_cents: 200000 },
    { flag_id: 2, confidence_tier: "moderate", citation_failure_count: 2, revenue_at_risk_cents: 900000 },
  ];
  const out = reduceFirmStatementSignals(rows);
  assert.equal(out.worstConfidenceTier, "moderate");
  assert.equal(out.citationFailureCount, 2, "real summed failures, never a hard-coded 0");
  assert.equal(out.maxRevenueAtRiskCents, 900000);
  assert.equal(out.perFlag.length, 2);
  assert.equal(out.perFlag[0].provenance, "engine_scored"); // strong/clean/low
  assert.equal(out.perFlag[1].provenance, "analyst_reviewed"); // moderate + failures
});

// ── Real firm-pipeline signals reader over a migrated DB ──────────────────────

function seedFirm(db, name) {
  return Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, 8500, "America/Los_Angeles", 1500, 1).lastInsertRowid
  );
}

function seedLeakedFlag(db, { firmId, receivedAt, tier = null, failures = 0, revenueCents = null }) {
  const callId = Number(
    db
      .prepare(`INSERT INTO calls (firm_id, source, received_at) VALUES (?, 'manual', ?)`)
      .run(firmId, receivedAt).lastInsertRowid
  );
  const flagId = Number(
    db
      .prepare(`INSERT INTO flags (call_id, firm_id, is_leaked_signable, reason) VALUES (?, ?, 1, 'leaked')`)
      .run(callId, firmId).lastInsertRowid
  );
  if (tier) {
    db.prepare(
      `INSERT INTO flag_confidence (flag_id, confidence_tier, rubric_version) VALUES (?, ?, 'test')`
    ).run(flagId, tier);
  }
  for (let i = 0; i < failures; i++) {
    db.prepare(`INSERT INTO citation_failures (flag_id, snippet) VALUES (?, ?)`).run(flagId, `dropped ${i}`);
  }
  if (revenueCents != null) {
    db.prepare(
      `INSERT INTO call_analyses (call_id, firm_id, revenue_at_risk_cents) VALUES (?, ?, ?)`
    ).run(callId, firmId, revenueCents);
  }
  return { callId, flagId };
}

test("getFirmStatementReviewSignals: reads REAL tables, real citation-failure count, period-scoped", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-stmtreview-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const firmId = seedFirm(db, "Reader Firm");
  const otherFirm = seedFirm(db, "Other Firm");

  // In-period July flags: one clean+strong (auto), one with a real citation failure (force).
  seedLeakedFlag(db, { firmId, receivedAt: "2026-07-10T12:00:00.000Z", tier: "strong", failures: 0, revenueCents: 400000 });
  seedLeakedFlag(db, { firmId, receivedAt: "2026-07-20T12:00:00.000Z", tier: "strong", failures: 3, revenueCents: 400000 });
  // Out-of-period (August) — must be excluded.
  seedLeakedFlag(db, { firmId, receivedAt: "2026-08-02T12:00:00.000Z", tier: "moderate", failures: 5, revenueCents: 9999999 });
  // Another firm, same month — must be excluded (firm scoping).
  seedLeakedFlag(db, { firmId: otherFirm, receivedAt: "2026-07-15T12:00:00.000Z", tier: "moderate", failures: 9, revenueCents: 9999999 });

  const signals = await getFirmStatementReviewSignals(db, firmId, "2026-07");
  assert.equal(signals.perFlag.length, 2, "only this firm's in-period leaked flags");
  assert.equal(signals.citationFailureCount, 3, "REAL citation_failures count, not 0 and not the other firm's 9");
  assert.equal(signals.maxRevenueAtRiskCents, 400000, "August's 9999999 is out of period");

  // The release decision on the real signals: the citation-gap flag forces review.
  const d = decideStatementReview({ perFlag: signals.perFlag });
  assert.equal(d.reportStatus, "analyst_review");
  assert.equal(d.forceReviewCount, 1);
  assert.equal(d.autoCount, 1);

  // Flag-OFF no-op property: reading signals must NEVER write a review row.
  assert.equal(await getFirmStatementReview(db, firmId, "2026-07"), null, "reader is read-only");
});

// ── Persistence + analyst release roundtrip ───────────────────────────────────

test("upsert + analyst release roundtrip persists status, counts, provenance", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-stmtpersist-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const firmId = seedFirm(db, "Persist Firm");

  // A statement that forced review (one force flag, one auto flag).
  await upsertFirmStatementReview(db, {
    firmId,
    period: "2026-07",
    reportStatus: "analyst_review",
    provenance: null,
    autoCount: 1,
    forceReviewCount: 1,
  });
  let row = await getFirmStatementReview(db, firmId, "2026-07");
  assert.equal(row.report_status, "analyst_review");
  assert.equal(row.provenance, null);
  assert.equal(Number(row.auto_count), 1);
  assert.equal(Number(row.force_review_count), 1);

  // It shows up in the analyst queue.
  const queue = await listFirmStatementReviews(db);
  assert.ok(queue.some((s) => String(s.firm_id) === String(firmId) && s.period === "2026-07"));

  // Analyst signs off → released + analyst_reviewed provenance + stamped.
  await setFirmStatementReviewStatus(db, {
    firmId,
    period: "2026-07",
    status: "released",
    provenance: "analyst_reviewed",
    releasedBy: "Ali",
  });
  row = await getFirmStatementReview(db, firmId, "2026-07");
  assert.equal(row.report_status, "released");
  assert.equal(row.provenance, "analyst_reviewed");
  assert.equal(row.released_by, "Ali");
  assert.ok(row.released_at, "released_at is stamped");

  // Released statements drop out of the review queue.
  const queueAfter = await listFirmStatementReviews(db);
  assert.ok(!queueAfter.some((s) => String(s.firm_id) === String(firmId) && s.period === "2026-07"));
});

test("upsert auto-release path stamps engine_scored + released_at", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-stmtauto-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const firmId = seedFirm(db, "Auto Firm");
  const row = await upsertFirmStatementReview(db, {
    firmId,
    period: "2026-06",
    reportStatus: "released",
    provenance: "engine_scored",
    autoCount: 3,
    forceReviewCount: 0,
    releasedBy: "Ali (auto: engine-scored)",
  });
  assert.equal(row.report_status, "released");
  assert.equal(row.provenance, "engine_scored");
  assert.ok(row.released_at);
});
