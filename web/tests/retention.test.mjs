// P0-3: retention on REAL firm data. purgeExpiredCalls nulls transcripts +
// recording_url on calls and message bodies past the cutoff, keeps the log rows,
// and is idempotent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { purgeExpiredCalls } from "../ingest/store.mjs";

function seed(db, receivedAt) {
  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('Firm', 8000, 1)`).run().lastInsertRowid,
  );
  const callId = Number(
    db.prepare(
      `INSERT INTO calls (firm_id, source, recording_url, transcript, caller_phone, received_at)
       VALUES (?, 'callrail', 'https://rec/x.mp3', 'CONFIDENTIAL transcript', '+15105550123', ?)`,
    ).run(firmId, receivedAt).lastInsertRowid,
  );
  const flagId = Number(
    db.prepare(`INSERT INTO flags (call_id, firm_id, is_leaked_signable) VALUES (?, ?, 1)`).run(callId, firmId).lastInsertRowid,
  );
  const convId = Number(
    db.prepare(
      `INSERT INTO conversations (flag_id, firm_id, caller_phone, consent_basis)
       VALUES (?, ?, '+15105550123', 'inbound_call_inquiry_EBR')`,
    ).run(flagId, firmId).lastInsertRowid,
  );
  db.prepare(
    `INSERT INTO messages (conversation_id, direction, body, status, created_at)
     VALUES (?, 'outbound', 'CONFIDENTIAL message body', 'drafted', ?)`,
  ).run(convId, receivedAt);
  return { firmId, callId, convId };
}

test("purgeExpiredCalls scrubs confidential content past the cutoff, keeps rows", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-retention-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const oldIso = new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString(); // 100 days ago
  const { callId } = seed(db, oldIso);

  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(); // 90-day window
  const res = await purgeExpiredCalls(db, cutoff);
  assert.equal(res.calls, 1, "one call scrubbed");
  assert.equal(res.messages, 1, "one message body scrubbed");

  const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(callId);
  assert.equal(call.transcript, null, "transcript nulled");
  assert.equal(call.recording_url, null, "recording_url nulled");
  assert.ok(call.caller_phone, "non-confidential columns preserved (row kept)");

  const msg = db.prepare("SELECT * FROM messages").get();
  assert.equal(msg.body, null, "message body nulled");
  assert.ok(msg.purged_at, "purged_at stamped");
  assert.equal(msg.status, "drafted", "message log row preserved");
});

test("purgeExpiredCalls leaves in-window data untouched and is idempotent", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-retention2-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const recentIso = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(); // 10 days ago
  const { callId } = seed(db, recentIso);

  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const res = await purgeExpiredCalls(db, cutoff);
  assert.equal(res.calls, 0, "in-window call not scrubbed");
  assert.equal(res.messages, 0, "in-window message not scrubbed");
  const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(callId);
  assert.ok(call.transcript, "recent transcript preserved");

  // Now age it out and purge twice — the second run is a no-op (idempotent).
  const old = new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString();
  db.prepare("UPDATE calls SET received_at = ? WHERE id = ?").run(old, callId);
  db.prepare("UPDATE messages SET created_at = ?").run(old);
  const first = await purgeExpiredCalls(db, cutoff);
  assert.equal(first.calls, 1);
  const second = await purgeExpiredCalls(db, cutoff);
  assert.equal(second.calls, 0, "second purge scrubs nothing (idempotent)");
  assert.equal(second.messages, 0);
});
