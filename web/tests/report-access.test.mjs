// Report access-event logging (Stage 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { logReportAccess, countReportAccess } from "../ingest/store.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-access-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  return db;
}

test("counts views, downloads, and distinct viewers for a token", async (t) => {
  const db = makeDb(t);
  const token = "tok-abc";
  await logReportAccess(db, { token, event_type: "view", viewer_fingerprint: "fp1" });
  await logReportAccess(db, { token, event_type: "view", viewer_fingerprint: "fp1" }); // same viewer
  await logReportAccess(db, { token, event_type: "view", viewer_fingerprint: "fp2" }); // forwarded
  await logReportAccess(db, { token, event_type: "download", viewer_fingerprint: "fp2" });
  // a different report's events must not bleed in
  await logReportAccess(db, { token: "other", event_type: "view", viewer_fingerprint: "fp9" });

  const c = await countReportAccess(db, token);
  assert.equal(Number(c.views), 3);
  assert.equal(Number(c.downloads), 1);
  assert.equal(Number(c.distinct_viewers), 2, "two distinct fingerprints (a forward)");
});
