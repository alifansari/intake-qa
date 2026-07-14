// Throughput/scale orchestration: the bounded-concurrency scoring pool, the
// V2 shadow sampling gate, and the upload storage-availability diagnostics.
// These guard the scale fixes WITHOUT touching how a single call is scored.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { createFirm } from "../ingest/db.mjs";
import { upsertCall } from "../ingest/store.mjs";
import {
  scoreUnscored,
  scoreConcurrency,
  shadowSampleRate,
} from "../ingest/score-worker.mjs";
import {
  storageUploadAvailable,
  largeUploadConfigWarning,
  directUploadMaxBytes,
} from "../ingest/uploads.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-throughput-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

// --- concurrency knob --------------------------------------------------------

test("scoreConcurrency defaults to 4 and clamps to a safe range", () => {
  assert.equal(scoreConcurrency({}), 4);
  assert.equal(scoreConcurrency({ SCORE_CONCURRENCY: "6" }), 6);
  assert.equal(scoreConcurrency({ SCORE_CONCURRENCY: "1" }), 1);
  assert.equal(scoreConcurrency({ SCORE_CONCURRENCY: "999" }), 12); // hard cap
  assert.equal(scoreConcurrency({ SCORE_CONCURRENCY: "0" }), 4); // invalid -> default
  assert.equal(scoreConcurrency({ SCORE_CONCURRENCY: "nope" }), 4);
});

// --- shadow sampling gate ----------------------------------------------------

test("shadowSampleRate defaults to 1.0 and clamps to [0,1]", () => {
  assert.equal(shadowSampleRate({}), 1);
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "" }), 1);
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "0.25" }), 0.25);
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "0" }), 0);
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "5" }), 1); // clamp high
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "-3" }), 0); // clamp low
  assert.equal(shadowSampleRate({ V2_SHADOW_SAMPLE_RATE: "junk" }), 1);
});

// --- bounded-concurrency pool ------------------------------------------------

test("scoreUnscored scores the whole batch and never exceeds SCORE_CONCURRENCY in flight", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Volume Firm", avg_case_fee: 9000 });

  const N = 9;
  for (let i = 0; i < N; i++) {
    await upsertCall(db, {
      firm_id: firmId,
      source: "manual",
      external_call_id: `vol-${i}`,
      transcript: `INTAKE: hi\nCALLER: I was rear-ended, call ${i}`,
      received_at: "2026-07-13T12:00:00Z",
    });
  }

  let inFlight = 0;
  let peak = 0;
  // A fake scorer with an await point so multiple calls are genuinely in flight
  // at once; it records the peak concurrency the pool ever reaches.
  const scorer = async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight -= 1;
    return { scores: { overall: 70 }, alerts: { lost_signable_case: false }, _v2_shadow: {} };
  };

  const prev = process.env.SCORE_CONCURRENCY;
  process.env.SCORE_CONCURRENCY = "3";
  try {
    const results = await scoreUnscored({ db, scorer, firmId });
    assert.equal(results.length, N, "every call in the batch is processed");
    assert.ok(peak > 1, "calls actually run in parallel (peak > 1)");
    assert.ok(peak <= 3, `peak in-flight (${peak}) never exceeds the concurrency limit`);
  } finally {
    if (prev === undefined) delete process.env.SCORE_CONCURRENCY;
    else process.env.SCORE_CONCURRENCY = prev;
  }

  // All calls left as scored/analyzed (a flag row exists for each).
  const flagCount = db.prepare("SELECT COUNT(*) AS n FROM flags").get().n;
  assert.equal(Number(flagCount), N, "one flag per call, no call dropped by the pool");
});

test("SCORE_CONCURRENCY=1 forces strictly serial processing", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Serial Firm", avg_case_fee: 9000 });
  for (let i = 0; i < 4; i++) {
    await upsertCall(db, {
      firm_id: firmId, source: "manual", external_call_id: `ser-${i}`,
      transcript: `INTAKE: hi\nCALLER: dog bite ${i}`, received_at: "2026-07-13T12:00:00Z",
    });
  }
  let inFlight = 0;
  let peak = 0;
  const scorer = async () => {
    inFlight += 1; peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight -= 1;
    return { scores: { overall: 70 }, alerts: { lost_signable_case: false }, _v2_shadow: {} };
  };
  const prev = process.env.SCORE_CONCURRENCY;
  process.env.SCORE_CONCURRENCY = "1";
  try {
    const results = await scoreUnscored({ db, scorer, firmId });
    assert.equal(results.length, 4);
    assert.equal(peak, 1, "with concurrency 1 only one call is ever in flight");
  } finally {
    if (prev === undefined) delete process.env.SCORE_CONCURRENCY;
    else process.env.SCORE_CONCURRENCY = prev;
  }
});

// --- upload storage availability + loud diagnostic ---------------------------

test("storageUploadAvailable requires BOTH Supabase env vars", () => {
  assert.equal(storageUploadAvailable({}), false);
  assert.equal(storageUploadAvailable({ NEXT_PUBLIC_SUPABASE_URL: "u" }), false);
  assert.equal(storageUploadAvailable({ SUPABASE_SERVICE_ROLE_KEY: "k" }), false);
  assert.equal(
    storageUploadAvailable({ NEXT_PUBLIC_SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k" }),
    true,
  );
});

test("largeUploadConfigWarning is LOUD about the missing key, and silent when there's no gap", () => {
  const vercel = { VERCEL: "1" };
  const big = directUploadMaxBytes(vercel) + 1;

  // Storage not configured + oversized file -> names the real cause.
  const warn = largeUploadConfigWarning(big, vercel);
  assert.ok(warn, "a config gap produces a warning");
  assert.match(warn, /SUPABASE_SERVICE_ROLE_KEY/);

  // Storage configured -> no config warning (the 200MB path handles it).
  assert.equal(
    largeUploadConfigWarning(big, {
      ...vercel, NEXT_PUBLIC_SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k",
    }),
    null,
  );
  // Small file that fits the direct cap -> no warning.
  assert.equal(largeUploadConfigWarning(100, vercel), null);
});
