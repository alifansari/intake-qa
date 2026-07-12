// Tests for the founder alerting engine: the signature-failure threshold, the
// one-email batching, the daily-pulse timing (8am America/Los_Angeles, once
// per day), the EMAIL_ENABLED/KILL_SWITCH file-render gate, and the full sweep
// against a temp SQLite DB (watermarks advance; a second sweep is silent).
// No network, no keys — the mailer is injectable and never reached with email
// off.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import * as store from "../ingest/store.mjs";
import { createFirm, logError, recordEvent, upsertCall, setCallStatus } from "../ingest/db.mjs";
import {
  isScoringFailure,
  isSignatureFailure,
  digestRunProblem,
  signatureFailureFirms,
  buildFounderAlert,
  buildBetaPulse,
  shouldSendDailyPulse,
  sendFounderEmail,
  runAlertSweep,
} from "../messaging/founder-alerts.mjs";

const NOW = new Date("2026-07-11T12:00:00Z");
const minsAgo = (m) => new Date(NOW.getTime() - m * 60_000).toISOString();

function makeCtx(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-falerts-"));
  const db = openMigratedDb(join(dir, "test.db"));
  const firmId = createFirm(db, { name: "Alert Firm", avg_case_fee: 8000 });
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, dir, firmId };
}

// --- classifiers -----------------------------------------------------------------

test("classifiers match on shape, not exact source strings (sibling-branch rows)", () => {
  assert.ok(isScoringFailure({ source: "score-worker.scoreUnscored", message: "call 9 failed to score: boom" }));
  assert.ok(isScoringFailure({ source: "pipeline.other", message: "status failed_scoring set" }));
  assert.ok(!isScoringFailure({ source: "webhooks.callrail", message: "bad payload" }));

  assert.ok(isSignatureFailure({ source: "webhooks.callrail_firm", message: "invalid signature" }));
  assert.ok(isSignatureFailure({ source: "callrail.signature", message: "rejected" }));
  assert.ok(!isSignatureFailure({ source: "webhooks.twilio", message: "invalid signature" })); // not CallRail
  assert.ok(!isSignatureFailure({ source: "webhooks.callrail", message: "timeout" }));
});

test("digestRunProblem flags skipped/failed firms and fail-loud rows, ignores clean runs", () => {
  const clean = {
    source: "digest.run",
    message: "digest run: 1 firm(s) — 1 emailed",
    context: JSON.stringify({ results: [{ firm: "f1", mode: "live" }] }),
  };
  assert.equal(digestRunProblem(clean), null);

  const bad = {
    source: "digest.run",
    message: "digest run: 2 firm(s)",
    context: JSON.stringify({
      results: [
        { firm: "f1", mode: "error" },
        { firm: "f2", mode: "skipped", reason: "no recipients" },
      ],
    }),
  };
  assert.match(digestRunProblem(bad), /2 firm\(s\) skipped or failed/);

  const failLoud = {
    source: "digest.run",
    message: "CRON_SECRET is not set — the Vercel digest cron cannot authenticate and daily digests will NEVER send until it is added to the environment.",
    context: JSON.stringify({ fix: "set it" }),
  };
  assert.match(digestRunProblem(failLoud), /CRON_SECRET/);
  assert.equal(digestRunProblem({ source: "other", message: "x" }), null);
});

// --- signature threshold ------------------------------------------------------------

test("signature threshold: 2 in the hour stays quiet, 3 trips, old rows do not count", () => {
  const row = (mins, firm = 7) => ({
    source: "webhooks.callrail_firm",
    message: "invalid signature",
    firm_id: firm,
    created_at: minsAgo(mins),
  });
  assert.deepEqual(signatureFailureFirms([row(5), row(10)], { now: NOW }), []);
  const tripped = signatureFailureFirms([row(5), row(10), row(30)], { now: NOW });
  assert.deepEqual(tripped, [{ firmId: "7", count: 3 }]);
  // Two inside the window + one 2h old: no alert.
  assert.deepEqual(signatureFailureFirms([row(5), row(10), row(120)], { now: NOW }), []);
  // Firms are counted separately.
  const mixed = signatureFailureFirms(
    [row(1, 1), row(2, 1), row(3, 1), row(4, 2)],
    { now: NOW },
  );
  assert.deepEqual(mixed, [{ firmId: "1", count: 3 }]);
});

// --- batching ------------------------------------------------------------------------

test("buildFounderAlert batches every trigger into ONE email; empty → null", () => {
  assert.equal(buildFounderAlert({ now: NOW }), null);
  const alert = buildFounderAlert({
    scoringFailures: [{ created_at: minsAgo(3), firm_id: 1, message: "call 9 failed to score" }],
    signatureFirms: [{ firmId: "1", count: 4 }],
    digestProblems: [{ created_at: minsAgo(9), problem: "1 firm(s) skipped or failed in the digest run: f2 (skipped)" }],
    newApplications: [{ firm_name: "Nguyen Law", name: "T. Nguyen", practice_area: "PI", state: "CA", status: "applied" }],
    now: NOW,
  });
  assert.ok(alert);
  assert.equal(alert.sections.length, 4);
  assert.match(alert.subject, /Scoring failed/);
  assert.match(alert.html, /Nguyen Law/);
  assert.match(alert.html, /rejected webhooks/);
});

// --- pulse timing ---------------------------------------------------------------------

test("daily pulse fires only in the 8am LA hour and only once per LA day", () => {
  // 2026-07-11 15:00 UTC = 08:00 PDT.
  const eightAmLA = new Date("2026-07-11T15:00:00Z");
  const nineAmLA = new Date("2026-07-11T16:00:00Z");
  assert.equal(shouldSendDailyPulse({ now: eightAmLA, lastSentDate: null }).send, true);
  assert.equal(shouldSendDailyPulse({ now: nineAmLA, lastSentDate: null }).send, false);
  // Already sent today → quiet, even in the right hour.
  assert.equal(
    shouldSendDailyPulse({ now: eightAmLA, lastSentDate: "2026-07-11" }).send,
    false,
  );
  // Sent yesterday → fires again today.
  assert.equal(
    shouldSendDailyPulse({ now: eightAmLA, lastSentDate: "2026-07-10" }).send,
    true,
  );
});

test("buildBetaPulse renders one line per firm", () => {
  const pulse = buildBetaPulse({
    firms: [
      { name: "Firm A", received: 12, scored: 11, acted: 2 },
      { name: "Firm B", received: 0, scored: 0, acted: 0 },
    ],
    date: "2026-07-11",
  });
  assert.equal(pulse.lines.length, 2);
  assert.match(pulse.lines[0], /Firm A: 12 received \/ 11 scored \/ 2 acted on/);
  assert.match(pulse.subject, /2026-07-11/);
});

// --- delivery gate ---------------------------------------------------------------------

test("sendFounderEmail: EMAIL_ENABLED off renders to file, transmits nothing", async (t) => {
  const { dir } = makeCtx(t);
  let mailed = 0;
  const res = await sendFounderEmail({
    subject: "s",
    html: "<p>x</p>",
    env: { FOUNDER_EMAIL: "ali@example.com", EMAIL_ENABLED: "false", RESEND_API_KEY: "set" },
    outDir: dir,
    mailer: async () => { mailed++; return { id: "no" }; },
    now: NOW,
  });
  assert.equal(res.mode, "test");
  assert.equal(mailed, 0);
  assert.equal(readFileSync(res.file, "utf8"), "<p>x</p>");
});

test("sendFounderEmail: KILL_SWITCH halts even with email fully armed", async (t) => {
  const { dir } = makeCtx(t);
  let mailed = 0;
  const res = await sendFounderEmail({
    subject: "s",
    html: "<p>x</p>",
    env: {
      FOUNDER_EMAIL: "ali@example.com",
      EMAIL_ENABLED: "true",
      RESEND_API_KEY: "set",
      RESEND_FROM: "a@b.c",
      KILL_SWITCH: "true",
    },
    outDir: dir,
    mailer: async () => { mailed++; return { id: "no" }; },
    now: NOW,
  });
  assert.equal(res.mode, "test");
  assert.equal(mailed, 0);
});

test("sendFounderEmail: no FOUNDER_EMAIL → skip entirely (never another recipient)", async (t) => {
  const { dir } = makeCtx(t);
  const res = await sendFounderEmail({ subject: "s", html: "x", env: {}, outDir: dir, now: NOW });
  assert.equal(res.mode, "skipped");
  assert.equal(readdirSync(dir).filter((f) => f.startsWith("founder-alert")).length, 0);
});

test("sendFounderEmail: armed env emails FOUNDER_EMAIL via the injected mailer", async (t) => {
  const { dir } = makeCtx(t);
  const sent = [];
  const res = await sendFounderEmail({
    subject: "subject",
    html: "<p>x</p>",
    env: {
      FOUNDER_EMAIL: "ali@example.com",
      EMAIL_ENABLED: "true",
      RESEND_API_KEY: "set",
      RESEND_FROM: "alerts@plaintiffops.com",
    },
    outDir: dir,
    mailer: async (m) => { sent.push(m); return { id: "msg_1" }; },
    now: NOW,
  });
  assert.equal(res.mode, "live");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "ali@example.com");
});

// --- the full sweep ---------------------------------------------------------------------

test("runAlertSweep: batches one email, advances watermarks, second sweep is silent", async (t) => {
  const { db, dir, firmId } = makeCtx(t);
  // Trigger (a): a scoring failure. Trigger (b): 3 signature failures.
  logError(db, { source: "score-worker.scoreUnscored", message: "call 5 failed to score: x", firm_id: firmId });
  for (let i = 0; i < 3; i++) {
    logError(db, { source: "webhooks.callrail_firm", message: "invalid signature", firm_id: firmId });
  }
  // Trigger (c): a digest run with a failed firm.
  logError(db, {
    source: "digest.run",
    message: "digest run: 1 firm(s) — 0 emailed, 0 rendered-to-file, 0 skipped, 1 failed",
    context: { results: [{ firm: firmId, mode: "error" }] },
  });

  const env = { FOUNDER_EMAIL: "ali@example.com" }; // email off → file mode
  const first = await runAlertSweep({
    store,
    db,
    env,
    now: NOW,
    outDir: dir,
    listApplicants: async () => [
      { firm_name: "Nguyen Law", name: "T", practice_area: "PI", state: "CA", status: "applied", created_at: minsAgo(2) },
    ],
  });
  assert.ok(first.alert, "first sweep must produce an alert");
  assert.equal(first.alert.mode, "test");
  assert.equal(first.alert.sections, 4); // a + b + c + d, batched into one email
  const files = readdirSync(dir).filter((f) => f.startsWith("founder-alert"));
  assert.equal(files.length, 1, "exactly one alert file per sweep window");
  const html = readFileSync(join(dir, files[0]), "utf8");
  assert.match(html, /failed to score/);
  assert.match(html, /rejected webhooks/);
  assert.match(html, /Nguyen Law/);

  // Second sweep, nothing new: no second email, no re-alerting the same rows.
  const second = await runAlertSweep({
    store,
    db,
    env,
    now: new Date(NOW.getTime() + 5 * 60_000),
    outDir: dir,
    listApplicants: async () => [
      { firm_name: "Nguyen Law", name: "T", practice_area: "PI", state: "CA", status: "applied", created_at: minsAgo(2) },
    ],
  });
  assert.equal(second.alert, null, "second sweep with nothing new stays silent");
  assert.equal(readdirSync(dir).filter((f) => f.startsWith("founder-alert")).length, 1);
});

// --- stuck-unscored watchdog (Inngest-outage safety net) -------------------------------

test("buildFounderAlert surfaces stuck-unscored firms with count and oldest age", () => {
  const alert = buildFounderAlert({
    stuckUnscoredFirms: [
      { firm_id: 3, count: 5, oldest: new Date(NOW.getTime() - 3 * 3600_000).toISOString() },
    ],
    now: NOW,
  });
  assert.ok(alert);
  assert.equal(alert.sections.length, 1);
  assert.match(alert.subject, /never scored/);
  assert.match(alert.html, /firm 3: 5 call\(s\) stuck unscored/);
  assert.match(alert.html, /oldest 3h old/);
  assert.match(alert.html, /check Inngest/);
});

test("runAlertSweep: a call unscored past the threshold trips the alert; a fresh one does not", async (t) => {
  const { db, dir, firmId } = makeCtx(t);
  // Stale: received 3h ago, never scored (no flag, status NULL) — past the 2h default.
  upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    received_at: new Date(NOW.getTime() - 3 * 3600_000).toISOString(),
  });
  const env = { FOUNDER_EMAIL: "ali@example.com" }; // default 2h threshold, email off → file
  const first = await runAlertSweep({ store, db, env, now: NOW, outDir: dir, listApplicants: async () => [] });
  assert.ok(first.alert, "a stale unscored call must trip the sweep");
  const files = readdirSync(dir).filter((f) => f.startsWith("founder-alert"));
  assert.equal(files.length, 1);
  const html = readFileSync(join(dir, files[0]), "utf8");
  assert.match(html, /never scored/);
  assert.match(html, /stuck unscored/);
});

test("runAlertSweep: a fresh unscored call stays within the grace window (no alert)", async (t) => {
  const { db, dir, firmId } = makeCtx(t);
  // Received 30 min ago — well inside the 2h default threshold.
  upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    received_at: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
  });
  const env = { FOUNDER_EMAIL: "ali@example.com" };
  const res = await runAlertSweep({ store, db, env, now: NOW, outDir: dir, listApplicants: async () => [] });
  assert.equal(res.alert, null, "a 30-min-old unscored call is within the grace window");
});

test("runAlertSweep: 8am LA pulse renders per-firm received/scored/acted and dedupes by day", async (t) => {
  const { db, dir, firmId } = makeCtx(t);
  const eightAmLA = new Date("2026-07-11T15:00:00Z"); // 08:00 PDT
  const nowIso = eightAmLA.toISOString();
  const c1 = upsertCall(db, { firm_id: firmId, source: "manual", received_at: nowIso });
  upsertCall(db, { firm_id: firmId, source: "manual", received_at: nowIso });
  setCallStatus(db, c1.id, "analyzed");
  recordEvent(db, { event: "callback_marked", firm_id: firmId });

  const env = { FOUNDER_EMAIL: "ali@example.com" };
  const first = await runAlertSweep({ store, db, env, now: eightAmLA, outDir: dir, listApplicants: async () => [] });
  assert.ok(first.pulse, "pulse fires in the 8am LA hour");
  const pulseFiles = readdirSync(dir).filter((f) => f.startsWith("beta-pulse"));
  assert.equal(pulseFiles.length, 1);
  const html = readFileSync(join(dir, pulseFiles[0]), "utf8");
  assert.match(html, /Alert Firm: 2 received \/ 1 scored \/ 1 acted on/);

  // Same day, an hour later (still-8am edge is gone; and the date watermark holds).
  const later = await runAlertSweep({
    store,
    db,
    env,
    now: new Date(eightAmLA.getTime() + 30 * 60_000), // 08:30 PDT, same LA day
    outDir: dir,
    listApplicants: async () => [],
  });
  assert.equal(later.pulse, null, "one pulse per LA day");
});
