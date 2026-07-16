// Stage 3b: the missed-call pager — CallRail already tells us a lead rang and
// nobody picked up; record it at ingest so the sweep pings in minutes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { createFirm } from "../ingest/db.mjs";
import { upsertCall } from "../ingest/store.mjs";
import { parseCallRailPayload, isMissedInboundCall } from "../ingest/callrail.mjs";
import { buildActivityDigest } from "../messaging/founder-alerts.mjs";
import { isEventType } from "../ingest/event-types.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-pager-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

test("parseCallRailPayload captures the answer status CallRail already sends", () => {
  const f = parseCallRailPayload({
    id: "CAL1",
    direction: "inbound",
    answered: false,
    call_type: "voicemail",
    duration: "13",
    customer_phone_number: "+12148654559",
  });
  assert.equal(f.answered, false);
  assert.equal(f.call_type, "voicemail");
  assert.equal(f.direction, "inbound");
  assert.equal(f.duration_seconds, 13); // string "13" -> number
});

test("isMissedInboundCall: only an unanswered INBOUND call is a miss", () => {
  assert.equal(isMissedInboundCall({ direction: "inbound", answered: false }), true);
  assert.equal(isMissedInboundCall({ direction: "inbound", answered: true }), false);
  assert.equal(isMissedInboundCall({ direction: "outbound", answered: false }), false);
  // Unknown answer status (e.g. a manual MP3 upload) is never a miss.
  assert.equal(isMissedInboundCall({ direction: "inbound", answered: null }), false);
  assert.equal(isMissedInboundCall({}), false);
});

test("call_missed is a registered event type and the schema accepts it", async (t) => {
  assert.equal(isEventType("call_missed"), true);
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Pager Firm", avg_case_fee: 9000 });
  const { recordEvent } = await import("../ingest/db.mjs");
  // Throws if the widened CHECK constraint didn't land.
  const id = recordEvent(db, {
    event: "call_missed",
    firm_id: firmId,
    actor: "callrail",
    context: { caller_phone: "+12148654559" },
  });
  assert.ok(id > 0);
});

test("upsertCall persists the answer status (SQLite has no boolean)", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Pager Firm", avg_case_fee: 9000 });
  const { id } = await upsertCall(db, {
    firm_id: firmId,
    source: "callrail",
    external_call_id: "CAL-MISS-1",
    received_at: "2026-07-14T10:00:00Z",
    answered: false,
    call_type: "voicemail",
    direction: "inbound",
    duration_seconds: 13,
  });
  const row = db.prepare("SELECT answered, call_type, direction, duration_seconds FROM calls WHERE id = ?").get(id);
  assert.equal(row.answered, 0); // boolean false coerced to 0
  assert.equal(row.call_type, "voicemail");
  assert.equal(row.direction, "inbound");
  assert.equal(row.duration_seconds, 13);
});

test("the founder sweep leads with the missed call and shows the number to dial", () => {
  const sections = buildActivityDigest({
    events: [
      { event: "score_completed", firm_id: 1, created_at: "2026-07-14T10:00:00Z", context: { score: 80 } },
      {
        event: "call_missed",
        firm_id: 1,
        created_at: "2026-07-14T10:01:00Z",
        context: { caller_phone: "+12148654559", caller_name: "Kaylah Mills", lead_source: "Google Paid", call_type: "voicemail" },
      },
    ],
    firmName: () => "Test Firm",
    now: new Date("2026-07-14T10:02:00Z"),
  });
  // Missed calls lead the sweep — they're the only still-winnable line.
  assert.match(sections[0].title, /MISSED CALL/);
  assert.match(sections[0].lines[0], /\+12148654559/);
  assert.match(sections[0].lines[0], /Kaylah Mills/);
  assert.match(sections[0].lines[0], /Google Paid/);
});
