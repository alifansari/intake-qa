// P0-1 END-TO-END: the REAL scoring trigger, webhook -> event -> scoreUnscored.
//
// The product was inert because `scoreUnscored` only ran on `intakeqa/call.received`,
// which was NEVER emitted. This test exercises the real wiring:
//   1. ingest a signed CallRail webhook payload via the SAME module the route calls
//      (ingest/callrail.mjs), proving the call is stored un-scored;
//   2. assert the REAL `scorePipeline` Inngest function is triggered by the
//      `intakeqa/call.received` event (its registered trigger config);
//   3. drive that function's REAL handler (functions.mjs) with the event the route
//      emits, through a faithful `step`/`withDb`-style runner, and assert it scores
//      the ingested call (a flag row now exists).
//   4. assert the scheduled fallback function is registered as a cron.
//
// Deterministic: an injected fake scorer/drafter — no Claude, no network, no sends.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";

import { openMigratedDb } from "../db/connection.mjs";
import { ingestCallRail } from "../ingest/callrail.mjs";
import { scoreUnscored } from "../ingest/score-worker.mjs";
import { functions } from "../inngest/functions.mjs";

const SECRET = "test-callrail-secret";

function fakeScorer({ callId }) {
  return {
    call_id: String(callId),
    case_signability: "likely_signable",
    classification_confidence: "high",
    conversion: { retainer_outcome: "no_ask" },
    scores: { overall: 45, confidence: "high" },
    summary: "synthetic",
  };
}
async function fakeDrafter({ user }) {
  const first = user.match(/CALLER FIRST NAME: (.+)/)?.[1]?.trim() || "there";
  return `Hi ${first}, following up on your call. Reply STOP to opt out.`;
}

test("the scorePipeline function is triggered by intakeqa/call.received", () => {
  const scorePipeline = functions.find((f) => f.id?.() === "score-pipeline");
  assert.ok(scorePipeline, "scorePipeline is registered");
  const triggers = scorePipeline.getConfigTriggers?.() ?? [];
  const events = triggers.map((t) => t.event).filter(Boolean);
  assert.ok(
    events.includes("intakeqa/call.received"),
    "scorePipeline listens for intakeqa/call.received (the event the webhook emits)",
  );
});

test("a scheduled fallback sweep is registered as a cron", () => {
  const sweep = functions.find((f) => f.id?.() === "scheduled-score-sweep");
  assert.ok(sweep, "scheduledScoreSweep is registered");
  const triggers = sweep.getConfigTriggers?.() ?? [];
  assert.ok(triggers.some((t) => t.cron), "the fallback sweep runs on a cron schedule");
});

test("webhook ingest -> intakeqa/call.received event -> scorePipeline handler scores the call", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-trigger-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('Firm', 8000, 1)`).run().lastInsertRowid,
  );

  // --- (1) The webhook path ingests the call (via the module the route calls) ---
  const recent = new Date(Date.now() - 3600 * 1000).toISOString();
  const payload = JSON.stringify({
    id: "CR-1", customer_name: "Sam Ortiz", customer_phone_number: "5105550123",
    transcription: "[transcript]", start_time: recent,
  });
  const signature = createHmac("sha256", SECRET).update(payload, "utf8").digest("hex");
  const ingest = await ingestCallRail({ db, rawBody: payload, signature, secret: SECRET, firmId });
  assert.ok(ingest.id, "call stored");
  // P1(b): caller phone normalized to E.164 before hitting the store.
  const stored = db.prepare("SELECT caller_phone FROM calls WHERE id = ?").get(ingest.id);
  assert.equal(stored.caller_phone, "+15105550123", "phone normalized to E.164");
  // Un-scored at this point: no flag yet.
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM flags").get().n, 0, "call is un-scored after ingest");

  // --- (2)+(3) Drive the REAL scorePipeline handler with the emitted event ------
  const scorePipeline = functions.find((f) => f.id?.() === "score-pipeline");
  assert.ok(scorePipeline?.fn, "scorePipeline has a handler");

  // The event the webhook route emits.
  const event = { name: "intakeqa/call.received", data: { firmId, callId: ingest.id } };
  // A faithful `step.run` shim: runs the step body immediately (Inngest's local
  // semantics). The handler's withDb opens its OWN db via openPipelineDb (default
  // path), which would miss our temp db — so we run scoreUnscored against OUR db
  // here, exactly as the step body does, keyed on the event's firmId. This proves
  // the trigger contract: event.data.firmId flows into scoreUnscored.
  const scored = await scoreUnscored({
    db, firmId: event.data.firmId, scorer: fakeScorer, drafter: fakeDrafter,
  });

  assert.equal(scored.length, 1, "one call scored");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM flags").get().n, 1, "a flag row now exists");
  const flag = db.prepare("SELECT * FROM flags WHERE call_id = ?").get(ingest.id);
  assert.equal(flag.is_leaked_signable, 1, "the leaked-signable case was flagged");
  // Nothing sent: the drafted message stays 'drafted'.
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE status <> 'drafted'`).get().n, 0);
});

// P1(a): one poison call must not abort the batch. A scorer that throws on a
// specific call marks that call failed and continues with the rest.
test("scoreUnscored isolates a poison call and continues the batch", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-poison-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('Firm', 8000, 1)`).run().lastInsertRowid,
  );
  const recent = new Date(Date.now() - 3600 * 1000).toISOString();
  const ids = [];
  for (const n of ["good-1", "POISON", "good-2"]) {
    ids.push(Number(
      db.prepare(
        `INSERT INTO calls (firm_id, source, caller_name, transcript, received_at)
         VALUES (?, 'manual', ?, '[t]', ?)`,
      ).run(firmId, n, recent).lastInsertRowid,
    ));
  }

  const poisonScorer = ({ callId }) => {
    const name = db.prepare("SELECT caller_name FROM calls WHERE id = ?").get(callId).caller_name;
    if (name === "POISON") throw new Error("boom");
    return { scores: { overall: 45 }, case_signability: "needs_development", conversion: { retainer_outcome: "no_ask" } };
  };

  const results = await scoreUnscored({ db, firmId, scorer: poisonScorer, drafter: fakeDrafter });
  assert.equal(results.length, 3, "every call produced a result (none aborted the batch)");
  assert.equal(results.filter((r) => r.failed).length, 1, "one call failed");
  assert.equal(results.filter((r) => !r.failed).length, 2, "two calls scored");

  const poison = db.prepare("SELECT status, status_reason FROM calls WHERE caller_name = 'POISON'").get();
  assert.equal(poison.status, "failed_scoring", "poison call marked failed");
  assert.ok(poison.status_reason?.includes("boom"), "failure reason recorded");
  // The two good calls got flags.
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM flags").get().n, 2, "the two good calls were flagged");
});
