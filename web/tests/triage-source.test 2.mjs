// Integration test for auto-triage persistence against a real migrated DB:
// migration 0035 columns (source, source_call_id), the extended insertTriageCase,
// and findTriageByCall dedupe — plus the full mapping -> persist -> dedupe flow
// the score-worker runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { seedDemo } from "../scripts/seed-demo.mjs";
import {
  insertTriageCase,
  findTriageByCall,
  getTriageCasesForCalibration,
} from "../ingest/store.mjs";
import { triageFromCall, AUTO_TRIAGE_SOURCE } from "../src/lib/desk/triage-from-call.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-triage-source-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function scoredCall() {
  return {
    _v2_shadow: {
      v2: {
        recommended_disposition: "sign_now",
        value_tier: "high",
        case_type_routing: "mva_standard",
        disposition_basis: ["clear liability, treated injury"],
      },
      attorney_review_required: false,
    },
  };
}

test("insertTriageCase persists source + source_call_id (migration 0035)", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rec = triageFromCall({ score: scoredCall(), call: { id: 42, firm_id: firmId } });
  const id = await insertTriageCase(db, rec);
  assert.ok(id);
  const rows = await getTriageCasesForCalibration(db, firmId);
  const mine = rows.find((r) => r.id === id);
  assert.equal(mine.source, AUTO_TRIAGE_SOURCE);
  assert.equal(String(mine.source_call_id), "42");
  assert.equal(mine.disposition, "sign_now");
  assert.equal(mine.grade_letter, "A");
});

test("findTriageByCall dedupes by source call; unknown call -> null", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rec = triageFromCall({ score: scoredCall(), call: { id: 77, firm_id: firmId } });
  await insertTriageCase(db, rec);
  const hit = await findTriageByCall(db, firmId, 77);
  assert.ok(hit && hit.id, "existing source call is found");
  assert.equal(await findTriageByCall(db, firmId, 999), null, "unknown call is null");
  assert.equal(await findTriageByCall(db, firmId, null), null, "null id is null");
});

test("the score-worker flow: a re-score of the same call does not duplicate", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const call = { id: 100, firm_id: firmId };

  // The exact guarded block score-worker runs, twice (as if the call re-scored).
  async function autoTriage(score) {
    const rec = triageFromCall({ score, call });
    if (!rec || !rec.source_call_id) return;
    const existing = await findTriageByCall(db, firmId, rec.source_call_id);
    if (!existing) await insertTriageCase(db, rec);
  }
  await autoTriage(scoredCall());
  await autoTriage(scoredCall());

  const rows = await getTriageCasesForCalibration(db, firmId);
  const forCall = rows.filter((r) => String(r.source_call_id) === "100");
  assert.equal(forCall.length, 1, "exactly one auto-triage despite two scores");
});

test("a shadow error produces no triage (never a blank auto row)", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rec = triageFromCall({ score: { _v2_shadow: { shadow_error: "x" } }, call: { id: 5, firm_id: firmId } });
  assert.equal(rec, null);
});
