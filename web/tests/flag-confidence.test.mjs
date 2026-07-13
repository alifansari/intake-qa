// Flag enrichment: every REAL leaked-signable flag gets a confidence tier AND
// its transcript-validated verbatim quote written, so the desk card stops
// reading "Unrated" with no quote. Drives the actual score-worker over a manual
// ingest with a REAL transcript and an injected scorer, then reads back through
// listLeakedFlags exactly as the desk does.
//
// COMPLIANCE §IV is the point of the test: a fabricated evidence quote must be
// DROPPED (never shown), a real one must survive, and "strong" is only earned
// when the engine's high confidence is backed by a passing citation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { ingestManual } from "../ingest/manual.mjs";
import { scoreUnscored } from "../ingest/score-worker.mjs";
import { listLeakedFlags, getFlagConfidence } from "../ingest/store.mjs";

// A real transcript containing one exact qualifying line.
const TRANSCRIPT = [
  "INTAKE: Thanks for calling, how can I help?",
  "CALLER: I got rear-ended on the 405 last Tuesday and my back has been killing me ever since.",
  "CALLER: I haven't signed with any attorney yet.",
  "INTAKE: Okay, someone will reach out.",
].join("\n");

// Two leaked-signable calls. The first is HIGH confidence with a mix of one
// real quote and one fabricated quote; the second is MEDIUM confidence with only
// a fabricated quote.
const CALLS = [
  {
    name: "Real Quote",
    phone: "+15550100201",
    confidence: "high",
    quotes: [
      "I got rear-ended on the 405 last Tuesday", // verbatim → passes the guard
      "the caller was extremely angry about the delay", // fabricated → dropped
    ],
    expectTier: "strong",
    expectQuoteIncludes: "rear-ended on the 405",
  },
  {
    name: "No Valid Quote",
    phone: "+15550100202",
    confidence: "medium",
    quotes: ["the caller mentioned they might call back later"], // fabricated → dropped
    expectTier: "moderate",
    expectQuoteIncludes: null,
  },
];

function makeScorer(byCallId) {
  return async ({ callId }) => {
    const c = byCallId.get(String(callId));
    return {
      call_id: String(callId),
      case_signability: "likely_signable",
      classification_confidence: c.confidence,
      conversion: { retainer_outcome: "no_ask" },
      scores: { overall: 46, confidence: c.confidence },
      summary: `Synthetic score for ${c.name}`,
      alerts: {
        lost_signable_case: true,
        revenue_at_risk: {
          amount_usd: 45000,
          case_type_matched: "mva_standard",
          evidence_quotes: c.quotes,
        },
      },
    };
  };
}

// Compliant fake drafter: names the firm (draft validator requires it) and
// carries an opt-out. Parses firm/first name out of the prompt like pipeline.test.
async function fakeDrafter({ user }) {
  const firm = user.match(/FIRM NAME: (.+)/)?.[1]?.trim() || "the firm";
  const first = user.match(/CALLER FIRST NAME: (.+)/)?.[1]?.trim() || "there";
  return `Hi ${first}, this is the intake team at ${firm} following up on your call. Is now a good time for a quick callback? No obligation. Reply STOP to opt out.`;
}

test("leaked flags get a tier; only transcript-validated quotes are shown (§IV)", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-flagconf-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const firmId = Number(
    db
      .prepare(
        `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price, kill_switch)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run("Test Firm", 8500, "America/Los_Angeles", 1500, 1).lastInsertRowid
  );

  const recent = new Date(Date.now() - 3600 * 1000).toISOString();
  const byCallId = new Map();
  for (const c of CALLS) {
    const tPath = join(dir, `${c.name.replace(/\s/g, "_")}.txt`);
    writeFileSync(tPath, TRANSCRIPT);
    const { id } = await ingestManual({
      db,
      firmId,
      transcriptPath: tPath,
      callerName: c.name,
      callerPhone: c.phone,
      receivedAt: recent,
    });
    byCallId.set(String(id), c);
  }

  const flags = await scoreUnscored({
    db,
    scorer: makeScorer(byCallId),
    drafter: fakeDrafter,
    firmId,
  });
  assert.equal(flags.filter((f) => f.is_leaked_signable === 1).length, 2);

  const rows = await listLeakedFlags(db, firmId);
  assert.equal(rows.length, 2, "both leaked flags surface on the queue");

  const byName = new Map(rows.map((r) => [r.caller_name, r]));

  // HIGH confidence + one passing citation → strong, and the shown quote is the
  // real one (the fabricated quote was dropped, so citation_count is exactly 1).
  const strong = byName.get("Real Quote");
  assert.equal(strong.confidence_tier, "strong");
  assert.equal(Number(strong.citation_count), 1, "only the verbatim quote is stored");
  assert.match(strong.evidence_quote, /rear-ended on the 405/);

  // MEDIUM confidence and NO surviving citation → moderate, and NO quote is shown
  // (the fabricated line never reaches the card — no citation, no claim).
  const moderate = byName.get("No Valid Quote");
  assert.equal(moderate.confidence_tier, "moderate");
  assert.equal(Number(moderate.citation_count), 0);
  assert.equal(moderate.evidence_quote, null, "fabricated quote is never displayed");

  // The tier is genuinely persisted in flag_confidence (not a read-time default).
  assert.equal((await getFlagConfidence(db, strong.id)).confidence_tier, "strong");
});
