// Firm self-serve uploads (/desk/upload): the pure helpers (limits, friendly
// file errors, upload identity, status derivation) and the write/read path
// (registerUploadedCall + listFirmUploads) against a real migrated SQLite db —
// including the honesty requirement that a failed_scoring call is VISIBLE to
// the firm as "failed", not founder-only.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMigratedDb } from "../db/connection.mjs";
import { insertFlag, setTranscript, setCallStatus } from "../ingest/db.mjs";
import {
  STORAGE_UPLOAD_MAX_BYTES,
  directUploadMaxBytes,
  fileProblem,
  fileExtension,
  makeUploadExternalId,
  uploadFilenameFrom,
  deriveUploadStatus,
  registerUploadedCall,
} from "../ingest/uploads.mjs";
import { listFirmUploads } from "../beta/store.mjs";
import { upsertCall } from "../ingest/store.mjs";

function seed(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-uploads-"));
  const db = openMigratedDb(join(dir, "t.db"));
  t.after(() => db.close());
  const firmId = Number(
    db.prepare("INSERT INTO firms (name) VALUES ('F') RETURNING id").get().id,
  );
  return { db, firmId };
}

// --- limits -----------------------------------------------------------------

test("direct cap is honest per environment; storage cap matches the studio path", () => {
  assert.equal(directUploadMaxBytes({ VERCEL: "1" }), 4 * 1024 * 1024);
  assert.equal(directUploadMaxBytes({}), 25 * 1024 * 1024);
  assert.equal(STORAGE_UPLOAD_MAX_BYTES, 200 * 1024 * 1024);
});

// --- friendly file errors -----------------------------------------------------

test("fileProblem gives plain-English answers for the audience", () => {
  const cap = 200 * 1024 * 1024;
  assert.match(fileProblem("deposition.mp4", 100, cap), /video/);
  assert.match(fileProblem("notes.pdf", 100, cap), /document/);
  assert.match(fileProblem("call.amr", 100, cap), /MP3, M4A, or WAV/);
  const over = fileProblem("call.mp3", 250 * 1024 * 1024, cap);
  assert.match(over, /250MB/); // names the file's size
  assert.match(over, /200MB/); // and the real limit
  assert.equal(fileProblem("call.mp3", 100, cap), null);
  assert.equal(fileProblem("CALL.WAV", 100, cap), null); // case-insensitive ext
  assert.equal(fileExtension("noextension"), "");
});

// --- upload identity ----------------------------------------------------------

test("upload external id round-trips the filename (colons included) and is unique", () => {
  const a = makeUploadExternalId("Mon: morning calls.mp3");
  const b = makeUploadExternalId("Mon: morning calls.mp3");
  assert.notEqual(a, b); // same filename can never merge two calls
  assert.equal(uploadFilenameFrom(a), "Mon: morning calls.mp3");
  assert.equal(uploadFilenameFrom("not-an-upload"), null);
  assert.equal(uploadFilenameFrom(null), null);
});

// --- status derivation ----------------------------------------------------------

test("deriveUploadStatus maps pipeline facts to the firm-visible status", () => {
  assert.equal(deriveUploadStatus({ scored: 1 }), "done");
  assert.equal(deriveUploadStatus({ scored: true }), "done");
  assert.equal(deriveUploadStatus({ scored: 0, status: "failed_scoring" }), "failed");
  assert.equal(deriveUploadStatus({ scored: false, has_transcript: 1 }), "scoring");
  assert.equal(deriveUploadStatus({ scored: 0, has_transcript: 0 }), "waiting");
});

// --- write + read path ----------------------------------------------------------

test("registerUploadedCall creates a webhook-shaped consented call; listFirmUploads reports honest statuses", async (t) => {
  const { db, firmId } = seed(t);

  const waiting = await registerUploadedCall({
    db, firmId, recordingUrl: "/tmp/a.mp3", filename: "friday-calls.mp3",
  });
  const scoring = await registerUploadedCall({
    db, firmId, recordingUrl: "/tmp/b.mp3", filename: "b.wav",
  });
  const done = await registerUploadedCall({
    db, firmId, recordingUrl: "/tmp/c.mp3", filename: "c.m4a",
  });
  const failed = await registerUploadedCall({
    db, firmId, recordingUrl: "/tmp/d.mp3", filename: "d.mp3",
  });

  // The row is pipeline-identical to a webhook call: manual source, consented.
  const row = db.prepare("SELECT * FROM calls WHERE id = ?").get(waiting);
  assert.equal(row.source, "manual");
  assert.equal(row.consent_status, "consented");
  assert.ok(String(row.external_call_id).startsWith("upload:"));

  // Advance the others through the pipeline's real writes.
  setTranscript(db, scoring, "INTAKE: hello\nCALLER: I was rear-ended");
  setTranscript(db, done, "INTAKE: hello\nCALLER: dog bite");
  insertFlag(db, { call_id: done, firm_id: firmId, is_leaked_signable: 1 });
  setCallStatus(db, failed, "failed_scoring", "boom");

  // A CallRail-style call must NOT appear in the uploads list.
  upsertCall(db, {
    firm_id: firmId, source: "callrail", external_call_id: "CR1",
    received_at: new Date().toISOString(),
  });

  const rows = await listFirmUploads(db, firmId);
  assert.equal(rows.length, 4);
  const byId = new Map(rows.map((r) => [Number(r.id), deriveUploadStatus(r)]));
  assert.equal(byId.get(Number(waiting)), "waiting");
  assert.equal(byId.get(Number(scoring)), "scoring");
  assert.equal(byId.get(Number(done)), "done");
  assert.equal(byId.get(Number(failed)), "failed"); // firm-visible, not DB-only

  // Filenames come back for the status list.
  const names = rows.map((r) => uploadFilenameFrom(r.external_call_id)).sort();
  assert.deepEqual(names, ["b.wav", "c.m4a", "d.mp3", "friday-calls.mp3"]);

  // Firm-scoped: another firm sees nothing.
  const other = Number(db.prepare("INSERT INTO firms (name) VALUES ('G') RETURNING id").get().id);
  assert.equal((await listFirmUploads(db, other)).length, 0);
});

test("uploaded calls are exactly what the scoring worker picks up", async (t) => {
  const { db, firmId } = seed(t);
  const id = await registerUploadedCall({
    db, firmId, recordingUrl: "/tmp/x.mp3", filename: "x.mp3",
  });
  const { getUnscoredCalls } = await import("../ingest/store.mjs");
  const unscored = await getUnscoredCalls(db, firmId);
  assert.ok(unscored.some((c) => Number(c.id) === Number(id)));
});
