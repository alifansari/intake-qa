// Tests for the recovery-desk additive schema (migration 0014). These are NEW and
// additive: they exercise the new sibling tables/columns/view without touching any
// frozen scoring/flagging/gate behavior. The 130-test baseline stays green.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  setCallStatus,
  getCallReconciliation,
  insertTranscriptCitation,
  getTranscriptCitations,
  setFlagConfidence,
  getFlagConfidence,
  insertAnalysisVersion,
  logArtifactAccess,
  insertCitationFailure,
  getFeeValueRange,
} from "../ingest/store.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-schema14-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db, { is_demo = 0 } = {}) {
  return Number(
    db
      .prepare("INSERT INTO firms (name, avg_case_fee, kill_switch, is_demo) VALUES (?, ?, 1, ?)")
      .run("Test Firm", 8000, is_demo).lastInsertRowid,
  );
}

function makeCall(db, firmId, status = null) {
  const id = Number(
    db
      .prepare("INSERT INTO calls (firm_id, source, received_at) VALUES (?, 'manual', ?)")
      .run(firmId, "2026-06-15T12:00:00Z").lastInsertRowid,
  );
  if (status) setCallStatus(db, id, status);
  return id;
}

function makeFlag(db, callId, firmId) {
  return Number(
    db
      .prepare(
        "INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable) VALUES (?, ?, 80, 1)",
      )
      .run(callId, firmId).lastInsertRowid,
  );
}

test("is_demo defaults to 0 and is settable", async (t) => {
  const db = makeDb(t);
  const real = makeFirm(db);
  const demo = makeFirm(db, { is_demo: 1 });
  assert.equal(db.prepare("SELECT is_demo FROM firms WHERE id = ?").get(real).is_demo, 0);
  assert.equal(db.prepare("SELECT is_demo FROM firms WHERE id = ?").get(demo).is_demo, 1);
});

test("reconciliation view balances: received = processed + excluded + failed", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  makeCall(db, firm, "analyzed");
  makeCall(db, firm, "analyzed");
  makeCall(db, firm, "excluded_duplicate");
  makeCall(db, firm, "failed_audio_quality");
  makeCall(db, firm, "analyzed");

  const r = await getCallReconciliation(db, firm);
  assert.equal(r.received, 5);
  assert.equal(r.processed, 3);
  assert.equal(r.excluded, 1);
  assert.equal(r.failed, 1);
  assert.equal(r.received, r.processed + r.excluded + r.failed, "invariant must hold");
});

test("transcript citation insert/get roundtrip", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  const flag = makeFlag(db, makeCall(db, firm), firm);
  insertTranscriptCitation(db, {
    flag_id: flag,
    fact_kind: "qualifying_fact",
    start_ms: 12000,
    end_ms: 15000,
    verbatim_snippet: "the other driver admitted fault",
    validation_score: 96.5,
    status: "passed",
  });
  const rows = await getTranscriptCitations(db, flag);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "passed");
  assert.equal(rows[0].verbatim_snippet, "the other driver admitted fault");
  // status filter works
  assert.equal((await getTranscriptCitations(db, flag, { status: "failed" })).length, 0);
});

test("flag_confidence is a sibling upsert — never mutates flags", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  const callId = makeCall(db, firm);
  const flag = makeFlag(db, callId, firm);
  const before = db.prepare("SELECT * FROM flags WHERE id = ?").get(flag);

  setFlagConfidence(db, { flag_id: flag, confidence_tier: "moderate", rubric_version: "v1" });
  setFlagConfidence(db, { flag_id: flag, confidence_tier: "strong", rubric_version: "v1" }); // upsert
  const conf = await getFlagConfidence(db, flag);
  assert.equal(conf.confidence_tier, "strong");

  const after = db.prepare("SELECT * FROM flags WHERE id = ?").get(flag);
  assert.deepEqual(after, before, "the frozen flags row must be byte-identical");
});

test("analysis version stamping + access log + citation failure log write", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  const flag = makeFlag(db, makeCall(db, firm), firm);
  await insertAnalysisVersion(db, {
    flag_id: flag,
    model_version: "claude-sonnet-4-6",
    prompt_version: "sys-v3",
    rubric_version: "rubric-v1",
  });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM analysis_versions WHERE flag_id = ?").get(flag).n, 1);

  await logArtifactAccess(db, {
    firm_id: firm, actor: "ali", artifact_type: "statement", artifact_id: "S-1", action: "download",
  });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM artifact_access_log WHERE firm_id = ?").get(firm).n, 1);

  await insertCitationFailure(db, { flag_id: flag, snippet: "hallucinated line", nearest_text: "real line", score: 42 });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM citation_failures").get().n, 1);
});

test("fee-value range: seeded published row, firm-historical overrides", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);

  const published = await getFeeValueRange(db, "Auto — rear-end");
  assert.ok(published, "seeded published row exists");
  assert.equal(published.basis, "published");
  assert.ok(published.low_cents < published.high_cents, "it is a range, not a point");

  // A firm-historical row overrides the published one for that firm.
  db.prepare(
    `INSERT INTO fee_value_ranges (firm_id, case_type, low_cents, high_cents, basis, source)
     VALUES (?, 'Auto — rear-end', 2000000, 6000000, 'firm_historical', 'Firm outcomes 2025')`,
  ).run(firm);
  const preferred = await getFeeValueRange(db, "Auto — rear-end", firm);
  assert.equal(preferred.basis, "firm_historical");
  assert.equal(preferred.low_cents, 2000000);
});
