// Tests for the operator error log (migration 0007) + the error-alert email.
// No network, no key: the store helpers use a temp SQLite DB and the alert path
// runs in TEST_MODE with an injectable mailer, so it renders to a temp file and
// transmits nothing. The point is (a) logging never throws into the caller and
// (b) each error is alerted exactly once.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  logError,
  getRecentErrors,
  countRecentErrors,
  getUnalertedErrors,
  markErrorsAlerted,
} from "../ingest/db.mjs";
import { buildAlert, renderAlert, sendErrorAlert } from "../messaging/alerts.mjs";

function makeCtx(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-errors-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, dir };
}

test("logError inserts and getRecentErrors returns newest first", (t) => {
  const { db } = makeCtx(t);
  logError(db, { source: "pipeline.score", message: "first" });
  logError(db, { source: "api.onboard", message: "second", context: { firmId: 7 } });
  const rows = getRecentErrors(db, 10);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].message, "second");
  // Object context is JSON-stringified on the way in.
  assert.equal(rows[0].context, JSON.stringify({ firmId: 7 }));
  assert.equal(rows[1].message, "first");
});

test("logError coerces missing fields and never throws", (t) => {
  const { db } = makeCtx(t);
  // Deliberately sparse payload — logging must be robust, not strict.
  assert.doesNotThrow(() => logError(db, { source: null, message: undefined }));
  const rows = getRecentErrors(db, 5);
  assert.equal(rows[0].source, "unknown");
  assert.equal(rows[0].message, "");
  assert.equal(rows[0].alerted, 0);
});

test("countRecentErrors counts only rows since the cutoff", (t) => {
  const { db } = makeCtx(t);
  logError(db, { source: "s", message: "m" });
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(countRecentErrors(db, past), 1);
  assert.equal(countRecentErrors(db, future), 0);
});

test("markErrorsAlerted flips only the given ids", (t) => {
  const { db } = makeCtx(t);
  const a = logError(db, { source: "s", message: "a" });
  logError(db, { source: "s", message: "b" });
  const changed = markErrorsAlerted(db, [a]);
  assert.equal(changed, 1);
  const past = new Date(Date.now() - 60_000).toISOString();
  const unalerted = getUnalertedErrors(db, past);
  assert.equal(unalerted.length, 1);
  assert.equal(unalerted[0].message, "b");
});

test("buildAlert buckets counts per source", () => {
  const data = buildAlert({
    errors: [
      { id: 1, source: "pipeline.score", message: "x" },
      { id: 2, source: "pipeline.score", message: "y" },
      { id: 3, source: "webhook.callrail", message: "z" },
    ],
  });
  assert.equal(data.count, 3);
  assert.deepEqual(data.bySource, { "pipeline.score": 2, "webhook.callrail": 1 });
  assert.match(renderAlert(data), /3 new error/);
});

test("sendErrorAlert (EMAIL_ENABLED off) renders a file and marks rows alerted once", async (t) => {
  const { db, dir } = makeCtx(t);
  logError(db, { source: "pipeline.score", message: "boom", context: "stack..." });
  logError(db, { source: "api.onboard", message: "persist failed" });

  // EMAIL_ENABLED unset (the default) → file mode, regardless of TEST_MODE.
  const env = { TEST_MODE: "false", RESEND_API_KEY: "k" };
  let mailerCalled = false;
  const mailer = async () => {
    mailerCalled = true;
    return { id: "should-not-happen" };
  };

  const res = await sendErrorAlert({ db, env, mailer, outDir: dir });
  assert.equal(res.mode, "test");
  assert.equal(res.count, 2);
  assert.equal(mailerCalled, false, "EMAIL_ENABLED off must never call the mailer");
  assert.ok(existsSync(res.file));
  const html = readFileSync(res.file, "utf8");
  assert.match(html, /2 new errors/);
  assert.match(html, /boom/);

  // Second run finds nothing new — the rows were marked alerted.
  const again = await sendErrorAlert({ db, env, mailer, outDir: dir });
  assert.equal(again.mode, "none");
  assert.equal(again.count, 0);
});
