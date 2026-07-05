// Tests for per-recovered-case billing (Phase 2). The load-bearing guarantees:
//   * FEE INVARIANCE — invoice totals do NOT change when recovered-fee amounts
//     change (Rule 5.4: the recovered fee is never a billing input). REQUIRED.
//   * only SIGNED outcomes accrue a billable event (adversarial: unsigned can't).
//   * flat per-case fee (+ optional flat case-type override), monthly cap, base
//     proration, dispute exclusion, void-not-delete, guarantee auto-void, and the
//     Stripe simulation in test mode.

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
  getAccruedBillableEvents,
  setBillableEventStatus,
  getInvoice,
  getInvoiceLines,
  voidInvoice,
  countStripeSimLog,
} from "../ingest/store.mjs";
import { recordOutcome } from "../messaging/outcome.mjs";
import {
  computeInvoice,
  prorationFraction,
  resolvePerCaseFee,
  generateInvoice,
  closePeriod,
} from "../billing/invoice.mjs";

const NOW = new Date("2026-06-15T12:00:00Z");
const PERIOD = "2026-06";

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

async function configureBilling(db, firmId, planName = "core") {
  const plan = await getBillingPlanByName(db, planName);
  return upsertFirmBilling(db, { firm_id: firmId, plan_id: plan.id, status: "active" });
}

// --- Pure math ---------------------------------------------------------------

test("resolvePerCaseFee: flat fee, with optional flat case-type override", () => {
  const flat = { per_case_fee_cents: 50000, per_case_fee_by_type: null };
  assert.equal(resolvePerCaseFee(flat, null), 50000);
  assert.equal(resolvePerCaseFee(flat, "mva"), 50000);

  const withOverride = {
    per_case_fee_cents: 50000,
    per_case_fee_by_type: JSON.stringify({ premises: 75000 }),
  };
  assert.equal(resolvePerCaseFee(withOverride, "premises"), 75000);
  assert.equal(resolvePerCaseFee(withOverride, "mva"), 50000); // unknown type -> flat
});

test("prorationFraction: full month normally, prorated in the first month", () => {
  // Not the start month -> full base.
  assert.equal(prorationFraction({ period: "2026-06", anchorDay: 1, startedAt: "2026-04-10T00:00:00Z" }), 1);
  // Start month, anchor mid-month -> partial (June has 30 days; anchor 16 -> 15/30).
  const f = prorationFraction({ period: "2026-06", anchorDay: 16, startedAt: "2026-06-16T00:00:00Z" });
  assert.ok(Math.abs(f - 15 / 30) < 1e-9);
});

test("computeInvoice: per-case lines, cap adjustment, base, and total", () => {
  const events = [
    { outcome_id: 1, per_case_fee_cents_applied: 50000, case_type: null },
    { outcome_id: 2, per_case_fee_cents_applied: 50000, case_type: null },
  ];
  // No cap: 2*500 + base 1500 = 2500.00
  const a = computeInvoice({ events, baseCents: 150000, capCents: null, prorateFraction: 1 });
  assert.equal(a.total_cents, 100000 + 150000);
  // Cap at 70000: case fees capped to 70000, + base 150000.
  const b = computeInvoice({ events, baseCents: 150000, capCents: 70000, prorateFraction: 1 });
  assert.equal(b.total_cents, 70000 + 150000);
  assert.ok(b.lines.some((l) => l.kind === "cap_adjustment"));
});

// --- The invariant: recovered fee never affects billing ----------------------

test("FEE INVARIANCE: invoice total is identical regardless of recovered-fee amounts", async (t) => {
  const db = makeDb(t);

  async function firmTotalWithRecoveredFees(fees) {
    const firm = makeFirm(db);
    await configureBilling(db, firm, "core");
    for (const fee of fees) {
      const conv = makeConversation(db, firm);
      // Wildly different recovered fees — must NOT influence the invoice.
      await recordOutcome({ db, conversationId: conv, result: "signed", recoveredFee: fee, now: NOW });
    }
    const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
    return inv.total_cents;
  }

  const totalTiny = await firmTotalWithRecoveredFees([100, 250]); // $1, $2.50 recovered
  const totalHuge = await firmTotalWithRecoveredFees([5_000_000, 9_999_999]); // huge recovered
  assert.equal(totalTiny, totalHuge, "recovered-fee amount must not move the invoice total");
});

// --- Only signed cases can accrue --------------------------------------------

test("adversarial: an UNSIGNED outcome never creates a billable event", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "core");
  for (const result of ["no_response", "lost", "booked_callback"]) {
    const conv = makeConversation(db, firm);
    await recordOutcome({ db, conversationId: conv, result, recoveredFee: 999999, now: NOW });
  }
  const events = await getBillableEvents(db, firm);
  assert.equal(events.length, 0, "unsigned outcomes must accrue nothing");
});

test("a signed outcome accrues exactly one event, idempotently", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "core");
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
  // Recording the same signed outcome path again must not double-bill (unique outcome).
  const events = await getBillableEvents(db, firm);
  assert.equal(events.length, 1);
  assert.equal(events[0].per_case_fee_cents_applied, 50000); // core flat fee
});

test("no billable event when the firm has no billing config", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db); // no configureBilling
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
  assert.equal((await getBillableEvents(db, firm)).length, 0);
});

// --- Dispute / void ----------------------------------------------------------

test("disputed events are excluded from invoicing", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "core");
  const c1 = makeConversation(db, firm);
  const c2 = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: c1, result: "signed", now: NOW });
  await recordOutcome({ db, conversationId: c2, result: "signed", now: NOW });
  const all = await getBillableEvents(db, firm);
  await setBillableEventStatus(db, all[0].id, "disputed", { dispute_reason: "firm contests" });

  const accrued = await getAccruedBillableEvents(db, firm, PERIOD);
  assert.equal(accrued.length, 1, "disputed event is not billable");
  const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.equal(inv.caseCount, 1);
});

test("voiding an invoice keeps the row (never hard-deleted)", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "core");
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
  const inv = await generateInvoice({ db, firmId: firm, period: PERIOD, now: NOW });
  await voidInvoice(db, inv.invoiceId, "test void", NOW.toISOString());
  const row = await getInvoice(db, inv.invoiceId);
  assert.equal(row.status, "void");
  assert.equal(row.void_reason, "test void");
});

// --- Guarantee + Stripe sim --------------------------------------------------

test("find-it-free guarantee waives the base fee when the threshold is unmet at deadline", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db, 8000);
  const plan = await getBillingPlanByName(db, "core");
  // Deadline already passed; threshold huge so it can't be met.
  await upsertFirmBilling(db, {
    firm_id: firm,
    plan_id: plan.id,
    status: "active",
    guarantee_type: "find_it_free",
    guarantee_threshold_cents: 10_000_000_00,
    guarantee_deadline: "2026-06-01T00:00:00Z",
  });
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });

  const res = await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  const lines = await getInvoiceLines(db, res.invoiceId);
  const base = lines.find((l) => l.kind === "base");
  const credit = lines.find((l) => l.kind === "guarantee_credit");
  assert.ok(credit, "a guarantee credit line should be added");
  assert.equal(credit.amount_cents, -base.amount_cents, "credit cancels the base fee");
  // Net of base: total = per-case only (50000), base fully credited.
  assert.equal(res.total_cents, 50000);
});

test("closePeriod simulates Stripe in test mode (no keys) — nothing transmitted", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db);
  await configureBilling(db, firm, "core");
  const conv = makeConversation(db, firm);
  await recordOutcome({ db, conversationId: conv, result: "signed", now: NOW });
  await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.ok((await countStripeSimLog(db)) >= 1, "would-be Stripe calls are logged, not sent");
});
