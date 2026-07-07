// P0-4 (money integrity): billing idempotency.
//   (b) closePeriod is idempotent — a double-close does NOT mint a second invoice
//       nor stack a second guarantee_credit (which would double-waive the fee).
//       Backed by UNIQUE(firm_id, period) on invoices (migration 0020) and the
//       guarantee short-circuit when a credit line already exists.
//   (a) recordStripeEventProcessed is a true insert-if-absent ledger.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  getBillingPlanByName,
  upsertFirmBilling,
  getInvoiceLines,
  listInvoices,
  recordStripeEventProcessed,
} from "../ingest/store.mjs";
import { closePeriod } from "../billing/invoice.mjs";

const NOW = new Date("2026-06-15T12:00:00Z");
const PERIOD = "2026-06";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-billing-idem-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  return db;
}
function makeFirm(db, avgFee = 8000) {
  return Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('Firm', ?, 1)`).run(avgFee).lastInsertRowid,
  );
}

test("double-close does not mint a second invoice or a second guarantee credit", async (t) => {
  const db = makeDb(t);
  const firm = makeFirm(db, 8000);
  const plan = await getBillingPlanByName(db, "tier_1");
  // Guarantee already past deadline + unmeetable threshold -> the first close
  // adds a guarantee_credit that zeroes the invoice.
  await upsertFirmBilling(db, {
    firm_id: firm,
    plan_id: plan.id,
    status: "active",
    guarantee_type: "find_it_free",
    guarantee_threshold_cents: 10_000_000_00,
    guarantee_deadline: "2026-06-01T00:00:00Z",
  });

  const first = await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.equal(first.total_cents, 0, "first close zeroes the bill via guarantee credit");

  // Close the SAME period again (a retry / replayed cron).
  const second = await closePeriod({ db, firmId: firm, period: PERIOD, now: NOW });
  assert.equal(second.existed, true, "second close returns the existing invoice");
  assert.equal(second.invoiceId, first.invoiceId, "same invoice id, not a new one");

  // Exactly ONE invoice for the firm+period.
  const invoices = (await listInvoices(db, firm)).filter((i) => i.period === PERIOD && i.status !== "void");
  assert.equal(invoices.length, 1, "no duplicate invoice was created");

  // Exactly ONE guarantee_credit line (no double-waive).
  const lines = await getInvoiceLines(db, first.invoiceId);
  const credits = lines.filter((l) => l.kind === "guarantee_credit");
  assert.equal(credits.length, 1, "guarantee credit applied exactly once");
  const base = lines.filter((l) => l.kind === "base");
  assert.equal(base.length, 1, "exactly one base line");
});

test("recordStripeEventProcessed: first insert wins, replays return false", async (t) => {
  const db = makeDb(t);
  assert.equal(await recordStripeEventProcessed(db, "evt_123", "checkout.session.completed"), true, "first time seen");
  assert.equal(await recordStripeEventProcessed(db, "evt_123", "checkout.session.completed"), false, "replay is a no-op");
  assert.equal(await recordStripeEventProcessed(db, "evt_456"), true, "a different event is new");
});
