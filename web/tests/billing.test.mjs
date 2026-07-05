// Tests for the FLAT-MONTHLY subscription billing model. The load-bearing
// guarantees:
//   * FEE INVARIANCE — the invoice total is the flat monthly subscription and
//     does NOT change with the recovered-fee amount OR the number of signed
//     cases (a fee tied to signing/recovering risks "capping" under B&P
//     §§6151-6152 / SB 37). REQUIRED.
//   * signing a case creates NO billing charge (no billable event, no per-case
//     line).
//   * first-month proration, guarantee waiver, void-not-delete, and the Stripe
//     simulation in test mode.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  getBillingPlanByName,
  upsertFirmBilling,
  getBillableEvents,
  getInvoice,
  getInvoiceLines,
  voidInvoice,
  countStripeSimLog,
} from "../ingest/store.mjs";
import { recordOutcome } from "../messaging/outcome.mjs";
import {
  computeInvoice,
  prorationFraction,
  generateInvoice,
  closePeriod,
} from "../billing/invoice.mjs";

const NOW = new Date("2026-06-15T12:00:00Z");
const PERIOD = "2026-06";
const TIER1_CENTS = 50000; // tier_1 flat monthly ($500), seeded by migration 0013

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-billing-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db, avgFee = 8000) {
  return Number(
    db
      .prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES (?, ?, 1)`)
      .run("Test Firm", avgFee).lastInsertRowid,
  );
}

// Insert call -> flag -> conversation and return the conversation id.
function makeConversation(db, firmId, { leaked = 1 } = {}) {
  const callId = Number(
    db
      .prepare(
        `INSERT INTO calls (firm_id, source, received_at) VALUES (?, 'manual', ?)`,
      )
      .run(firmId, NOW.toISOString()).lastInsertRowid,
  );
  const flagId = Number(
    db
      .prepare(
        `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable)
         VALUES (?, ?, 80, ?)`,
      )
      .run(callId, firmId, leaked).lastInsertRowid,
  );
  return Number(
    db
      .prepare(
        `INSERT INTO conversations (flag_id, firm_id, caller_phone, consent_basis)
         VALUES (?, ?, '+15550000000', 'inbound_call_inquiry_EBR')`,
      )
      .run(flagId, firmId).lastInsertRowid,
  );
}

async function configureBilling(db, firmId, planName = "tier_1") {
  const plan = await getBillingPlanByName(db, planName);
  return upsertFirmBilling(db, { firm_id: firmId, plan_id: plan.id, status: "active" });
}

// --- Pure math ---------------------------------------------------------------

test("prorationFraction: full month normally, prorated in the first month", () => {
  // Not the start month -> full base.
  assert.equal(prorationFraction({ period: "2026-06", anchorDay: 1, startedAt: "2026-04-10T00:00:00Z" }), 1);
  // Start month, anchor mid-month -> partial (June has 30 days; anchor 16 -> 15/30).
  const f = prorationFraction({ period: "2026-06", anchorDay: 16, startedAt: "2026-06-16T00:00:00Z" });
  assert.ok(Math.abs(f - 15 / 30) < 1e-9);
});

test("computeInvoice: a single base subscription line, prorated when partial", () => {
  const full = computeInvoice({ baseCents: TIER1_CENTS, prorateFraction: 1 });
  assert.equal(full.total_cents, TIER1_CENTS);
  assert.equal(full.lines.length, 1);
  assert.equal(full.lines[0].kind, "base");

  const half = computeInvoice({ baseCents: TIER1_CENTS, prorateFraction: 0.5 });
  assert.equal(half.total_cents, TIER1_CENTS / 2);
  // No per-case or cap lines exist in the flat model.
  assert.ok(!full.lines.some((l) => l.kind === "per_case" || l.kind === "cap_adjustment"));
});

// --- The invariant: neither recovered fees NOR signed-case count move the bill -

test("FEE INVARIANCE: invoice total is the flat fee regardless of recovered-fee amounts", async (t) => {
  const db = makeDb(t);

  async function firmTotalWithRecoveredFees(fees) {
    const firm = makeFirm(db);
    await configureBilling(db, firm, "tier_1");
    for (const fee of fees) {
      const conv = makeConversation(db, firm);
      await recordOutcome({ db, conversationId: conv, result: "signed", recoveredFee: fee, now: NOW });
    }
    const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
    return inv.total_cents;
  }

  const totalTiny = await firmTotalWithRecoveredFees([100, 250]); // small recovered
  const totalHuge = await firmTotalWithRecoveredFees([5_000_000, 9_999_999]); // huge recovered
  assert.equal(totalTiny, TIER1_CENTS, "invoice is the flat monthly fee");
  assert.equal(totalTiny, totalHuge, "recovered-fee amount must not move the invoice total");
});

test("FEE INVARIANCE: invoice total does not change with the NUMBER of signed cases", async (t) => {
  const db = makeDb(t);

  async function firmTotalWithSignedCount(n) {
    const firm = makeFirm(db);
    await configureBilling(db, firm, "tier_1");
    for (let i = 0; i < n; i++) {
      const conv = makeConversation(db, firm);
      await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
    }
    const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
    return inv.total_cents;
  }

  assert.equal(await firmTotalWithSignedCount(0), TIER1_CENTS);
  assert.equal(await firmTotalWithSignedCount(5), TIER1_CENTS, "signing 5 cases bills the same flat fee");
});

// --- Signing creates no charge ------------------------------------------------

test("a signed outcome creates NO billable event and NO per-case invoice line", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "tier_1");
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });

  // Accrual was removed with the per-case model.
  assert.equal((await getBillableEvents(db, firm)).length, 0, "no billable events in the flat model");

  const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
  const lines = await getInvoiceLines(db, inv.invoiceId);
  assert.ok(lines.every((l) => l.kind !== "per_case"), "no per-case lines");
  assert.equal(inv.total_cents, TIER1_CENTS);
});

test("no invoice base line when the firm has no billing config", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db); // no configureBilling
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
  const gen = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.equal(gen.skipped, true, "no billing config -> nothing to invoice");
});

// --- Void ---------------------------------------------------------------------

test("voiding an invoice keeps the row (never hard-deleted)", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "tier_1");
  const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
  await voidInvoice(db, inv.invoiceId, "test void", NOW.toISOString());
  const row = await getInvoice(db, inv.invoiceId);
  assert.equal(row.status, "void");
  assert.equal(row.void_reason, "test void");
});

// --- Guarantee + Stripe sim --------------------------------------------------

test("find-it-free guarantee waives the monthly fee when the threshold is unmet at deadline", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db, 8000);
  const plan = await getBillingPlanByName(db, "tier_1");
  // Deadline already passed; threshold huge so it can't be met.
  await upsertFirmBilling(db, {
    firm_id: firm,
    plan_id: plan.id,
    status: "active",
    guarantee_type: "find_it_free",
    guarantee_threshold_cents: 10_000_000_00,
    guarantee_deadline: "2026-06-01T00:00:00Z",
  });

  const res = await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  const lines = await getInvoiceLines(db, res.invoiceId);
  const base = lines.find((l) => l.kind === "base");
  const credit = lines.find((l) => l.kind === "guarantee_credit");
  assert.ok(credit, "a guarantee credit line should be added");
  assert.equal(credit.amount_cents, -base.amount_cents, "credit cancels the monthly fee");
  assert.equal(res.total_cents, 0, "guarantee zeroes the bill when unmet");
});

test("closePeriod simulates Stripe in test mode (no keys) — nothing transmitted", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "tier_1");
  await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.ok((await countStripeSimLog(db)) >= 1, "would-be Stripe calls are logged, not sent");
});
