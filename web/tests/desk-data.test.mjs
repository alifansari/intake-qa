// Store reads that back the desk screens, against the seeded demo firm.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { seedDemo } from "../scripts/seed-demo.mjs";
import { listLeakedFlags, listNonAnalyzedCalls, getFeeValueRange } from "../ingest/store.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-desk-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  return db;
}

test("listLeakedFlags returns the four leaks with case type, tier, and citations, strong first", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rows = await listLeakedFlags(db, firmId);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].confidence_tier, "strong", "strong flags sort first");
  assert.ok(rows.every((r) => r.case_type), "each carries a case type");
  assert.ok(rows.some((r) => Number(r.citation_count) > 0), "citations are joined");
  // Each leaked flag's case type resolves to a fee range for the queue.
  const range = await getFeeValueRange(db, rows[0].case_type, firmId);
  assert.ok(range && range.low_cents < range.high_cents);
});

test("listNonAnalyzedCalls surfaces exactly the excluded + failed calls", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rows = await listNonAnalyzedCalls(db, firmId);
  // 3 excluded + 1 failed = 4 non-analyzed rows.
  assert.equal(rows.length, 4);
  assert.ok(rows.some((r) => r.status.startsWith("failed")), "a failed row is present");
  assert.ok(rows.every((r) => r.status && r.status !== "analyzed"));
});
