// Tests for DEMO MODE: the public, no-auth "upload one call, watch it get
// scored" pipeline. Everything is driven by injected deterministic FAKES — no
// AssemblyAI, no Claude, no network, no cost, and (by construction) NO sends:
// the demo pipeline writes only to demo_calls and never creates a message row.
//
// Covers: a leaked-signable call -> fee-at-risk + watermarked draft preview;
// a non-signable call -> honest "no leak"; audio deleted after transcription;
// rate limiting (concurrent + hourly); and the 72h retention purge.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { getDemoCall, createDemoCall, setDemoCallStatus } from "../ingest/db.mjs";
import {
  runDemoPipeline,
  checkDemoRateLimit,
  purgeDemo,
  buildDemoResult,
  scoreBand,
  estimateFeeAtRisk,
  pickEvidenceQuotes,
} from "../ingest/demo.mjs";

const CONFIG = {
  disclaimer: "Estimates — replaced by your firm's real numbers.",
  firmConfigPath: "config/demo-firm.md",
  firmConfigAbsPath: "config/demo-firm.md", // not read (scorer is faked)
  defaultFeeEstimate: 12000,
  feeEstimatesByCaseType: { mva_commercial: 45000, dog_bite: 15000 },
  retentionHours: 72,
};

const NOW = new Date("2026-06-17T12:00:00Z");

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-demo-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

const fakeTranscriber = async () => "[synthetic transcript]";

// A leaked-signable score: strong case, no ask made, commercial MVA.
const leakedScore = async () => ({
  case_signability: "likely_signable",
  classification_confidence: "high",
  conversion: { retainer_outcome: "no_ask" },
  scores: { overall: 47, confidence: "high" },
  case_type: "mva_commercial",
  signability_evidence: [
    "I was rear-ended by a delivery truck",
    "I've been in physical therapy for weeks",
    "no one ever offered to sign me up",
  ],
  summary: "Commercial MVA, clearly signable, intake never asked for the retainer.",
});

// A non-signable score: declinable, out of scope.
const declinableScore = async () => ({
  case_signability: "likely_declinable",
  classification_confidence: "high",
  conversion: { retainer_outcome: "n_a" },
  scores: { overall: 55, confidence: "high" },
  summary: "Out of scope inquiry.",
});

// Compliant fake drafter (names the firm, includes opt-out) for the preview.
const fakeDrafter = async () =>
  "Hi there, this is the intake team at Demo Personal Injury Firm following up on your call. Is now a good time for a quick callback? No obligation. Reply STOP to opt out.";

test("pure: scoreBand / estimateFeeAtRisk / pickEvidenceQuotes", () => {
  assert.equal(scoreBand(85), "strong");
  assert.equal(scoreBand(65), "moderate");
  assert.equal(scoreBand(30), "weak");
  assert.equal(scoreBand(null), "unknown");

  assert.equal(estimateFeeAtRisk({ case_type: "mva_commercial" }, CONFIG), 45000);
  assert.equal(estimateFeeAtRisk({ case_type: "unknown_type" }, CONFIG), 12000);
  assert.equal(estimateFeeAtRisk({}, CONFIG), 12000);

  const quotes = pickEvidenceQuotes({ signability_evidence: ["a", "b", "c", "d"] });
  assert.deepEqual(quotes, ["a", "b", "c"]);
  assert.deepEqual(pickEvidenceQuotes({}), []);
});

test("leaked-signable demo call -> fee-at-risk + watermarked draft preview", async (t) => {
  const db = makeDb(t);
  const id = createDemoCall(db, { client_ip: "10.0.0.1", filename: "call.mp3" });

  let deletedPath = null;
  const res = await runDemoPipeline({
    db,
    demoCallId: id,
    audioPath: "/tmp/fake-call.mp3",
    onAudioProcessed: async (p) => { deletedPath = p; },
    transcriber: fakeTranscriber,
    scorer: leakedScore,
    drafter: fakeDrafter,
    config: CONFIG,
    now: NOW,
  });

  assert.equal(res.ok, true);
  assert.equal(res.result.leaked, true);
  assert.equal(res.result.feeAtRisk, 45000); // mva_commercial estimate
  assert.equal(res.result.signability, "likely_signable");
  assert.equal(res.result.askMade, false); // no_ask -> team never asked
  assert.equal(res.result.evidenceQuotes.length, 3);
  assert.ok(res.result.draftPreview && /stop/i.test(res.result.draftPreview));
  assert.match(res.result.draftWatermark, /nothing is sent/i);
  assert.equal(deletedPath, "/tmp/fake-call.mp3"); // audio deletion hook fired

  const row = getDemoCall(db, id);
  assert.equal(row.status, "done");
  assert.equal(row.audio_deleted, 1);
  assert.ok(row.transcript && row.transcript.length > 0);
  const stored = JSON.parse(row.result_json);
  assert.equal(stored.feeAtRisk, 45000);
});

test("non-signable demo call -> honest 'no leak', no preview, $0 at risk", async (t) => {
  const db = makeDb(t);
  const id = createDemoCall(db, { client_ip: "10.0.0.2", filename: "call2.mp3" });

  const res = await runDemoPipeline({
    db,
    demoCallId: id,
    audioPath: "/tmp/fake2.mp3",
    onAudioProcessed: async () => {},
    transcriber: fakeTranscriber,
    scorer: declinableScore,
    drafter: fakeDrafter,
    config: CONFIG,
    now: NOW,
  });

  assert.equal(res.ok, true);
  assert.equal(res.result.leaked, false);
  assert.equal(res.result.feeAtRisk, 0);
  assert.equal(res.result.draftPreview, null);
  assert.match(res.result.reason, /below threshold/i);
});

test("buildDemoResult is pure and always carries the watermark", () => {
  const mapped = { is_leaked_signable: 0, reason: "not re-engaged" };
  const r = buildDemoResult({ score: { scores: { overall: 90 } }, mapped, config: CONFIG });
  assert.equal(r.leaked, false);
  assert.equal(r.feeAtRisk, 0);
  assert.equal(r.draftPreview, null);
  assert.match(r.draftWatermark, /nothing is sent/i);
});

test("rate limit: 1 concurrent, 3 per hour", async (t) => {
  const db = makeDb(t);
  const ip = "203.0.113.7";

  // One active (queued) upload -> concurrency gate refuses the next.
  createDemoCall(db, { client_ip: ip });
  let r = await checkDemoRateLimit({ db, ip, now: NOW });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "concurrent");

  // Move all of this IP's rows to terminal; now build up to the hourly cap.
  const first = createDemoCall(db, { client_ip: ip });
  const second = createDemoCall(db, { client_ip: ip });
  for (const rowId of [1, first, second]) setDemoCallStatus(db, rowId, "done", NOW.toISOString());
  // 3 rows created within the hour -> 4th refused by the hourly gate.
  r = await checkDemoRateLimit({ db, ip, now: NOW });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "hourly");

  // A different IP is unaffected.
  r = await checkDemoRateLimit({ db, ip: "198.51.100.9", now: NOW });
  assert.equal(r.allowed, true);
});

test("retention: purge nulls transcript + result for rows older than 72h", async (t) => {
  const db = makeDb(t);
  const id = createDemoCall(db, { client_ip: "10.0.0.3" });
  // Simulate a completed demo whose row is now 4 days old.
  const old = new Date(NOW.getTime() - 4 * 24 * 3600 * 1000).toISOString();
  db.prepare(
    "UPDATE demo_calls SET transcript = 'secret', result_json = '{\"x\":1}', created_at = ? WHERE id = ?"
  ).run(old, id);

  const purged = await purgeDemo({ db, now: NOW, retentionHours: 72 });
  assert.equal(purged, 1);
  const row = getDemoCall(db, id);
  assert.equal(row.transcript, null);
  assert.equal(row.result_json, null);

  // A fresh row is untouched.
  const fresh = createDemoCall(db, { client_ip: "10.0.0.4" });
  db.prepare("UPDATE demo_calls SET transcript = 'keep' WHERE id = ?").run(fresh);
  const purged2 = await purgeDemo({ db, now: NOW, retentionHours: 72 });
  assert.equal(purged2, 0);
  assert.equal(getDemoCall(db, fresh).transcript, "keep");
});
