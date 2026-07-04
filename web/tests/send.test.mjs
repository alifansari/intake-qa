// Tests for the SEND layer: the compliance chokepoint (sendMessage) and inbound
// handling (opt-out + reply drafting). TEST_MODE is on for EVERY scenario, so no
// message is ever transmitted — the injected fake `sender` must NEVER be called,
// and the fake `drafter` stands in for Claude (no key, no network, no cost).
//
// Covers the four required scenarios: an approved send during quiet hours (must
// NOT send), an inbound STOP (opt out + block further sends), an inbound question
// (must create a DRAFTED reply, nothing sent), and the kill switch engaged
// (nothing sends) — plus the happy-path simulated send.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { sendMessage } from "../messaging/send.mjs";
import { ingestInbound } from "../messaging/inbound.mjs";
import { isQuietHours, detectOptOut } from "../messaging/compliance.mjs";
import {
  approveMessage,
  getMessage,
  getConversation,
  getConversationMessages,
  setFirmKillSwitch,
} from "../ingest/db.mjs";

const PHONE = "+15550100101";
const NAME = "Sam Ortiz";
const FIRM = "Test Firm";

// TEST_MODE on; kill switch off; standard 8pm–8am quiet window.
const BASE_ENV = {
  TEST_MODE: "true",
  KILL_SWITCH: "false",
  QUIET_HOURS_START: "20",
  QUIET_HOURS_END: "8",
};

// Fixed instants in JANUARY (no DST) in America/Los_Angeles (PST, UTC-8):
const NOON_LA = new Date("2025-01-15T20:00:00Z"); // 12:00 local — OUTSIDE quiet hours
const TWO_AM_LA = new Date("2025-01-15T10:00:00Z"); // 02:00 local — INSIDE quiet hours

// Seed a firm + a leaked flag + a pending_approval conversation + a drafted
// outbound message. kill_switch is set OFF (schema default is ON) so sends are
// allowed unless a test turns it back on. Returns the key ids.
function seed(db) {
  const firmId = Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, 0)`
      )
      .run(FIRM, 8500, "America/Los_Angeles", 1500).lastInsertRowid
  );
  const callId = Number(
    db
      .prepare(
        `INSERT INTO calls (firm_id, source, caller_phone, caller_name, received_at)
         VALUES (?, 'manual', ?, ?, ?)`
      )
      .run(firmId, PHONE, NAME, new Date().toISOString()).lastInsertRowid
  );
  const flagId = Number(
    db
      .prepare(
        `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason)
         VALUES (?, ?, 44, 1, 'leaked-signable')`
      )
      .run(callId, firmId).lastInsertRowid
  );
  const conversationId = Number(
    db
      .prepare(
        `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis)
         VALUES (?, ?, ?, 'pending_approval', 'inbound_call_inquiry_EBR')`
      )
      .run(flagId, firmId, PHONE).lastInsertRowid
  );
  const messageId = Number(
    db
      .prepare(
        `INSERT INTO messages (conversation_id, direction, body, status)
         VALUES (?, 'outbound', ?, 'drafted')`
      )
      .run(
        conversationId,
        `Hi Sam, this is the intake team at ${FIRM} following up on your call. Reply STOP to opt out.`
      ).lastInsertRowid
  );
  return { firmId, callId, flagId, conversationId, messageId };
}

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-send-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

// A fake Twilio sender that records every call. In TEST_MODE it must never run.
function makeFakeSender() {
  const calls = [];
  const sender = async (args) => {
    calls.push(args);
    return { sid: "FAKE" };
  };
  sender.calls = calls;
  return sender;
}

// Compliant fake reply drafter (names the firm; no banned content).
async function fakeReplyDrafter() {
  return `Hi Sam, thanks for getting back to us at ${FIRM}. When is a good time for a quick callback?`;
}

test("pure: quiet hours + opt-out detection", () => {
  assert.equal(isQuietHours(TWO_AM_LA, "America/Los_Angeles", 20, 8), true);
  assert.equal(isQuietHours(NOON_LA, "America/Los_Angeles", 20, 8), false);
  assert.equal(detectOptOut("STOP"), true);
  assert.equal(detectOptOut("Stop please"), true);
  assert.equal(detectOptOut("opt out"), true);
  assert.equal(detectOptOut("I was stopping by, thanks!"), false);
  assert.equal(detectOptOut("Yes that time works"), false);
});

test("happy path: approved message is SIMULATED in TEST_MODE, sender never called", async (t) => {
  const db = makeDb(t);
  const { messageId } = seed(db);
  const sender = makeFakeSender();

  approveMessage(db, messageId, "attorney@testfirm.com");
  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: BASE_ENV,
    now: NOON_LA,
  });

  assert.equal(res.sent, true);
  assert.equal(res.mode, "test");
  assert.equal(sender.calls.length, 0, "TEST_MODE must not call Twilio");

  const m = getMessage(db, messageId);
  assert.equal(m.status, "sent");
  assert.ok(m.sent_at, "sent_at stamped on the simulated send");
});

test("quiet hours: an approved message must NOT send", async (t) => {
  const db = makeDb(t);
  const { messageId } = seed(db);
  const sender = makeFakeSender();

  approveMessage(db, messageId, "attorney@testfirm.com");
  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: BASE_ENV,
    now: TWO_AM_LA,
  });

  assert.equal(res.sent, false);
  assert.equal(res.reason, "quiet_hours");
  assert.equal(sender.calls.length, 0);

  const m = getMessage(db, messageId);
  assert.equal(m.status, "approved", "stays approved so it can retry later");
  assert.equal(m.sent_at, null);
});

test("inbound STOP: opts out and blocks all further sends", async (t) => {
  const db = makeDb(t);
  const { firmId, conversationId, messageId } = seed(db);
  const sender = makeFakeSender();

  // Approve first (so the block below is proven to be the opt-out, not lack of approval).
  approveMessage(db, messageId, "attorney@testfirm.com");

  const inRes = await ingestInbound({
    db,
    firmId,
    from: PHONE,
    body: "STOP",
    drafter: fakeReplyDrafter,
    now: NOON_LA,
  });
  assert.equal(inRes.optedOut, true);

  const conv = getConversation(db, conversationId);
  assert.equal(conv.status, "opted_out");

  // The inbound STOP is logged as a received message (the audit timestamp).
  const inbound = getConversationMessages(db, conversationId).filter(
    (m) => m.direction === "inbound"
  );
  assert.equal(inbound.length, 1);
  assert.equal(inbound[0].status, "received");

  // A send now is blocked by the opt-out gate.
  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: BASE_ENV,
    now: NOON_LA,
  });
  assert.equal(res.sent, false);
  assert.equal(res.reason, "opted_out");
  assert.equal(sender.calls.length, 0);
  assert.equal(getMessage(db, messageId).status, "approved", "not sent");
});

test("inbound question: drafts a reply into the queue, sends nothing", async (t) => {
  const db = makeDb(t);
  const { firmId, conversationId } = seed(db);

  const before = getConversationMessages(db, conversationId).length;
  const res = await ingestInbound({
    db,
    firmId,
    from: PHONE,
    body: "Yes, can you tell me how this works?",
    drafter: fakeReplyDrafter,
    now: NOON_LA,
  });

  assert.equal(res.drafted, true);
  assert.ok(res.messageId, "a drafted reply was created");

  const msgs = getConversationMessages(db, conversationId);
  // +1 inbound (the question) and +1 outbound draft (the reply).
  assert.equal(msgs.length, before + 2);

  const reply = getMessage(db, res.messageId);
  assert.equal(reply.direction, "outbound");
  assert.equal(reply.status, "drafted", "reply stays drafted — human must approve");
  assert.equal(reply.sent_at, null);
  assert.ok(reply.body.includes(FIRM), "reply names the firm");

  // Conversation is NOT opted out; nothing was marked sent.
  assert.equal(getConversation(db, conversationId).status, "pending_approval");
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE status = 'sent'`).get().n,
    0
  );
});

test("kill switch (global env): nothing sends", async (t) => {
  const db = makeDb(t);
  const { messageId } = seed(db);
  const sender = makeFakeSender();

  approveMessage(db, messageId, "attorney@testfirm.com");
  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: { ...BASE_ENV, KILL_SWITCH: "true" },
    now: NOON_LA,
  });

  assert.equal(res.sent, false);
  assert.equal(res.reason, "kill_switch_global");
  assert.equal(sender.calls.length, 0);
  assert.equal(getMessage(db, messageId).status, "approved");
});

test("kill switch (per-firm): nothing sends", async (t) => {
  const db = makeDb(t);
  const { firmId, messageId } = seed(db);
  const sender = makeFakeSender();

  approveMessage(db, messageId, "attorney@testfirm.com");
  setFirmKillSwitch(db, firmId, true); // operator halt for this firm

  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: BASE_ENV, // global kill off
    now: NOON_LA,
  });

  assert.equal(res.sent, false);
  assert.equal(res.reason, "kill_switch_firm");
  assert.equal(sender.calls.length, 0);
  assert.equal(getMessage(db, messageId).status, "approved");
});

test("autonomy lock: firms default to 'manual' (schema refuses any other value)", (t) => {
  const db = makeDb(t);
  const { firmId } = seed(db);
  const firm = db.prepare("SELECT autonomy_level FROM firms WHERE id = ?").get(firmId);
  assert.equal(firm.autonomy_level, "manual", "graduated autonomy is scaffolding, locked OFF");
  // The DB CHECK allows nothing but 'manual' — an autonomous mode cannot be stored.
  assert.throws(
    () => db.prepare("UPDATE firms SET autonomy_level = 'auto' WHERE id = ?").run(firmId),
    /CHECK|constraint/i
  );
});

test("guard: an unapproved (drafted) message can never send", async (t) => {
  const db = makeDb(t);
  const { messageId } = seed(db);
  const sender = makeFakeSender();

  // No approve() call — message is still 'drafted'.
  const res = await sendMessage({
    db,
    messageId,
    sender,
    env: BASE_ENV,
    now: NOON_LA,
  });

  assert.equal(res.sent, false);
  assert.equal(res.reason, "not_approved");
  assert.equal(sender.calls.length, 0);
  assert.equal(getMessage(db, messageId).status, "drafted");
});
