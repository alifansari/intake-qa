// Regression guard for the emailed digest link: a guarded write may only ADVANCE
// a case, never move it backward or re-terminal. Prevents a stale "We called
// them" link (status reached_out) from un-signing a case OR knocking an
// already-"spoke to them" (back_in_touch) case back to "left a message".

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMigratedDb } from "../db/connection.mjs";
import { upsertCall, insertFlag, setFlagStatus } from "../ingest/db.mjs";

function seed(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-flagguard-"));
  const db = openMigratedDb(join(dir, "t.db"));
  t.after(() => db.close());
  const firmId = Number(
    db.prepare("INSERT INTO firms (name) VALUES ('F') RETURNING id").get().id,
  );
  const call = upsertCall(db, { firm_id: firmId, source: "manual", received_at: "2026-07-09T00:00:00Z" });
  const flagId = insertFlag(db, { call_id: call.id, firm_id: firmId, is_leaked_signable: 1 });
  return { db, firmId, flagId };
}

test("guarded digest write advances from needs_callback -> reached_out", (t) => {
  const { db, firmId, flagId } = seed(t);
  const res = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId, guardTerminal: true });
  assert.equal(res.ok, true);
  assert.equal(db.prepare("SELECT status FROM flag_status WHERE flag_id = ?").get(flagId).status, "reached_out");
});

test("guarded digest write cannot regress back_in_touch -> reached_out", (t) => {
  const { db, firmId, flagId } = seed(t);
  setFlagStatus(db, { flag_id: flagId, status: "back_in_touch", firm_id: firmId }); // desk advanced it
  const res = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId, guardTerminal: true });
  assert.equal(res.ok, false);
  assert.equal(res.alreadyResolved, true);
  assert.equal(db.prepare("SELECT status FROM flag_status WHERE flag_id = ?").get(flagId).status, "back_in_touch");
});

test("guarded digest write cannot un-sign a signed case", (t) => {
  const { db, firmId, flagId } = seed(t);
  setFlagStatus(db, { flag_id: flagId, status: "signed", firm_id: firmId });
  const res = setFlagStatus(db, { flag_id: flagId, status: "reached_out", firm_id: firmId, guardTerminal: true });
  assert.equal(res.ok, false);
  assert.equal(res.alreadyResolved, true);
  assert.equal(db.prepare("SELECT status FROM flag_status WHERE flag_id = ?").get(flagId).status, "signed");
});

test("UNguarded desk write (Reopen) can move a signed case back to needs_callback", (t) => {
  const { db, firmId, flagId } = seed(t);
  setFlagStatus(db, { flag_id: flagId, status: "signed", firm_id: firmId });
  const res = setFlagStatus(db, { flag_id: flagId, status: "needs_callback", firm_id: firmId }); // no guard
  assert.equal(res.ok, true);
  assert.equal(db.prepare("SELECT status FROM flag_status WHERE flag_id = ?").get(flagId).status, "needs_callback");
});
