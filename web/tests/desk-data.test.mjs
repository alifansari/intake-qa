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

test("listLeakedFlags attaches ONE transcript-validated verbatim quote (passed only, qualifying_fact preferred)", async (t) => {
  const db = makeDb(t);
  const { firmId } = seedDemo(db);
  const rows = await listLeakedFlags(db, firmId);

  const PASSED = new Set([
    "the other driver admitted it was his fault", // qualifying_fact, flag A
    "I definitely want to move forward with this", // flag_rationale, same flag A
    "no había ningún letrero, me resbalé", // qualifying_fact, flag B
  ]);
  const NEEDS_REVIEW = new Set([
    "the dog bit my arm and I went to the ER",
    "my neck's been a little sore since",
  ]);

  const quoted = rows.filter((r) => r.evidence_quote);
  assert.ok(quoted.length > 0, "at least one flag carries a validated quote");
  for (const r of quoted) {
    assert.ok(PASSED.has(r.evidence_quote), `only validated snippets surface: ${r.evidence_quote}`);
    assert.ok(!NEEDS_REVIEW.has(r.evidence_quote), "an unvalidated snippet must never appear");
  }
  // On the flag with BOTH a passed qualifying_fact and a passed rationale, the
  // qualifying fact (the "what happened") wins — the query prefers it.
  assert.ok(
    rows.some((r) => r.evidence_quote === "the other driver admitted it was his fault"),
    "qualifying_fact is preferred over flag_rationale on the same flag",
  );
  // Flags whose only citations are needs_review carry NO quote (no citation, no claim §IV).
  assert.ok(rows.some((r) => !r.evidence_quote), "needs_review-only flags carry no quote");
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
