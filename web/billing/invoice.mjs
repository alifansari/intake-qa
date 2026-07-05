// Invoice generation for the per-recovered-case model.
//
// HARD RULE (Rule 5.4): the recovered fee is NEVER an input here. Every amount
// comes from the plan (flat per-case fee, base, cap) and the COUNT of recovered
// cases — never from how much the firm actually recovered. `billable_events` has
// no recovered-fee column, so this is structural; the fee-invariance test locks it.
//
// Split: pure core (computeInvoice, prorationFraction, periodOf) with no I/O, and
// a thin persistence wrapper (generateInvoice) + orchestrator (closePeriod).

import {
  getFirmBilling,
  getAccruedBillableEvents,
  createInvoice,
  addInvoiceLine,
  setInvoiceTotal,
  markBillableEventsInvoiced,
} from "../ingest/store.mjs";
import { applyGuarantee } from "./guarantee.mjs";

// 'YYYY-MM' of a date (UTC).
export function periodOf(date) {
  return new Date(date).toISOString().slice(0, 7);
}

// The FLAT per-case fee to apply, from the plan. Optional per-case-type override
// (still a flat dollar amount, never a %). NEVER reads a recovered fee. Pure.
// `billing` is a getFirmBilling row (plan fields joined in).
export function resolvePerCaseFee(billing, caseType = null) {
  let perCase = Number(billing?.per_case_fee_cents ?? 0);
  const byType = billing?.per_case_fee_by_type;
  if (caseType && byType != null) {
    let map = byType;
    if (typeof byType === "string") {
      try {
        map = JSON.parse(byType);
      } catch {
        map = null;
      }
    }
    if (map && typeof map === "object" && map[caseType] != null) {
      perCase = Number(map[caseType]);
    }
  }
  return perCase;
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
//   events           - accrued billable_events (each carries per_case_fee_cents_applied)
//   baseCents        - plan base monthly fee
//   capCents         - plan monthly case-fee cap (null = uncapped)
//   prorateFraction  - 0..1 multiplier for the base fee
export function computeInvoice({ events = [], baseCents = 0, capCents = null, prorateFraction = 1 }) {
  const lines = [];

  // Per-case lines — one flat fee per recovered case. Amount is the fee that was
  // snapshotted from the plan at accrual; recovered fee is never referenced.
  let caseTotal = 0;
  for (const ev of events) {
    const amt = Number(ev.per_case_fee_cents_applied) || 0;
    caseTotal += amt;
    lines.push({
      kind: "per_case",
      description: `Recovered case (outcome #${ev.outcome_id})`,
      amount_cents: amt,
      outcome_id: ev.outcome_id,
      snapshot: { per_case_fee_cents: amt, case_type: ev.case_type ?? null },
    });
  }

  // Monthly cap on case fees (flat dollars), applied as a negative adjustment.
  if (capCents != null && caseTotal > capCents) {
    const adj = capCents - caseTotal; // negative
    lines.push({
      kind: "cap_adjustment",
      description: `Monthly case-fee cap applied`,
      amount_cents: adj,
      outcome_id: null,
      snapshot: { case_total_cents: caseTotal, cap_cents: capCents },
    });
    caseTotal = capCents;
  }

  // Base subscription (prorated on the first partial month).
  const baseApplied = Math.round(baseCents * prorateFraction);
  if (baseApplied > 0 || baseCents > 0) {
    lines.push({
      kind: "base",
      description:
        prorateFraction < 1
          ? `Base subscription (prorated ${Math.round(prorateFraction * 100)}%)`
          : `Base subscription`,
      amount_cents: baseApplied,
      outcome_id: null,
      snapshot: { base_monthly_cents: baseCents, prorate_fraction: prorateFraction },
    });
  }

  const total_cents = lines.reduce((a, l) => a + l.amount_cents, 0);
  return { lines, total_cents };
}

// Persist an invoice for a firm + period from its accrued events. Idempotency is
// the caller's concern (close a period once). Returns { skipped } or { invoiceId,
// total_cents, lineCount }.
export async function generateInvoice({ db, firmId, period }) {
  const billing = await getFirmBilling(db, firmId);
  if (!billing) return { skipped: true, reason: "no_billing_config" };

  const events = await getAccruedBillableEvents(db, firmId, period);
  const prorate = prorationFraction({
    period,
    anchorDay: billing.billing_anchor_day,
    startedAt: billing.started_at,
  });
  const { lines, total_cents } = computeInvoice({
    events,
    baseCents: billing.base_monthly_cents,
    capCents: billing.monthly_case_fee_cap_cents ?? null,
    prorateFraction: prorate,
  });

  const invoiceId = await createInvoice(db, { firm_id: firmId, period, total_cents, status: "open" });
  for (const line of lines) {
    await addInvoiceLine(db, { invoice_id: invoiceId, ...line });
  }
  const eventIds = events.map((e) => e.id);
  await markBillableEventsInvoiced(db, eventIds, invoiceId);

  return { invoiceId, total_cents, lineCount: lines.length, caseCount: events.length };
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
    caseCount: gen.caseCount,
    guaranteeApplied: guarantee.applied,
  };
}
