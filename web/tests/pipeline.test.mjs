// End-to-end test of ingest → score → flag → DRAFT over 10 synthetic calls.
// Exercises BOTH ingest paths (a signed CallRail webhook payload and the manual
// transcript-file fallback), the re-engagement flag logic (case-signability gate,
// not-converted, within-window), and compliant SMS drafting — all with injected
// deterministic FAKES (no Claude/AssemblyAI, no network, no cost, NO sends).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";

import { openMigratedDb } from "../db/connection.mjs";
import { ingestCallRail } from "../ingest/callrail.mjs";
import { ingestManual } from "../ingest/manual.mjs";
import { scoreUnscored } from "../ingest/score-worker.mjs";

const SECRET = "test-callrail-secret";

// 10 synthetic calls. A lead is LEAKED-SIGNABLE when it is likely_signable, did
// NOT convert, and is within the re-engage window. `expLeaked` is the expected
// verdict given those fields (all calls are ingested with a recent received_at).
const CALLS = [
  // 4 leaked-signable: signable + not converted.
  { source: "callrail", name: "Sam Ortiz",      phone: "+15550100101", overall: 44, signability: "likely_signable",   confidence: "high",   outcome: "no_ask",         expLeaked: true },
  { source: "callrail", name: "Dana Whitfield", phone: "+15550100102", overall: 51, signability: "likely_signable",   confidence: "medium", outcome: "no_ask",         expLeaked: true },
  { source: "manual",   name: "Marcus Bell",    phone: "+15550100103", overall: 39, signability: "likely_signable",   confidence: "low",    outcome: "caller_deferred", expLeaked: true },
  { source: "callrail", name: "Priya Nair",     phone: "+15550100104", overall: 47, signability: "likely_signable",   confidence: "high",   outcome: "follow_up_committed", expLeaked: true },
  // 6 not leaked: converted, booked, or not signable.
  { source: "callrail", name: "Jordan Lee",     phone: "+15550100105", overall: 88, signability: "likely_signable",   confidence: "high",   outcome: "signed_on_call", expLeaked: false },
  { source: "callrail", name: "Alicia Gomez",   phone: "+15550100106", overall: 84, signability: "likely_signable",   confidence: "high",   outcome: "signed_on_call", expLeaked: false },
  { source: "manual",   name: "Trevor Hoang",   phone: "+15550100107", overall: 81, signability: "likely_signable",   confidence: "high",   outcome: "appointment_set", expLeaked: false },
  { source: "callrail", name: "Bianca Rossi",   phone: "+15550100108", overall: 66, signability: "needs_development", confidence: "medium", outcome: "no_ask",         expLeaked: false },
  { source: "callrail", name: "Omar Haddad",    phone: "+15550100109", overall: 58, signability: "likely_declinable", confidence: "high",   outcome: "n_a",            expLeaked: false },
  { source: "manual",   name: "Grace Kim",      phone: "+15550100110", overall: 62, signability: "needs_development", confidence: "low",    outcome: "no_ask",         expLeaked: false },
];

// Deterministic fake scorer producing the richer ScoredCall shape the flag logic
// reads (case_signability, classification_confidence, conversion, summary).
function makeFakeScorer(expectationByCallId) {
  return async ({ callId }) => {
    const exp = expectationByCallId.get(String(callId));
    return {
      call_id: String(callId),
      case_signability: exp.signability,
      classification_confidence: exp.confidence,
      conversion: { retainer_outcome: exp.outcome },
      scores: { overall: exp.overall, confidence: exp.confidence },
      summary: `Synthetic score for ${exp.name}`,
    };
  };
}

// Fake drafter: parses the firm/first-name out of the prompt and returns a
// compliant message (names the firm, includes opt-out, under 320 chars).
async function fakeDrafter({ user }) {
  const firm = user.match(/FIRM NAME: (.+)/)?.[1]?.trim() || "the firm";
  const first = user.match(/CALLER FIRST NAME: (.+)/)?.[1]?.trim() || "there";
  return `Hi ${first}, this is the intake team at ${firm} following up on your call. Is now a good time for a quick callback? No obligation. Reply STOP to opt out.`;
}

test("ingest -> score -> flag -> draft over 10 synthetic calls", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-test-"));
  const dbPath = join(dir, "test.db");
  const db = openMigratedDb(dbPath);
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const firmId = Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run("Test Firm", 8500, "America/Los_Angeles", 1500, 1).lastInsertRowid
  );

  // Recent receipt so every call is within the default 72h re-engage window.
  const recent = new Date(Date.now() - 3600 * 1000).toISOString();
  const expectationByCallId = new Map();

  // --- INGEST (both paths) ---------------------------------------------------
  for (const c of CALLS) {
    const transcript = `[synthetic transcript for ${c.name}]`;
    let callId;

    if (c.source === "callrail") {
      const payload = JSON.stringify({
        id: `CR-${c.phone}`,
        customer_name: c.name,
        customer_phone_number: c.phone,
        transcription: transcript,
        start_time: recent,
      });
      const signature = createHmac("sha256", SECRET)
        .update(payload, "utf8")
        .digest("hex");
      callId = ingestCallRail({ db, rawBody: payload, signature, secret: SECRET, firmId }).id;
    } else {
      const tPath = join(dir, `${c.name.replace(/\s/g, "_")}.txt`);
      writeFileSync(tPath, transcript);
      callId = ingestManual({
        db,
        firmId,
        transcriptPath: tPath,
        callerName: c.name,
        callerPhone: c.phone,
        receivedAt: recent,
      }).id;
    }
    expectationByCallId.set(String(callId), c);
  }

  // Rejects a tampered signature (guardrail check).
  assert.throws(
    () => ingestCallRail({ db, rawBody: "{}", signature: "deadbeef", secret: SECRET, firmId }),
    /Invalid CallRail signature/
  );

  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM calls").get().n, 10);

  // --- SCORE -> FLAG -> DRAFT ------------------------------------------------
  const flags = await scoreUnscored({
    db,
    scorer: makeFakeScorer(expectationByCallId),
    drafter: fakeDrafter,
    firmId,
  });

  assert.equal(flags.length, 10, "one flag per call");
  assert.equal(
    flags.filter((f) => f.is_leaked_signable === 1).length,
    4,
    "expected 4 leaked-signable flags"
  );

  for (const f of flags) {
    const exp = expectationByCallId.get(String(f.call_id));
    assert.equal(f.qualification_score, exp.overall, "qualification_score stays overall");
    assert.equal(f.is_leaked_signable, exp.expLeaked ? 1 : 0, `flag verdict for ${exp.name}`);
    if (exp.expLeaked) {
      assert.ok(f.conversation_id, "leaked lead has a conversation");
      assert.ok(f.message_id, "leaked lead has a drafted message");
    } else {
      assert.equal(f.conversation_id, null, "non-leaked lead has no conversation");
    }
  }

  // Conversations: exactly 4, all pending_approval with the required consent basis.
  const convs = db.prepare("SELECT * FROM conversations").all();
  assert.equal(convs.length, 4);
  for (const cv of convs) {
    assert.equal(cv.status, "pending_approval");
    assert.equal(cv.consent_basis, "inbound_call_inquiry_EBR");
  }

  // Messages: exactly 4, ALL still 'drafted' (nothing sent), each compliant.
  const msgs = db.prepare("SELECT * FROM messages").all();
  assert.equal(msgs.length, 4);
  for (const m of msgs) {
    assert.equal(m.direction, "outbound");
    assert.equal(m.status, "drafted");
    assert.equal(m.approved_by, null);
    assert.equal(m.sent_at, null);
    assert.ok(m.body && /stop/i.test(m.body), "draft includes opt-out");
    assert.ok(m.body.length <= 320, "draft under 320 chars");
  }

  // Hard assertion: NO message advanced past 'drafted' and NO conversation past
  // 'pending_approval' — this step drafts only, it must never send.
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE status <> 'drafted'`).get().n,
    0,
    "no message may advance beyond 'drafted'"
  );
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM conversations WHERE status <> 'pending_approval'`).get().n,
    0,
    "no conversation may advance beyond 'pending_approval'"
  );

  // Idempotent: re-running finds nothing un-scored.
  const again = await scoreUnscored({
    db,
    scorer: makeFakeScorer(expectationByCallId),
    drafter: fakeDrafter,
    firmId,
  });
  assert.equal(again.length, 0, "second run finds no un-scored calls");

  // --- PRINT the drafted first-messages for the signable leads ---------------
  console.log("\nDrafted first-messages (leaked-signable leads, status=drafted):\n");
  const rows = db
    .prepare(
      `SELECT c.caller_name, m.status, m.body
         FROM messages m
         JOIN conversations cv ON cv.id = m.conversation_id
         JOIN flags f ON f.id = cv.flag_id
         JOIN calls c ON c.id = f.call_id
        ORDER BY c.id`
    )
    .all();
  for (const r of rows) {
    console.log(`  ${(r.caller_name ?? "").padEnd(16)} [${r.status}] ${r.body}`);
  }
  console.log("");
});
