// Tests for demo-data mode (item 15). Runs seedDemo against a temp DB and asserts
// the synthetic firm, the balanced reconciliation set, and the two-tier flags with
// citations. Additive; no frozen-core impact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { seedDemo } from "../scripts/seed-demo.mjs";
import { getCallReconciliation, getFlagConfidence, getTranscriptCitations } from "../ingest/store.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-demo-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

test("seedDemo creates an obviously-synthetic firm flagged is_demo", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(firmId);
  assert.match(firm.name, /DEMO/);
  assert.equal(firm.is_demo, 1);
});

test("seedDemo reconciliation balances at 132 = 128 + 3 + 1", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const r = await getCallReconciliation(db, firmId);
  assert.equal(r.received, 132);
  assert.equal(r.processed, 128);
  assert.equal(r.excluded, 3);
  assert.equal(r.failed, 1);
  assert.equal(r.received, r.processed + r.excluded + r.failed);
});

test("seedDemo produces four leaks across both confidence tiers, with citations", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const flags = db.prepare("SELECT * FROM flags WHERE firm_id = ? AND is_leaked_signable = 1 ORDER BY id").all(firmId);
  assert.equal(flags.length, 4);

  const tiers = [];
  let totalCitations = 0;
  for (const f of flags) {
    const conf = await getFlagConfidence(db, f.id);
    tiers.push(conf.confidence_tier);
    totalCitations += (await getTranscriptCitations(db, f.id)).length;
  }
  assert.ok(tiers.includes("strong") && tiers.includes("moderate"), "both tiers present");
  assert.ok(totalCitations >= 4, "flags carry timestamped citations");
});
