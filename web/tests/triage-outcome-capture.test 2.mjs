// Integration test for the triage GROUND-TRUTH LOOP against a real migrated DB.
// Proves the full path the calibration report depends on: insert a triage case,
// record its terminal outcome via setTriageStatus (capturing signed_where and
// stamping outcome_recorded_at from migration 0034), read it back through
// getTriageCasesForCalibration, and run buildCalibrationReport over the result.
//
// The pure math is unit-tested in triage-reconcile.test.mjs; this test covers
// the DB layer + migration that unit tests cannot.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { seedDemo } from "../scripts/seed-demo.mjs";
import {
  insertTriageCase,
  setTriageStatus,
  getTriageCasesForCalibration,
} from "../ingest/store.mjs";
import { buildCalibrationReport } from "../src/lib/desk/triage-reconcile.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-triage-outcome-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

async function addCase(db, firmId, disposition) {
  return insertTriageCase(db, {
    firm_id: firmId,
    case_type: "mva_standard",
    disposition,
    grade_letter: "B",
    value_tier: "moderate",
    verdict_json: JSON.stringify({ disposition }),
    status: "new",
  });
}

test("setTriageStatus captures signed_where and stamps outcome_recorded_at", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);

  const signId = await addCase(db, firmId, "sign_now");
  const okSigned = await setTriageStatus(db, firmId, signId, "signed", "tester", {
    signedWhere: "us",
  });
  assert.equal(okSigned, true);

  const rows = await getTriageCasesForCalibration(db, firmId);
  const mine = rows.find((r) => r.id === signId);
  assert.ok(mine, "the case is readable via the calibration read");
  assert.equal(mine.status, "signed");
  assert.equal(mine.signed_where, "us");
  assert.ok(mine.outcome_recorded_at, "terminal status stamps outcome_recorded_at");
});

test("a non-terminal status does NOT stamp an outcome time", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const id = await addCase(db, firmId, "sign_now");
  await setTriageStatus(db, firmId, id, "callback", "tester");
  const rows = await getTriageCasesForCalibration(db, firmId);
  const mine = rows.find((r) => r.id === id);
  assert.equal(mine.status, "callback");
  assert.equal(mine.outcome_recorded_at ?? null, null, "open status is not an outcome");
});

test("end-to-end: the calibration report reflects real recorded outcomes", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);

  // Three decided cases: a correct sign, a WRONGFUL DECLINE (we said decline,
  // firm signed elsewhere), and a correct refer.
  const a = await addCase(db, firmId, "sign_now");
  const b = await addCase(db, firmId, "decline_with_grace");
  const c = await addCase(db, firmId, "refer_out");
  await setTriageStatus(db, firmId, a, "signed", "tester", { signedWhere: "us" });
  await setTriageStatus(db, firmId, b, "signed", "tester", { signedWhere: "elsewhere" });
  await setTriageStatus(db, firmId, c, "referred", "tester");

  const all = await getTriageCasesForCalibration(db, firmId);
  const mine = all.filter((r) => [a, b, c].includes(r.id));
  assert.equal(mine.length, 3);

  const report = buildCalibrationReport(mine);
  assert.equal(report.confusion.resolved, 3);
  assert.equal(report.confusion.open, 0);
  assert.equal(report.wrongfulDeclines.count, 1, "the decline-then-signed case is caught");
  assert.deepEqual(report.wrongfulDeclines.ids, [b]);
  // sign_now -> signed is a correct call.
  assert.equal(report.signPrecision.point, 1);
  assert.equal(report.signPrecision.n, 1);
});
