// Rescue desk (modules 3/4/5/8/12). Load-bearing guarantees:
//   * HUMAN SIGN-OFF (invariant d) — an unreviewed or rejected flag can never
//     appear in a rescue packet; the packet reads only confirmed review items.
//   * TOP-3 CAP — a packet never exceeds 3 items, ranked value × recoverability.
//   * Rejection feedback tunes the firm's ruleset overrides.
//   * Ledger stages are forward-only; "recovered" requires signed AND
//     would-have-lost; holdout entries never pad recovered totals.
//   * CALLBACK ACTOR (invariant a) — a callback without a named firm employee
//     is unrecordable.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { enqueueForReview, confirmFlag, rejectFlag, surfaceableCandidates } from "../rescue/review.mjs";
import { rankRescueCandidates, buildDailyPacket, PACKET_CAP } from "../rescue/packet.mjs";
import {
  assessWouldHaveLost,
  advanceStage,
  ledgerSummary,
  ledgerToCsv,
  canAdvanceStage,
} from "../rescue/ledger.mjs";
import { recordCallback } from "../rescue/callback-audit.mjs";
import { solUrgency, speedToLeadOutliers } from "../rescue/sol-alerts.mjs";
import { routeByLanguage } from "../rescue/spanish-routing.mjs";
import { getFirmRulesetOverrides, listLedgerEntries, getLedgerEntryByFlag, parseJson } from "../beta/store.mjs";
import { mergeTunables, getRuleset, resolveFirmRuleset } from "../rulesets/index.mjs";

const NOW = new Date("2026-07-09T18:00:00Z");

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-rescue-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db, avgFee = 10000) {
  return Number(
    db
      .prepare(`INSERT INTO firms (name, avg_case_fee, reengage_window_hours) VALUES ('Test Firm', ?, 72)`)
      .run(avgFee).lastInsertRowid
  );
}

// A leaked-signable flag on a call received `hoursAgo` hours before NOW.
function makeFlag(db, firmId, { hoursAgo = 96, name = "Maria Caller", score = 85 } = {}) {
  const receivedAt = new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();
  const callId = Number(
    db
      .prepare(`INSERT INTO calls (firm_id, source, caller_name, caller_phone, received_at) VALUES (?, 'manual', ?, '+15551234567', ?)`)
      .run(firmId, name, receivedAt).lastInsertRowid
  );
  return Number(
    db
      .prepare(`INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason) VALUES (?, ?, ?, 1, 'voicemail; no callback made')`)
      .run(callId, firmId, score).lastInsertRowid
  );
}

// --- Review queue + invariant (d) -------------------------------------------------

test("only confirmed flags surface; pending and rejected never do", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const confirmed = makeFlag(db, firmId, { name: "Confirmed Case" });
  const pending = makeFlag(db, firmId, { name: "Pending Case" });
  const rejected = makeFlag(db, firmId, { name: "Junk Case" });

  const a = await enqueueForReview({ db, firmId, flagId: confirmed });
  await enqueueForReview({ db, firmId, flagId: pending });
  const c = await enqueueForReview({ db, firmId, flagId: rejected });

  await confirmFlag({ db, reviewItemId: a.reviewItemId, reviewer: "Ali Ansari", now: NOW });
  await rejectFlag({ db, reviewItemId: c.reviewItemId, reviewer: "Ali Ansari", reason: "already represented", now: NOW });

  const candidates = await surfaceableCandidates({ db, firmId });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].flag_id, confirmed);
});

test("enqueue is idempotent per flag; confirm/reject require a named reviewer", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const flagId = makeFlag(db, firmId);
  const first = await enqueueForReview({ db, firmId, flagId });
  const second = await enqueueForReview({ db, firmId, flagId });
  assert.equal(second.existed, true);
  assert.equal(second.reviewItemId, first.reviewItemId);
  await assert.rejects(confirmFlag({ db, reviewItemId: first.reviewItemId, reviewer: "  " }), /named reviewer/);
  await assert.rejects(rejectFlag({ db, reviewItemId: first.reviewItemId, reviewer: "" }), /named reviewer/);
});

test("rejection criteria feedback accumulates into firm ruleset overrides", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const flagId = makeFlag(db, firmId);
  const { reviewItemId } = await enqueueForReview({ db, firmId, flagId });
  await rejectFlag({
    db,
    reviewItemId,
    firmId,
    reviewer: "Ali Ansari",
    reason: "workers comp, excluded type",
    criteria: { tunable: "caseTypesExcluded", value: "workers_comp" },
    now: NOW,
  });
  const row = await getFirmRulesetOverrides(db, firmId);
  const overrides = parseJson(row.overrides, {});
  assert.deepEqual(overrides.caseTypesExcluded, ["workers_comp"]);

  // The resolved ruleset merges the override over california-pi defaults.
  const resolved = await resolveFirmRuleset(db, firmId);
  assert.deepEqual(resolved.tunables.caseTypesExcluded, ["workers_comp"]);
});

// --- Ranking + packet (top-3 cap) ----------------------------------------------------

test("rankRescueCandidates: value × recoverability ordering, top-3 cap, expired SOL dropped", () => {
  const candidates = [
    { flag_id: 1, est_value_cents: 100000, recoverability: 0.9 }, // 90k
    { flag_id: 2, est_value_cents: 500000, recoverability: 0.5 }, // 250k
    { flag_id: 3, est_value_cents: 200000, recoverability: 0.8 }, // 160k
    { flag_id: 4, est_value_cents: 300000, recoverability: 0.4 }, // 120k
    { flag_id: 5, est_value_cents: 900000, recoverability: 0.9, days_to_sol: -1 }, // expired -> dropped
  ];
  const ranked = rankRescueCandidates(candidates);
  assert.equal(ranked.length, PACKET_CAP);
  assert.deepEqual(ranked.map((c) => c.flag_id), [2, 3, 4]);
  assert.deepEqual(ranked.map((c) => c.rank), [1, 2, 3]);
});

test("buildDailyPacket: packets only confirmed flags, caps at 3, opens ledger entries, idempotent per day", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db, 10000); // $10k avg fee
  const flagIds = [];
  for (let i = 0; i < 5; i++) {
    const flagId = makeFlag(db, firmId, { hoursAgo: 100 + i, name: `Caller ${i}` });
    const { reviewItemId } = await enqueueForReview({ db, firmId, flagId });
    if (i < 4) {
      await confirmFlag({ db, reviewItemId, reviewer: "Ali Ansari", now: NOW });
      flagIds.push(flagId);
    }
  }

  const packet = await buildDailyPacket({ db, firmId, now: NOW });
  assert.equal(packet.items.length, 3); // 4 confirmed, capped at 3
  assert.ok(packet.items.every((i) => flagIds.includes(i.flag_id)));
  assert.ok(packet.items.every((i) => i.callback_script.length > 100));
  assert.ok(packet.items.every((i) => i.est_value_cents === 1000000)); // $10k avg fee

  // Ledger opened per item, would-have-lost = true (96h+ old, no next step, 72h window).
  const entries = await listLedgerEntries(db, firmId);
  assert.equal(entries.length, 3);
  assert.ok(entries.every((e) => e.would_have_lost === 1 || e.would_have_lost === true));
  assert.ok(new Set(entries.map((e) => e.rescue_tag)).size === 3);

  // Same day -> same packet, no duplicates.
  const again = await buildDailyPacket({ db, firmId, now: NOW });
  assert.equal(again.existed, true);
  assert.equal(again.items.length, 3);
});

// --- Would-have-lost gating + ledger stages ---------------------------------------------

test("assessWouldHaveLost: cold lead gates in, working lead gates out", () => {
  const cold = assessWouldHaveLost({
    callReceivedAt: "2026-07-05T00:00:00Z",
    followUpWindowHours: 72,
    hasScheduledNextStep: false,
    now: NOW,
  });
  assert.equal(cold.wouldHaveLost, true);

  const scheduled = assessWouldHaveLost({
    callReceivedAt: "2026-07-05T00:00:00Z",
    followUpWindowHours: 72,
    hasScheduledNextStep: true,
    now: NOW,
  });
  assert.equal(scheduled.wouldHaveLost, false);

  const fresh = assessWouldHaveLost({
    callReceivedAt: NOW.toISOString(),
    followUpWindowHours: 72,
    hasScheduledNextStep: false,
    now: NOW,
  });
  assert.equal(fresh.wouldHaveLost, false);
});

test("ledger: forward-only stages; recovered = signed AND would-have-lost; holdout excluded", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const flagId = makeFlag(db, firmId);
  const { reviewItemId } = await enqueueForReview({ db, firmId, flagId });
  await confirmFlag({ db, reviewItemId, reviewer: "Ali Ansari", now: NOW });
  await buildDailyPacket({ db, firmId, now: NOW });

  const entry = await getLedgerEntryByFlag(db, flagId);
  assert.equal(entry.stage, "flagged");
  assert.equal(canAdvanceStage("flagged", "signed"), false); // no stage skipping

  await advanceStage({ db, entryId: entry.id, to: "contacted", by: "Rosa Staffer", now: NOW });
  await advanceStage({ db, entryId: entry.id, to: "consult", by: "crm_sync", now: NOW });
  await advanceStage({ db, entryId: entry.id, to: "signed", by: "crm_sync", feeValueCents: 1200000, now: NOW });
  await assert.rejects(
    advanceStage({ db, entryId: entry.id, to: "contacted", now: NOW }),
    /illegal stage transition/
  );

  const entries = await listLedgerEntries(db, firmId);
  const summary = ledgerSummary(entries);
  assert.equal(summary.recoveredCount, 1);
  assert.equal(summary.recoveredFeeCents, 1200000);

  // Holdout + not-would-have-lost entries never count as recovered.
  const summary2 = ledgerSummary([
    { stage: "signed", would_have_lost: 1, control_holdout: 1, fee_value_cents: 5000 },
    { stage: "signed", would_have_lost: 0, control_holdout: 0, fee_value_cents: 7000 },
  ]);
  assert.equal(summary2.recoveredCount, 0);
  assert.equal(summary2.holdoutSignedCount, 1);
  assert.equal(summary2.signedNotGated, 1);

  const csv = ledgerToCsv(entries);
  assert.ok(csv.startsWith("rescue_tag,stage,would_have_lost"));
  assert.ok(csv.includes("RSQ-2026-000001"));
});

// --- Callback audit (invariant a) ------------------------------------------------------

test("recordCallback requires a named employee and advances the ledger to contacted", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  const flagId = makeFlag(db, firmId);
  const { reviewItemId } = await enqueueForReview({ db, firmId, flagId });
  await confirmFlag({ db, reviewItemId, reviewer: "Ali Ansari", now: NOW });
  await buildDailyPacket({ db, firmId, now: NOW });

  await assert.rejects(
    recordCallback({ db, firmId, flagId, employeeName: "", outcome: "reached" }),
    /firm employee/
  );

  const res = await recordCallback({
    db,
    firmId,
    flagId,
    employeeName: "Rosa Staffer",
    outcome: "reached",
    occurredAt: NOW,
  });
  assert.equal(res.ledgerAdvanced, true);
  const entry = await getLedgerEntryByFlag(db, flagId);
  assert.equal(entry.stage, "contacted");
});

// --- SOL + speed-to-lead + Spanish routing ----------------------------------------------

test("solUrgency bands and speedToLeadOutliers", () => {
  assert.equal(solUrgency({ deadlineIso: "2026-07-01", now: NOW }).band, "expired");
  assert.equal(solUrgency({ deadlineIso: "2026-07-20", now: NOW }).band, "critical");
  assert.equal(solUrgency({ deadlineIso: "2026-09-01", now: NOW }).band, "soon");
  assert.equal(solUrgency({ deadlineIso: "2027-07-01", now: NOW }).band, "ok");

  const rows = [30, 40, 45, 50, 55, 60, 65, 70, 80, 600].map((s) => ({ speed_to_lead_seconds: s }));
  const { outliers } = speedToLeadOutliers({ handlingRows: rows });
  assert.equal(outliers.length, 1);
  assert.equal(outliers[0].speed_to_lead_seconds, 600);
  // Tiny samples produce no noise.
  assert.equal(speedToLeadOutliers({ handlingRows: rows.slice(0, 3) }).outliers.length, 0);
});

test("Spanish routing: Spanish calls require human review when enabled, are held when disabled", () => {
  assert.deepEqual(routeByLanguage({ language: "en", moduleEnabled: false }), {
    analyze: true,
    humanReviewRequired: false,
    reason: "english_or_other",
  });
  assert.equal(routeByLanguage({ language: "es", moduleEnabled: false }).analyze, false);
  const on = routeByLanguage({ language: "es-419", moduleEnabled: true });
  assert.equal(on.analyze, true);
  assert.equal(on.humanReviewRequired, true);
});

// --- Ruleset registry ----------------------------------------------------------------

test("ruleset registry: california-pi is the only active ruleset; overrides merge, unknown keys ignored", () => {
  const pi = getRuleset("california-pi");
  assert.equal(pi.active, true);
  assert.throws(() => getRuleset("employment"), /unknown practice-area ruleset/);

  const merged = mergeTunables(pi, {
    minimumQualificationScore: 80,
    geography: { counties: ["Alameda"] },
    inventedCriterion: "nope",
  });
  assert.equal(merged.minimumQualificationScore, 80);
  assert.deepEqual(merged.geography, { state: "CA", counties: ["Alameda"] });
  assert.equal("inventedCriterion" in merged, false);
});
