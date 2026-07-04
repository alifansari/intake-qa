// Tests for the E-SIGN / CALLBACK HANDOFF + OUTCOME/RECOVERY recording.
//
// No Dropbox Sign key or network is ever touched: the signature-request provider
// is injected as a deterministic fake. Covers the four required scenarios:
//   * e-sign -> completion: handoff pending, then completeSignatureRequest writes
//     a signed outcome + a recovery at the firm's avg_case_fee, marks the handoff
//     completed, and closes the conversation.
//   * embedded paid-tier fallback: the fake throws EMBEDDED_UNAVAILABLE for
//     embedded, then returns a plain link -> handoff stored with embedded=0.
//   * booked callback: records callback_requested_at + a 'booked_callback'
//     outcome, sets handed_off, and creates NO recovery.
//   * non-signed outcomes: no_response / lost create outcomes only, no recovery;
//     weekOf returns the expected Monday.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { initiateHandoff } from "../messaging/handoff.mjs";
import { recordOutcome, completeSignatureRequest, weekOf } from "../messaging/outcome.mjs";
import {
  getConversation,
  getHandoff,
  getOutcomesForConversation,
  getRecoveriesForConversation,
} from "../ingest/db.mjs";

const PHONE = "+15550100202";
const NAME = "Jordan Vega";
const FIRM = "Test Firm";
const AVG_FEE = 8500;

// A fixed Thursday: 2025-01-16 -> its ISO week Monday is 2025-01-13.
const NOW = new Date("2025-01-16T12:00:00Z");
const EXPECTED_MONDAY = "2025-01-13";

function seed(db) {
  const firmId = Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, 0)`
      )
      .run(FIRM, AVG_FEE, "America/Los_Angeles", 1500).lastInsertRowid
  );
  const callId = Number(
    db
      .prepare(
        `INSERT INTO calls (firm_id, source, caller_phone, caller_name, received_at)
         VALUES (?, 'manual', ?, ?, ?)`
      )
      .run(firmId, PHONE, NAME, NOW.toISOString()).lastInsertRowid
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
         VALUES (?, ?, ?, 'active', 'inbound_call_inquiry_EBR')`
      )
      .run(flagId, firmId, PHONE).lastInsertRowid
  );
  return { firmId, callId, flagId, conversationId };
}

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-handoff-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

test("pure: weekOf returns the ISO week's Monday (UTC)", () => {
  assert.equal(weekOf(NOW), EXPECTED_MONDAY); // Thursday -> that Monday
  assert.equal(weekOf(new Date("2025-01-13T00:00:00Z")), "2025-01-13"); // Monday -> itself
  assert.equal(weekOf(new Date("2025-01-19T23:59:59Z")), "2025-01-13"); // Sunday -> prior Monday
  assert.equal(weekOf(new Date("2025-01-20T00:00:00Z")), "2025-01-20"); // next Monday
});

test("e-sign handoff -> completion records a signed outcome + recovery", async (t) => {
  const db = makeDb(t);
  const { conversationId } = seed(db);

  // Fake provider returns an embedded request; no network.
  const esignProvider = async ({ embedded }) => {
    assert.equal(embedded, true);
    return {
      signature_request_id: "sig_test_1",
      sign_url: "https://sign.example/test/sig_test_1",
      embedded: true,
    };
  };

  const res = await initiateHandoff({
    db,
    conversationId,
    kind: "esign",
    esignProvider,
    now: NOW,
  });
  assert.equal(res.kind, "esign");
  assert.equal(res.embedded, true);
  assert.equal(res.signatureRequestId, "sig_test_1");

  // Handoff pending; conversation handed_off.
  const handoff = getHandoff(db, res.handoffId);
  assert.equal(handoff.status, "pending");
  assert.equal(handoff.embedded, 1);
  assert.equal(handoff.provider, "dropbox_sign");
  assert.equal(getConversation(db, conversationId).status, "handed_off");

  // Now the completion webhook fires.
  const done = completeSignatureRequest({
    db,
    signatureRequestId: "sig_test_1",
    now: NOW,
  });
  assert.equal(done.handled, true);
  assert.equal(done.handoffId, res.handoffId);

  // Outcome: signed, fee defaulted to the firm's avg_case_fee.
  const outcomes = getOutcomesForConversation(db, conversationId);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].result, "signed");
  assert.equal(outcomes[0].recovered_fee_estimate, AVG_FEE);

  // Recovery: signed=1, fee=avg_case_fee, week_of = the right Monday.
  const recoveries = getRecoveriesForConversation(db, conversationId);
  assert.equal(recoveries.length, 1);
  assert.equal(recoveries[0].signed, 1);
  assert.equal(recoveries[0].fee_amount, AVG_FEE);
  assert.equal(recoveries[0].week_of, EXPECTED_MONDAY);

  // Handoff completed; conversation closed.
  assert.equal(getHandoff(db, res.handoffId).status, "completed");
  assert.equal(getConversation(db, conversationId).status, "closed");
});

test("embedded paid-tier fallback -> plain (non-embedded) link", async (t) => {
  const db = makeDb(t);
  const { conversationId } = seed(db);

  // First call (embedded) throws EMBEDDED_UNAVAILABLE; second (plain) returns a link.
  let calls = 0;
  const esignProvider = async ({ embedded }) => {
    calls += 1;
    if (embedded) {
      const err = new Error("embedded needs a paid plan");
      err.code = "EMBEDDED_UNAVAILABLE";
      throw err;
    }
    return {
      signature_request_id: "sig_test_2",
      sign_url: "https://sign.example/plain/sig_test_2",
      embedded: false,
    };
  };

  const res = await initiateHandoff({
    db,
    conversationId,
    kind: "esign",
    esignProvider,
    now: NOW,
  });
  assert.equal(calls, 2); // tried embedded, then fell back to plain
  assert.equal(res.embedded, false);
  assert.notEqual(res.sign_url, null);

  const handoff = getHandoff(db, res.handoffId);
  assert.equal(handoff.embedded, 0);
  assert.equal(handoff.sign_url, "https://sign.example/plain/sig_test_2");
  assert.equal(handoff.status, "pending");
});

test("booked callback records the time + a booked_callback outcome, no recovery", async (t) => {
  const db = makeDb(t);
  const { conversationId } = seed(db);

  const callbackAt = "2025-01-17T21:00:00Z";
  const res = await initiateHandoff({
    db,
    conversationId,
    kind: "callback",
    callbackAt,
    now: NOW,
  });
  assert.equal(res.kind, "callback");
  assert.equal(res.callbackAt, callbackAt);

  const handoff = getHandoff(db, res.handoffId);
  assert.equal(handoff.kind, "callback");
  assert.equal(handoff.callback_requested_at, callbackAt);
  assert.equal(handoff.status, "pending");
  assert.equal(getConversation(db, conversationId).status, "handed_off");

  const outcomes = getOutcomesForConversation(db, conversationId);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].result, "booked_callback");

  // No recovery for a callback.
  assert.equal(getRecoveriesForConversation(db, conversationId).length, 0);
});

test("non-signed outcomes create outcomes only, never a recovery", async (t) => {
  const db = makeDb(t);
  const { conversationId } = seed(db);

  const a = recordOutcome({ db, conversationId, result: "no_response", now: NOW });
  assert.equal(a.recoveryId, null);
  const b = recordOutcome({ db, conversationId, result: "lost", now: NOW });
  assert.equal(b.recoveryId, null);

  const outcomes = getOutcomesForConversation(db, conversationId);
  assert.equal(outcomes.length, 2);
  assert.deepEqual(
    outcomes.map((o) => o.result).sort(),
    ["lost", "no_response"]
  );
  assert.equal(getRecoveriesForConversation(db, conversationId).length, 0);
});

test("unknown signature request is a no-op", async (t) => {
  const db = makeDb(t);
  seed(db);
  const res = completeSignatureRequest({ db, signatureRequestId: "nope", now: NOW });
  assert.equal(res.handled, false);
  assert.equal(res.reason, "unknown_signature_request");
});
