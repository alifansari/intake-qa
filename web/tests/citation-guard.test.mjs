// Citation guard tests (Stage 1): exact snippet passes; minor transcription drift
// passes; a fabricated snippet fails AND is logged to the review queue.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { validateCitation, citationScore, guardAndLog, THRESHOLD } from "../analysis/citation-guard.mjs";

const TRANSCRIPT = [
  "Q. And after the accident, did you get medical treatment that same day?",
  "A. Yeah, they took me to the ER. My neck and my lower back, still bothering me now.",
  "Q. Okay. Someone will reach out. Let me take your number.",
  "A. So somebody's gonna call me back today, or —",
  "Q. We'll be in touch. Thanks for calling.",
].join("\n");

test("exact snippet passes at ~1.0", () => {
  const r = validateCitation({ verbatim_snippet: "they took me to the ER" }, TRANSCRIPT);
  assert.equal(r.ok, true);
  assert.ok(r.score >= 0.99);
});

test("minor transcription drift (one word typo in a longer snippet) still passes", () => {
  // "reach out" transcript vs "reach oout" citation — a single-char drift in a
  // long snippet keeps the ratio at/above threshold.
  const r = validateCitation(
    { verbatim_snippet: "Okay. Someone will reach oout. Let me take your number." },
    TRANSCRIPT,
  );
  assert.ok(r.score >= THRESHOLD, `expected >= ${THRESHOLD}, got ${r.score}`);
  assert.equal(r.ok, true);
});

test("fabricated snippet fails (well below threshold)", () => {
  const r = validateCitation(
    { verbatim_snippet: "the caller confirmed they already signed with our firm last week" },
    TRANSCRIPT,
  );
  assert.equal(r.ok, false);
  assert.ok(r.score < THRESHOLD);
});

test("citationScore: empty snippet or transcript scores 0", () => {
  assert.equal(citationScore("", TRANSCRIPT), 0);
  assert.equal(citationScore("anything", ""), 0);
});

test("guardAndLog keeps valid citations and logs dropped ones to the review queue", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-guard-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const firmId = Number(db.prepare("INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('F', 8000, 1)").run().lastInsertRowid);
  const callId = Number(db.prepare("INSERT INTO calls (firm_id, source, received_at) VALUES (?, 'manual', '2026-06-01T00:00:00Z')").run(firmId).lastInsertRowid);
  const flagId = Number(db.prepare("INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable) VALUES (?, ?, 80, 1)").run(callId, firmId).lastInsertRowid);

  const citations = [
    { verbatim_snippet: "they took me to the ER" },           // valid
    { verbatim_snippet: "caller demanded a refund immediately" }, // fabricated
  ];
  const { passed, dropped } = await guardAndLog({ db, flagId, citations, transcript: TRANSCRIPT });

  assert.equal(passed.length, 1);
  assert.equal(dropped.length, 1);
  const logged = db.prepare("SELECT COUNT(*) n FROM citation_failures WHERE flag_id = ?").get(flagId).n;
  assert.equal(logged, 1, "the dropped citation is logged to the review queue");
});
