// B-011 data layer: flag_status.attempts counts logged touches (left a message
// / spoke to them), never terminal outcomes or undo. The counter only grows —
// it powers encouragement copy on the card, never a score or a quota.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMigratedDb } from "../db/connection.mjs";
import { upsertCall, insertFlag, setFlagStatus, listLeakedFlags } from "../ingest/db.mjs";

function seed(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-attempts-"));
  const db = openMigratedDb(join(dir, "t.db"));
  t.after(() => db.close());
  const firmId = Number(
    db.prepare("INSERT INTO firms (name) VALUES ('F') RETURNING id").get().id,
  );
  const call = upsertCall(db, { firm_id: firmId, source: "manual", received_at: "2026-07-01T00:00:00Z" });
  const flagId = insertFlag(db, { call_id: call.id, firm_id: firmId, is_leaked_signable: 1 });
  return { db, firmId, flagId };
}

const attemptsOf = (db, flagId) =>
  Number(db.prepare("SELECT attempts FROM flag_status WHERE flag_id = ?").get(flagId)?.attempts ?? 0);

test("each logged touch increments attempts: message, message again, spoke", (t) => {
  const { db, firmId, flagId } = seed(t);
  let res = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId });
  assert.equal(res.attempts, 1);
  // "Left another message" is a same-status write and still counts a touch.
  res = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId });
  assert.equal(res.attempts, 2);
  res = setFlagStatus(db, { flag_id: flagId, status: "back_in_touch", firm_id: firmId });
  assert.equal(res.attempts, 3);
  assert.equal(attemptsOf(db, flagId), 3);
  const last = db.prepare("SELECT last_attempt_at FROM flag_status WHERE flag_id = ?").get(flagId);
  assert.ok(last.last_attempt_at, "last_attempt_at is stamped on a touch");
});

test("terminal outcomes and undo do NOT count as attempts", (t) => {
  const { db, firmId, flagId } = seed(t);
  setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId });
  setFlagStatus(db, { flag_id: flagId, status: "signed", firm_id: firmId }); // outcome, not a touch
  assert.equal(attemptsOf(db, flagId), 1);
  setFlagStatus(db, { flag_id: flagId, status: "needs_callback", firm_id: firmId }); // reopen/undo
  assert.equal(attemptsOf(db, flagId), 1, "the tally survives a reopen and never shrinks");
  const res = setFlagStatus(db, { flag_id: flagId, status: "bad_number", firm_id: firmId });
  assert.equal(attemptsOf(db, flagId), 1, "bad_number is an outcome, not a logged touch");
  assert.equal(res.attempts, 1, "setFlagStatus reports the authoritative tally either way");
});

test("a fresh non-attempt write starts the row at zero attempts", (t) => {
  const { db, firmId, flagId } = seed(t);
  const res = setFlagStatus(db, { flag_id: flagId, status: "needs_callback", firm_id: firmId });
  assert.equal(res.attempts, 0);
  assert.equal(attemptsOf(db, flagId), 0);
  const last = db.prepare("SELECT last_attempt_at FROM flag_status WHERE flag_id = ?").get(flagId);
  assert.equal(last.last_attempt_at, null, "no touch, no last_attempt_at");
});

test("the guarded digest write cannot inflate the tally by re-clicking a stale link", (t) => {
  const { db, firmId, flagId } = seed(t);
  const first = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId, guardTerminal: true });
  assert.equal(first.ok, true);
  assert.equal(first.attempts, 1);
  // Same stale digest link clicked again: the forward-only guard refuses it,
  // so the attempt tally doesn't double-count.
  const replay = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId, guardTerminal: true });
  assert.equal(replay.ok, false);
  assert.equal(attemptsOf(db, flagId), 1);
});

test("listLeakedFlags carries attempts to the queue (0 when no status row)", async (t) => {
  const { db, firmId, flagId } = seed(t);
  let rows = listLeakedFlags(db, firmId);
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].attempts), 0, "no row yet -> attempts 0, not null");
  setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId });
  setFlagStatus(db, { flag_id: flagId, status: "back_in_touch", firm_id: firmId });
  rows = listLeakedFlags(db, firmId);
  assert.equal(Number(rows[0].attempts), 2);
});
