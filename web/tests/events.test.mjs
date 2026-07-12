// Tests for the first-party product event log (migration 0027): the insert
// helper, the readers the /studio/beta board uses, the alert-state watermark
// store, the founder-set funnel stage, and the windowed call counts. Temp
// SQLite DB, no network — the exact same store contract the Postgres twin
// implements.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  createFirm,
  upsertCall,
  setCallStatus,
  recordEvent,
  listEvents,
  countEvents,
  firstEventAt,
  lastEventAt,
  getAlertState,
  setAlertState,
  getErrorsAfterId,
  logError,
  setFirmStage,
  getFirm,
  callCountsSince,
  lastCallAt,
} from "../ingest/db.mjs";
import { EVENT_TYPES } from "../ingest/event-types.mjs";

function makeCtx(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-events-"));
  const db = openMigratedDb(join(dir, "test.db"));
  const firmId = createFirm(db, { name: "Test Firm", avg_case_fee: 8000 });
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, firmId };
}

test("recordEvent inserts every allowed event type and rejects unknown names", (t) => {
  const { db, firmId } = makeCtx(t);
  for (const name of EVENT_TYPES) {
    const id = recordEvent(db, { event: name, firm_id: firmId });
    assert.ok(id > 0, `insert failed for ${name}`);
  }
  assert.throws(() => recordEvent(db, { event: "made_up_event", firm_id: firmId }));
  assert.equal(listEvents(db, { firm_id: firmId }).length, EVENT_TYPES.length);
});

test("context objects are JSON-stringified; filters and counts work", (t) => {
  const { db, firmId } = makeCtx(t);
  recordEvent(db, { event: "desk_view", firm_id: firmId, context: { page: "queue" } });
  recordEvent(db, { event: "desk_view", firm_id: firmId });
  recordEvent(db, { event: "sign_in", firm_id: firmId, actor: "a@b.com" });

  const deskViews = listEvents(db, { event: "desk_view", firm_id: firmId });
  assert.equal(deskViews.length, 2);
  assert.equal(deskViews[1].context, JSON.stringify({ page: "queue" }));

  assert.equal(countEvents(db, { event: "desk_view", firm_id: firmId }), 2);
  assert.equal(countEvents(db, { event: "sign_in", firm_id: firmId }), 1);
  assert.equal(countEvents(db, { event: "callback_marked", firm_id: firmId }), 0);
  // A since-filter in the future excludes everything.
  assert.equal(
    countEvents(db, { event: "desk_view", firm_id: firmId, sinceIso: "2999-01-01T00:00:00Z" }),
    0,
  );
});

test("firstEventAt / lastEventAt bracket the activation clock", (t) => {
  const { db, firmId } = makeCtx(t);
  assert.equal(firstEventAt(db, { event: "digest_sent", firm_id: firmId }), null);
  recordEvent(db, { event: "digest_sent", firm_id: firmId });
  recordEvent(db, { event: "digest_sent", firm_id: firmId });
  const first = firstEventAt(db, { event: "digest_sent", firm_id: firmId });
  const last = lastEventAt(db, { event: "digest_sent", firm_id: firmId });
  assert.ok(first && last && first <= last);
});

test("alert_state is an upsertable watermark store", (t) => {
  const { db } = makeCtx(t);
  assert.equal(getAlertState(db, "alerts.error_watermark"), null);
  setAlertState(db, "alerts.error_watermark", "12");
  assert.equal(getAlertState(db, "alerts.error_watermark"), "12");
  setAlertState(db, "alerts.error_watermark", "40");
  assert.equal(getAlertState(db, "alerts.error_watermark"), "40");
});

test("getErrorsAfterId is an id-cursor, independent of the alerted flag", (t) => {
  const { db } = makeCtx(t);
  const id1 = logError(db, { source: "pipeline.score", message: "one" });
  const id2 = logError(db, { source: "pipeline.score", message: "two" });
  assert.equal(getErrorsAfterId(db, 0).length, 2);
  const after = getErrorsAfterId(db, id1);
  assert.equal(after.length, 1);
  assert.equal(after[0].id, id2);
  assert.equal(getErrorsAfterId(db, id2).length, 0);
});

test("setFirmStage sets, clears, and refuses junk", (t) => {
  const { db, firmId } = makeCtx(t);
  setFirmStage(db, firmId, "pilot");
  assert.equal(getFirm(db, firmId).stage, "pilot");
  setFirmStage(db, firmId, "paid");
  assert.equal(getFirm(db, firmId).stage, "paid");
  setFirmStage(db, firmId, "nonsense"); // coerced to NULL, never junk in the column
  assert.equal(getFirm(db, firmId).stage, null);
});

test("callCountsSince buckets received / scored / failed in the window", (t) => {
  const { db, firmId } = makeCtx(t);
  const now = new Date().toISOString();
  const c1 = upsertCall(db, { firm_id: firmId, source: "manual", received_at: now });
  const c2 = upsertCall(db, { firm_id: firmId, source: "manual", received_at: now });
  const c3 = upsertCall(db, { firm_id: firmId, source: "manual", received_at: now });
  setCallStatus(db, c1.id ?? c1, "analyzed");
  setCallStatus(db, c2.id ?? c2, "failed_scoring", "boom");

  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const counts = callCountsSince(db, firmId, dayAgo);
  assert.deepEqual(counts, { received: 3, scored: 1, failed: 1 });
  // A window starting in the future sees nothing.
  assert.deepEqual(callCountsSince(db, firmId, "2999-01-01T00:00:00Z"), {
    received: 0,
    scored: 0,
    failed: 0,
  });
  assert.ok(lastCallAt(db, firmId));
  void c3;
});
