// Tests for peer benchmarking (Phase 3): pure stats, the k-anonymity gate (both
// directions), consent gating, and that snapshots carry no firm-identifiable data.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { setBenchmarkConsent, getLatestBenchmarkSnapshot } from "../ingest/store.mjs";
import {
  quantile,
  aggregateBenchmark,
  estimatePercentile,
  computeSnapshot,
  getBenchmark,
  MIN_CONSENTING_FIRMS,
} from "../analytics/benchmarks.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-bm-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

// A firm with `consent` + a set of flags (each with a score and leaked flag).
function makeFirmWithFlags(db, { consent = true, flags = [] } = {}) {
  const firmId = Number(
    db.prepare("INSERT INTO firms (name, kill_switch) VALUES ('F', 1)").run().lastInsertRowid,
  );
  if (consent) setBenchmarkConsent(db, firmId, true);
  const callId = Number(
    db
      .prepare("INSERT INTO calls (firm_id, source, received_at) VALUES (?, 'manual', ?)")
      .run(firmId, new Date().toISOString()).lastInsertRowid,
  );
  for (const f of flags) {
    db.prepare(
      "INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable) VALUES (?, ?, ?, ?)",
    ).run(callId, firmId, f.score, f.leaked ? 1 : 0);
  }
  return firmId;
}

// --- Pure stats --------------------------------------------------------------

test("quantile interpolates and handles edges", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([42], 0.5), 42);
  assert.equal(quantile([0, 100], 0.5), 50);
  assert.equal(quantile([10, 20, 30, 40], 0.25), 17.5);
});

test("aggregateBenchmark computes quartiles, leak rate, and sign rate by band", () => {
  const rows = [
    { score: 30, leaked: 1, signed: 0 }, // weak
    { score: 65, leaked: 0, signed: 1 }, // moderate, signed
    { score: 85, leaked: 0, signed: 1 }, // strong, signed
    { score: 90, leaked: 0, signed: 0 }, // strong, not signed
  ];
  const a = aggregateBenchmark(rows);
  assert.equal(a.sample_size, 4);
  assert.equal(a.leak_rate, 0.25);
  assert.equal(a.median_handling_score, 75); // median of 30,65,85,90
  assert.equal(a.sign_rate_by_band.strong, 0.5); // 1 of 2 strong signed
  assert.equal(a.sign_rate_by_band.moderate, 1);
});

test("estimatePercentile buckets against quartiles", () => {
  const snap = { q1_handling_score: 40, median_handling_score: 60, q3_handling_score: 80 };
  assert.equal(estimatePercentile(30, snap), 25);
  assert.equal(estimatePercentile(70, snap), 75);
  assert.equal(estimatePercentile(95, snap), 90);
});

// --- k-anonymity gate --------------------------------------------------------

test("computeSnapshot refuses below the k-anonymity threshold", async (t) => {
  const db = makeDb(t);
  for (let i = 0; i < MIN_CONSENTING_FIRMS - 1; i++) {
    makeFirmWithFlags(db, { consent: true, flags: [{ score: 50, leaked: 1 }] });
  }
  const res = await computeSnapshot({ db });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "below_k");
  assert.equal(await getLatestBenchmarkSnapshot(db), undefined);
});

test("computeSnapshot produces a snapshot at/above the threshold, and getBenchmark serves it", async (t) => {
  const db = makeDb(t);
  for (let i = 0; i < MIN_CONSENTING_FIRMS; i++) {
    makeFirmWithFlags(db, { consent: true, flags: [{ score: 40 + i * 10, leaked: i % 2 === 0 }] });
  }
  // A non-consenting firm must NOT be counted or included.
  makeFirmWithFlags(db, { consent: false, flags: [{ score: 5, leaked: 1 }] });

  const res = await computeSnapshot({ db });
  assert.equal(res.ok, true);
  assert.equal(res.contributor_count, MIN_CONSENTING_FIRMS);
  assert.equal(res.sample_size, MIN_CONSENTING_FIRMS); // one flag each, non-consenting excluded

  const served = await getBenchmark({ db });
  assert.equal(served.available, true);
  assert.equal(served.snapshot.contributor_count, MIN_CONSENTING_FIRMS);
});

test("snapshots carry no firm-identifiable columns", async (t) => {
  const db = makeDb(t);
  for (let i = 0; i < MIN_CONSENTING_FIRMS; i++) {
    makeFirmWithFlags(db, { consent: true, flags: [{ score: 70, leaked: false }] });
  }
  await computeSnapshot({ db });
  const snap = await getLatestBenchmarkSnapshot(db);
  const keys = Object.keys(snap);
  assert.ok(!keys.some((k) => /firm|name|email|phone|id$/.test(k) && k !== "id"));
  assert.ok(keys.includes("contributor_count"));
});
