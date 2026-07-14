// Firm-facing statement download — access-gate + firm-scoped listing tests.
//
// The CORE safety property: a firm can download a Monthly Statement PDF ONLY for
// a period whose firm_statement_reviews row is RELEASED and belongs to that firm.
// Draft/analyst_review → no PDF; missing/other-firm → 404. And a firm's statement
// list is scoped to its own rows (never another firm's).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  decideStatementAccess,
  statementProvenanceLabel,
} from "../analysis/statement-access.mjs";
import {
  upsertFirmStatementReview,
  listFirmStatementReviews,
} from "../ingest/store.mjs";

// ── Pure access gate — the released-only invariant ────────────────────────────

test("decideStatementAccess: RELEASED + same firm → ok (PDF may be served)", () => {
  const review = { firm_id: 7, period: "2026-07", report_status: "released" };
  assert.deepEqual(decideStatementAccess({ review, callerFirmId: 7 }), { ok: true });
});

test("decideStatementAccess: DRAFT → 409, no pdf", () => {
  const review = { firm_id: 7, period: "2026-07", report_status: "draft" };
  const d = decideStatementAccess({ review, callerFirmId: 7 });
  assert.equal(d.ok, false);
  assert.equal(d.status, 409);
  assert.equal(d.code, "in_review");
});

test("decideStatementAccess: ANALYST_REVIEW → 409, no pdf (still under review)", () => {
  const review = { firm_id: 7, period: "2026-07", report_status: "analyst_review" };
  const d = decideStatementAccess({ review, callerFirmId: 7 });
  assert.equal(d.ok, false);
  assert.equal(d.status, 409);
});

test("decideStatementAccess: no row → 404", () => {
  const d = decideStatementAccess({ review: null, callerFirmId: 7 });
  assert.equal(d.ok, false);
  assert.equal(d.status, 404);
  assert.equal(d.code, "not_found");
});

test("decideStatementAccess: CROSS-FIRM — firm B cannot fetch firm A's RELEASED statement", () => {
  // Even a released row is denied (as not_found) when it belongs to another firm.
  const firmAReleased = { firm_id: "A", period: "2026-07", report_status: "released" };
  const d = decideStatementAccess({ review: firmAReleased, callerFirmId: "B" });
  assert.equal(d.ok, false, "firm B must never receive firm A's statement");
  assert.equal(d.status, 404, "denied as if it did not exist — no disclosure");
});

test("statementProvenanceLabel: honest labels, no analyst claim on engine-scored", () => {
  assert.equal(statementProvenanceLabel("analyst_reviewed"), "Analyst-reviewed");
  assert.equal(statementProvenanceLabel("engine_scored"), "Engine-scored · evidence-verified");
  assert.equal(statementProvenanceLabel(null), "Released");
});

// ── Firm-scoped listing (powers the firm-facing documents page) ───────────────

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

test("listFirmStatementReviews(db, firmId): firm-scoped, all statuses, newest first", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-stmtlist-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const firmA = seedFirm(db, "Firm A");
  const firmB = seedFirm(db, "Firm B");

  // Firm A: a released May, an in-review June, a draft July.
  await upsertFirmStatementReview(db, { firmId: firmA, period: "2026-05", reportStatus: "released", provenance: "analyst_reviewed", releasedBy: "Ali" });
  await upsertFirmStatementReview(db, { firmId: firmA, period: "2026-06", reportStatus: "analyst_review", provenance: null });
  await upsertFirmStatementReview(db, { firmId: firmA, period: "2026-07", reportStatus: "draft", provenance: null });
  // Firm B: its own released statement — must NOT appear in firm A's list.
  await upsertFirmStatementReview(db, { firmId: firmB, period: "2026-06", reportStatus: "released", provenance: "engine_scored", releasedBy: "Ali (auto)" });

  const listA = await listFirmStatementReviews(db, firmA);
  assert.equal(listA.length, 3, "all of firm A's rows regardless of status");
  assert.ok(listA.every((r) => String(r.firm_id) === String(firmA)), "no other firm's rows");
  assert.deepEqual(listA.map((r) => r.period), ["2026-07", "2026-06", "2026-05"], "newest period first");

  const listB = await listFirmStatementReviews(db, firmB);
  assert.equal(listB.length, 1);
  assert.equal(listB[0].period, "2026-06");
  assert.equal(listB[0].report_status, "released");

  // The internal queue overload (no firmId) is unchanged: only draft/analyst_review, all firms.
  const queue = await listFirmStatementReviews(db);
  assert.ok(queue.every((r) => r.report_status === "draft" || r.report_status === "analyst_review"));
  assert.ok(queue.some((r) => String(r.firm_id) === String(firmA)));
  assert.ok(!queue.some((r) => String(r.firm_id) === String(firmB) && r.period === "2026-06"), "released rows excluded from queue");
});

// End-to-end of the gate over real persisted rows: released downloads, draft doesn't.
test("access gate over persisted rows: released period passes, draft period blocked", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-stmtgate-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const firmId = seedFirm(db, "Gate Firm");
  await upsertFirmStatementReview(db, { firmId, period: "2026-05", reportStatus: "released", provenance: "analyst_reviewed", releasedBy: "Ali" });
  await upsertFirmStatementReview(db, { firmId, period: "2026-06", reportStatus: "draft", provenance: null });

  const rows = await listFirmStatementReviews(db, firmId);
  const may = rows.find((r) => r.period === "2026-05");
  const june = rows.find((r) => r.period === "2026-06");
  assert.equal(decideStatementAccess({ review: may, callerFirmId: firmId }).ok, true);
  assert.equal(decideStatementAccess({ review: june, callerFirmId: firmId }).ok, false);
});
