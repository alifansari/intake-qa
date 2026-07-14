// Bounded-retry for scoring failures: a transient blip self-heals (one retry)
// instead of dying permanently, and a permanently-bad call still goes terminal
// on the second attempt (respecting the Session-9 anti-infinite-retry rule).
// Also covers countFailedScoring, the standing "unresolved failures" count on
// /admin/status.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { createFirm } from "../ingest/db.mjs";
import { upsertCall, countFailedScoring } from "../ingest/store.mjs";
import { scoreUnscored } from "../ingest/score-worker.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-score-retry-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function statusOf(db, id) {
  return db.prepare("SELECT status FROM calls WHERE id = ?").get(id)?.status ?? null;
}

const alwaysThrows = async () => {
  throw new Error("transient boom");
};

test("a scoring failure retries once, then goes terminal on the second attempt", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Retry Firm", avg_case_fee: 8000 });
  const created = await upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    external_call_id: "retry-1",
    transcript: "INTAKE: thanks for calling\nCALLER: I was rear-ended and my neck hurts",
    received_at: "2026-07-13T12:00:00Z",
  });
  const callId = typeof created === "object" ? created.id : created;

  // Attempt 1: fails -> retryable (NOT terminal), so the next sweep re-selects it.
  await scoreUnscored({ db, scorer: alwaysThrows, firmId });
  assert.equal(statusOf(db, callId), "retry_scoring", "first failure is a retry, not terminal");
  assert.equal((await countFailedScoring(db)) ?? 0, 0, "a retryable call is not counted as a failure yet");

  // Attempt 2: fails again -> terminal failed_scoring.
  await scoreUnscored({ db, scorer: alwaysThrows, firmId });
  assert.equal(statusOf(db, callId), "failed_scoring", "second failure is terminal");
  assert.equal((await countFailedScoring(db)), 1, "now it counts as an unresolved failure");

  // Attempt 3: terminal calls are excluded from getUnscoredCalls — no more tries.
  const third = await scoreUnscored({ db, scorer: alwaysThrows, firmId });
  assert.equal(
    third.find((r) => r.call_id === callId),
    undefined,
    "a terminal call is never retried again",
  );
  assert.equal(statusOf(db, callId), "failed_scoring");
});

test("a call that fails once then succeeds on retry heals with no terminal failure", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Retry Firm", avg_case_fee: 8000 });
  const created = await upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    external_call_id: "retry-2",
    transcript: "INTAKE: hello\nCALLER: a truck hit me at the intersection",
    received_at: "2026-07-13T12:00:00Z",
  });
  const callId = typeof created === "object" ? created.id : created;

  let calls = 0;
  const flakyScorer = async (args) => {
    calls += 1;
    if (calls === 1) throw new Error("blip");
    // Minimal valid-ish score so the success path can proceed.
    return { scores: { overall: 72 }, alerts: { lost_signable_case: false }, _v2_shadow: {} };
  };

  await scoreUnscored({ db, scorer: flakyScorer, firmId });
  assert.equal(statusOf(db, callId), "retry_scoring", "first blip is a retry");
  await scoreUnscored({ db, scorer: flakyScorer, firmId });
  // On success the call leaves the retry state (it gets a flag + 'analyzed'),
  // and is never counted as a failure.
  assert.notEqual(statusOf(db, callId), "retry_scoring", "the retry resolved");
  assert.equal((await countFailedScoring(db)), 0, "a healed blip is never a failure");
});
