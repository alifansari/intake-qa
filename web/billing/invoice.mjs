// Invoice generation for the FLAT-MONTHLY subscription model.
//
// HARD RULE: billing is a flat monthly subscription tiered by analyzed-call
// volume. It is NEVER charged per recovered case, per signed client, or as a
// percentage of any recovery — a fee tied to whether a case is signed/recovered
// risks characterization as "capping" under Cal. B&P §§6151-6152 (now backed by
// SB 37's private right of action). The recovered fee is never an input here;
// neither is the count of signed cases. The invoice is the plan's base monthly
// fee (prorated in the firm's first partial month), plus any guarantee credit.
//
// The per-case machinery from the old model (billable_events, per-case lines) is
// left in the schema so historical invoices stay readable, but is no longer used.
//
// Split: pure core (computeInvoice, prorationFraction, periodOf) with no I/O, and
// a thin persistence wrapper (generateInvoice) + orchestrator (closePeriod).

import {
  getFirmBilling,
  createInvoice,
  addInvoiceLine,
  setInvoiceTotal,
  getInvoiceByFirmPeriod,
} from "../ingest/store.mjs";
import { applyGuarantee } from "./guarantee.mjs";

// 'YYYY-MM' of a date (UTC).
export function periodOf(date) {
  return new Date(date).toISOString().slice(0, 7);
}

const DAYS_IN_MONTH = (year, month0) => new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

// Fraction of the base fee to charge for `period`. Full month = 1. For the
// firm's FIRST period (the month it started), prorate from the anchor day:
// (daysInMonth - anchorDay + 1) / daysInMonth. Pure + testable.
export function prorationFraction({ period, anchorDay = 1, startedAt }) {
  if (!startedAt) return 1;
  const startPeriod = periodOf(startedAt);
  if (period !== startPeriod) return 1; // not the first month -> full base
  const [y, m] = period.split("-").map(Number);
  const dim = DAYS_IN_MONTH(y, m - 1);
  const day = Math.min(Math.max(1, anchorDay), dim);
  return (dim - day + 1) / dim;
}

// Pure invoice math. Returns { lines, total_cents }.
//   baseCents        - plan base monthly fee (the flat tier price)
//   prorateFraction  - 0..1 multiplier for the base fee (first partial month)
// The flat subscription is the ONLY charge; a guarantee credit is added later in
// closePeriod if the find-it-free threshold wasn't met.
export function computeInvoice({ baseCents = 0, prorateFraction = 1 }) {
  const lines = [];
  const baseApplied = Math.round(baseCents * prorateFraction);
  if (baseApplied > 0 || baseCents > 0) {
    lines.push({
      kind: "base",
      description:
        prorateFraction < 1
          ? `Monthly subscription (prorated ${Math.round(prorateFraction * 100)}%)`
          : `Monthly subscription`,
      amount_cents: baseApplied,
      outcome_id: null,
      snapshot: { base_monthly_cents: baseCents, prorate_fraction: prorateFraction },
    });
  }
  const total_cents = lines.reduce((a, l) => a + l.amount_cents, 0);
  return { lines, total_cents };
}

// Persist an invoice for a firm + period. Idempotency is the caller's concern
// (close a period once). Returns { skipped } or { invoiceId, total_cents, lineCount }.
export async function generateInvoice({ db, firmId, period }) {
  const billing = await getFirmBilling(db, firmId);
  if (!billing) return { skipped: true, reason: "no_billing_config" };

  // P0-4b IDEMPOTENCY: one invoice per firm per period. If a live invoice already
  // exists for this period, return it instead of minting a second one (a re-close
  // / retry). The DB also enforces this with UNIQUE(firm_id, period) (0020/0021).
  const existing = await getInvoiceByFirmPeriod(db, firmId, period);
  if (existing) {
    return {
      invoiceId: existing.id,
      total_cents: existing.total_cents,
      lineCount: null,
      existed: true,
    };
  }

  const prorate = prorationFraction({
    period,
    anchorDay: billing.billing_anchor_day,
    startedAt: billing.started_at,
  });
  const { lines, total_cents } = computeInvoice({
    baseCents: billing.base_monthly_cents,
    prorateFraction: prorate,
  });

  const invoiceId = await createInvoice(db, { firm_id: firmId, period, total_cents, status: "open" });
  for (const line of lines) {
    await addInvoiceLine(db, { invoice_id: invoiceId, ...line });
  }

  return { invoiceId, total_cents, lineCount: lines.length };
}

// Close a billing period: generate the invoice, then apply the find-it-free
// guarantee (which may credit the base fee to zero it out), then finalize.
// Stripe is simulated in test mode (see billing/stripe.mjs) and never blocks this.
/**
 * @param {{ db?: unknown, firmId?: unknown, period?: string, now?: Date, stripe?: unknown }} [opts]
 */
export async function closePeriod({ db, firmId, period, now = new Date(), stripe } = {}) {
  const gen = await generateInvoice({ db, firmId, period, now });
  if (gen.skipped) return gen;

  // P0-4b IDEMPOTENCY: a re-close of an already-generated period returns the
  // existing (already finalized, already guarantee-credited) invoice untouched.
  // Re-applying the guarantee here would double-credit; re-syncing Stripe would
  // double-charge/refund. So short-circuit.
  if (gen.existed) {
    return {
      invoiceId: gen.invoiceId,
      total_cents: gen.total_cents,
      guaranteeApplied: false,
      existed: true,
    };
  }

  const guarantee = await applyGuarantee({ db, firmId, period, invoiceId: gen.invoiceId, now });

  // Recompute the stored total after any guarantee credit lines were added.
  const finalTotal = gen.total_cents + (guarantee.creditCents ?? 0);
  await setInvoiceTotal(db, gen.invoiceId, finalTotal, "finalized");

  // Simulate the Stripe hand-off (real calls only when keys + TEST_MODE allow).
  const { syncInvoiceToStripe } = await import("./stripe.mjs");
  await syncInvoiceToStripe({ db, firmId, invoiceId: gen.invoiceId, totalCents: finalTotal, stripe }).catch(
    () => {},
  );

  return {
    invoiceId: gen.invoiceId,
    total_cents: finalTotal,
    guaranteeApplied: guarantee.applied,
  };
}
