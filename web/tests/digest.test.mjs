// Tests for the daily approval-queue digest. EMAIL_ENABLED is off by default,
// so nothing is emailed — the digest renders to an HTML file. Also verifies the
// DIGEST_TO internal-only guard (no recipient → skip entirely), the funnel
// counts, stale-first ordering, and that overdue drafts are called out. No SMS,
// no network: the digest only reports queue state, it never approves or sends.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { buildDigest, sendDailyDigest } from "../messaging/digest.mjs";
import { STALE_DRAFT_HOURS } from "../messaging/sla.mjs";

const NOW = new Date("2025-01-15T12:00:00Z");
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-digest-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, dir };
}

// Seed a firm + one leaked flag/conversation + two DRAFTED outbound messages
// with explicit created_at: one fresh (2h) and one overdue (30h).
function seed(db) {
  const firmId = Number(
    db
      .prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES (?, ?, 0)`)
      .run("Digest Firm", 8500).lastInsertRowid
  );
  const callId = Number(
    db
      .prepare(
        `INSERT INTO calls (firm_id, source, caller_phone, caller_name, received_at)
         VALUES (?, 'manual', '+15550100200', 'Fresh Fiona', ?)`
      )
      .run(firmId, NOW.toISOString()).lastInsertRowid
  );
  const flagId = Number(
    db
      .prepare(
        `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason)
         VALUES (?, ?, 44, 1, 'leaked-signable')`
      )
      .run(callId, firmId).lastInsertRowid
  );
  const convId = Number(
    db
      .prepare(
        `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis)
         VALUES (?, ?, '+15550100200', 'pending_approval', 'inbound_call_inquiry_EBR')`
      )
      .run(flagId, firmId).lastInsertRowid
  );
  db.prepare(
    `INSERT INTO messages (conversation_id, direction, body, status, created_at)
     VALUES (?, 'outbound', 'Fresh draft. Reply STOP to opt out.', 'drafted', ?)`
  ).run(convId, hoursAgo(2));
  db.prepare(
    `INSERT INTO messages (conversation_id, direction, body, status, created_at)
     VALUES (?, 'outbound', 'Overdue draft. Reply STOP to opt out.', 'drafted', ?)`
  ).run(convId, hoursAgo(30));
  return { firmId };
}

test("buildDigest: counts pending + stale, sorts overdue first", (t) => {
  const { db } = makeDb(t);
  const { firmId } = seed(db);
  const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(firmId);
  const drafted = db
    .prepare(
      `SELECT m.*, cv.caller_phone, c.caller_name
         FROM messages m
         JOIN conversations cv ON cv.id = m.conversation_id
         JOIN flags f ON f.id = cv.flag_id
         JOIN calls c ON c.id = f.call_id
        WHERE m.status = 'drafted'`
    )
    .all();

  const data = buildDigest({ firm, drafted, now: NOW });
  assert.equal(data.pendingCount, 2);
  assert.equal(data.staleCount, 1);
  assert.ok(data.items[0].stale, "overdue draft sorts first");
  assert.equal(data.items[0].body.startsWith("Overdue"), true);
});

test("sendDailyDigest: skips entirely when DIGEST_TO is unset (internal-only guard)", async (t) => {
  const { db, dir } = makeDb(t);
  const { firmId } = seed(db);

  let mailerCalled = false;
  // Fully armed for email — but no DIGEST_TO means no digest at all. This
  // internal operator email must never fall back toward a firm contact.
  const res = await sendDailyDigest({
    db,
    firmId,
    env: { EMAIL_ENABLED: "true", RESEND_API_KEY: "k", RESEND_FROM: "ops@x.t" },
    mailer: async () => {
      mailerCalled = true;
      return { id: "SHOULD_NOT_HAPPEN" };
    },
    outDir: dir,
    now: NOW,
  });
  assert.equal(res.mode, "skipped");
  assert.match(String(res.reason), /DIGEST_TO/);
  assert.equal(mailerCalled, false, "missing DIGEST_TO must never email");
});

test("sendDailyDigest: renders an HTML file while EMAIL_ENABLED is off, transmits nothing", async (t) => {
  const { db, dir } = makeDb(t);
  const { firmId } = seed(db);

  let mailerCalled = false;
  const res = await sendDailyDigest({
    db,
    firmId,
    // TEST_MODE=false on purpose: email is gated by EMAIL_ENABLED, not TEST_MODE.
    env: { TEST_MODE: "false", DIGEST_TO: "ops@internal.test" },
    mailer: async () => {
      mailerCalled = true;
      return { id: "SHOULD_NOT_HAPPEN" };
    },
    outDir: dir,
    now: NOW,
  });

  assert.equal(res.mode, "test");
  assert.equal(mailerCalled, false, "EMAIL_ENABLED off must not email");
  assert.ok(existsSync(res.file), "digest HTML file written");
  const html = readFileSync(res.file, "utf8");
  assert.ok(html.includes("overdue"), "overdue draft is flagged in the HTML");
  assert.ok(html.includes("Fresh Fiona"), "caller name rendered");
  assert.ok(html.includes("PILOT MODE"), "compliance footer present");
  assert.ok(STALE_DRAFT_HOURS === 12);
});

test("sendDailyDigest: emails DIGEST_TO when EMAIL_ENABLED is on (even with TEST_MODE on)", async (t) => {
  const { db, dir } = makeDb(t);
  const { firmId } = seed(db);

  const sent = [];
  const res = await sendDailyDigest({
    db,
    firmId,
    // TEST_MODE=true: SMS stays simulated; email is armed independently.
    env: {
      TEST_MODE: "true",
      EMAIL_ENABLED: "true",
      RESEND_API_KEY: "k",
      RESEND_FROM: "ops@x.t",
      DIGEST_TO: "ops@internal.test",
    },
    mailer: async (m) => {
      sent.push(m);
      return { id: "id1" };
    },
    outDir: dir,
    now: NOW,
  });
  assert.equal(res.mode, "live");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "ops@internal.test");
});

test("sendDailyDigest: empty queue reports a clear state", async (t) => {
  const { db, dir } = makeDb(t);
  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, kill_switch) VALUES ('Empty Firm', 0)`).run().lastInsertRowid
  );
  const res = await sendDailyDigest({
    db,
    firmId,
    env: { DIGEST_TO: "ops@internal.test" },
    outDir: dir,
    now: NOW,
  });
  assert.equal(res.data.pendingCount, 0);
  assert.equal(res.data.staleCount, 0);
  const html = readFileSync(res.file, "utf8");
  assert.ok(html.includes("clear"), "clear-queue message shown");
});
