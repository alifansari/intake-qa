// Tests for the WEEKLY RECONCILIATION report: the honest math (signed-only
// recovered figure, funnel counts, multiple-of-subscription, month-to-date, and
// the "case of the week") and the TEST_MODE render-to-file gate (no email sent).
//
// The honesty layer is the point: unsigned leads (lost / no_response) must add
// ZERO dollars and must not appear in the signed/recovered table.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { recordOutcome, weekOf } from "../messaging/outcome.mjs";
import { reconcileWeek, roundMultiple } from "../messaging/reconcile.mjs";
import { sendWeeklyReport } from "../messaging/weekly-report.mjs";

const AVG_FEE = 8500;
const SUBSCRIPTION = 1500;

// A fixed instant; the report week is derived via weekOf so nothing is hardcoded.
const NOW = new Date("2026-06-17T12:00:00Z");
const CREATED = NOW.toISOString(); // inside the report week window

const TEST_ENV = { TEST_MODE: "true" }; // no RESEND_API_KEY -> render to file

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-recon-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db) {
  return Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, 0)`
      )
      .run("Meridian Injury Law", AVG_FEE, "America/Los_Angeles", SUBSCRIPTION).lastInsertRowid
  );
}

// Create a lead (call + flag), and optionally a conversation, with explicit
// created_at so it lands inside the report week. Returns ids.
function makeLead(db, firmId, { name, phone, leaked, reason, conversation = false, replied = false }) {
  const callId = Number(
    db
      .prepare(
        `INSERT INTO calls (firm_id, source, caller_phone, caller_name, received_at, created_at)
         VALUES (?, 'manual', ?, ?, ?, ?)`
      )
      .run(firmId, phone, name, CREATED, CREATED).lastInsertRowid
  );
  const flagId = Number(
    db
      .prepare(
        `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason, created_at)
         VALUES (?, ?, 45, ?, ?, ?)`
      )
      .run(callId, firmId, leaked ? 1 : 0, reason, CREATED).lastInsertRowid
  );
  let convId = null;
  if (conversation) {
    convId = Number(
      db
        .prepare(
          `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis, created_at)
           VALUES (?, ?, ?, 'active', 'inbound_call_inquiry_EBR', ?)`
        )
        .run(flagId, firmId, phone, CREATED).lastInsertRowid
    );
    if (replied) {
      db.prepare(
        `INSERT INTO messages (conversation_id, direction, body, status, created_at)
         VALUES (?, 'inbound', 'Yes please call me', 'received', ?)`
      ).run(convId, CREATED);
    }
  }
  return { callId, flagId, convId };
}

test("pure: roundMultiple", () => {
  assert.equal(roundMultiple(20500, 1500), 13.7);
  assert.equal(roundMultiple(0, 1500), 0);
  assert.equal(roundMultiple(5000, 0), 0);
  assert.equal(roundMultiple(5000, null), 0);
});

test("reconcileWeek counts signed-only dollars and the full funnel", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);

  // Four leaked leads -> conversations; two of them reply.
  const signedA = makeLead(db, firmId, {
    name: "Signed Sara", phone: "+15550100201", leaked: 1,
    reason: "dog bite", conversation: true, replied: true,
  });
  const signedB = makeLead(db, firmId, {
    name: "Signed Sam", phone: "+15550100202", leaked: 1,
    reason: "rear-end MVA", conversation: true, replied: true,
  });
  const lost = makeLead(db, firmId, {
    name: "Unsigned Uma", phone: "+15550100203", leaked: 1,
    reason: "slip and fall", conversation: true,
  });
  const noResp = makeLead(db, firmId, {
    name: "Unsigned Ulf", phone: "+15550100204", leaked: 1,
    reason: "premises", conversation: true,
  });
  // Two NON-leaked flags — must not count as flagged.
  makeLead(db, firmId, { name: "Clean Cara", phone: "+15550100205", leaked: 0, reason: "signed on first call" });
  makeLead(db, firmId, { name: "Clean Cyd", phone: "+15550100206", leaked: 0, reason: "declined, out of scope" });

  // Outcomes: two signed (8500 default + 12000 explicit), two unsigned ($0).
  await recordOutcome({ db, conversationId: signedA.convId, result: "signed", now: NOW }); // -> avg 8500
  await recordOutcome({ db, conversationId: signedB.convId, result: "signed", recoveredFee: 12000, now: NOW });
  await recordOutcome({ db, conversationId: lost.convId, result: "lost", now: NOW });
  await recordOutcome({ db, conversationId: noResp.convId, result: "no_response", now: NOW });

  const data = await reconcileWeek({ db, firmId, weekDate: NOW });

  assert.equal(data.weekOf, weekOf(NOW));
  assert.equal(data.flaggedCount, 4); // leaked only
  assert.equal(data.reEngagedCount, 4); // conversations created this week
  assert.equal(data.repliedCount, 2); // two got inbound replies
  assert.equal(data.signedCount, 2);
  assert.equal(data.recoveredFees, 20500); // 8500 + 12000, SIGNED ONLY
  assert.equal(data.subscriptionPrice, SUBSCRIPTION);
  assert.equal(data.multiple, 13.7); // 20500 / 1500
  assert.equal(data.monthToDateRecovered, 20500);
  assert.ok(data.caseOfWeek);
  assert.equal(data.caseOfWeek.fee, 12000); // the brag case
  assert.equal(data.caseOfWeek.name, "Signed Sam");

  // The signed table must contain ONLY the two signed callers.
  const names = data.signedCases.map((c) => c.name).sort();
  assert.deepEqual(names, ["Signed Sam", "Signed Sara"]);
  assert.ok(!names.includes("Unsigned Uma"));
  assert.ok(!names.includes("Unsigned Ulf"));
});

test("reconcileWeek reports $0 / 0x when nothing is signed", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const lead = makeLead(db, firmId, {
    name: "Unsigned Only", phone: "+15550100301", leaked: 1,
    reason: "mva", conversation: true, replied: true,
  });
  await recordOutcome({ db, conversationId: lead.convId, result: "lost", now: NOW });

  const data = await reconcileWeek({ db, firmId, weekDate: NOW });
  assert.equal(data.flaggedCount, 1);
  assert.equal(data.recoveredFees, 0);
  assert.equal(data.signedCount, 0);
  assert.equal(data.multiple, 0);
  assert.equal(data.monthToDateRecovered, 0);
  assert.equal(data.caseOfWeek, null);
});

test("sendWeeklyReport renders to an HTML file in TEST_MODE and never emails", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const signedA = makeLead(db, firmId, {
    name: "Signed Sara", phone: "+15550100401", leaked: 1,
    reason: "dog bite", conversation: true, replied: true,
  });
  const signedB = makeLead(db, firmId, {
    name: "Signed Sam", phone: "+15550100402", leaked: 1,
    reason: "rear-end MVA", conversation: true,
  });
  const lost = makeLead(db, firmId, {
    name: "Unsigned Uma", phone: "+15550100403", leaked: 1,
    reason: "slip and fall", conversation: true,
  });
  await recordOutcome({ db, conversationId: signedA.convId, result: "signed", now: NOW });
  await recordOutcome({ db, conversationId: signedB.convId, result: "signed", recoveredFee: 12000, now: NOW });
  await recordOutcome({ db, conversationId: lost.convId, result: "lost", now: NOW });

  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-report-out-"));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));

  // A mailer that must NEVER run in TEST_MODE.
  let mailed = false;
  const mailer = async () => {
    mailed = true;
    return { id: "SHOULD_NOT_HAPPEN" };
  };

  const res = await sendWeeklyReport({
    db, firmId, weekDate: NOW, mailer, env: TEST_ENV, outDir,
  });

  assert.equal(res.mode, "test");
  assert.equal(mailed, false); // gate held — nothing transmitted
  assert.ok(existsSync(res.file));

  const html = readFileSync(res.file, "utf8");
  assert.match(html, /\$20,500/); // headline recovered figure
  assert.match(html, /13\.7×/); // multiple of subscription
  assert.match(html, /Signed Sam/); // case of the week / signed table
  // The unsigned lead must NOT appear anywhere in the report.
  assert.ok(!html.includes("Unsigned Uma"));
});
