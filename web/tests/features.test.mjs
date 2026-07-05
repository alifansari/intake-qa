// Tests for the per-firm feature-flag foundation (ground rule 0.5, migration
// 0008). The invariants that matter:
//   * DEFAULT OFF — a feature with no stored row reads as disabled.
//   * set/read round-trips through the async facade (store.mjs), which is what
//     the pipeline and screens actually call.
//   * toggling off after on works (idempotent upsert, not insert-only).
//   * firms are isolated — one firm's flags never leak into another's.
//   * unknown flag keys are safe (read as OFF), and the registry is coherent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  getFirmFeatures,
  isFeatureEnabled,
  setFirmFeature,
} from "../ingest/store.mjs";
import { FEATURES, ALL_FEATURES, isKnownFeature } from "../features.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-features-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db, name = "Test Firm") {
  return Number(
    db
      .prepare(`INSERT INTO firms (name, kill_switch) VALUES (?, 1)`)
      .run(name).lastInsertRowid
  );
}

test("a feature with no stored row defaults to OFF", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  assert.equal(await isFeatureEnabled(db, firm, FEATURES.LEAK_AUDIT), false);
  assert.deepEqual(await getFirmFeatures(db, firm), {});
});

test("set then read round-trips through the facade", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await setFirmFeature(db, firm, FEATURES.LEAK_AUDIT, true);
  assert.equal(await isFeatureEnabled(db, firm, FEATURES.LEAK_AUDIT), true);
  assert.deepEqual(await getFirmFeatures(db, firm), {
    [FEATURES.LEAK_AUDIT]: true,
  });
});

test("toggling a feature off after on works (upsert, not insert-only)", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await setFirmFeature(db, firm, FEATURES.BILLING, true);
  assert.equal(await isFeatureEnabled(db, firm, FEATURES.BILLING), true);
  await setFirmFeature(db, firm, FEATURES.BILLING, false);
  assert.equal(await isFeatureEnabled(db, firm, FEATURES.BILLING), false);
  // Still exactly one row for (firm, feature) — no duplicate accumulation.
  const rows = db
    .prepare(
      "SELECT COUNT(*) AS n FROM firm_features WHERE firm_id = ? AND feature = ?"
    )
    .get(firm, FEATURES.BILLING);
  assert.equal(rows.n, 1);
});

test("flags are isolated between firms", async (t) => {
  const db = makeDb(t);
  const a = makeFirm(db, "Firm A");
  const b = makeFirm(db, "Firm B");
  await setFirmFeature(db, a, FEATURES.BENCHMARKS, true);
  assert.equal(await isFeatureEnabled(db, a, FEATURES.BENCHMARKS), true);
  assert.equal(await isFeatureEnabled(db, b, FEATURES.BENCHMARKS), false);
  assert.deepEqual(await getFirmFeatures(db, b), {});
});

test("unknown feature keys read as OFF and are flagged by the registry", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  assert.equal(await isFeatureEnabled(db, firm, "not_a_real_feature"), false);
  assert.equal(isKnownFeature("not_a_real_feature"), false);
  assert.equal(isKnownFeature(FEATURES.LEAK_AUDIT), true);
  assert.ok(ALL_FEATURES.length >= 7);
  // Registry keys are unique.
  assert.equal(new Set(ALL_FEATURES).size, ALL_FEATURES.length);
});
