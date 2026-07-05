// Find-it-free guarantee — risk reversal made enforceable in software.
//
// The pilot promise: "if we don't identify >= $X in leaked signable fees by the
// deadline, you owe nothing." We measure "identified" as the firm's leaked-
// signable flag count valued at its avg_case_fee (existing flag data — NOT any
// billing figure, and NOT a recovered fee). If unmet at the deadline, the
// period's base fee is credited back to zero via a guarantee_credit line.

import {
  getFirm,
  getFirmBilling,
  countLeakedFlags,
  getInvoiceLines,
  addInvoiceLine,
} from "../ingest/store.mjs";

// Identified leaked value in CENTS = leaked-signable flag count * avg_case_fee.
// avg_case_fee is whole dollars in the firm record, so * 100 to reach cents.
async function identifiedCents(db, firmId) {
  const firm = await getFirm(db, firmId);
  const avgDollars = Number(firm?.avg_case_fee ?? 0);
  const leaked = await countLeakedFlags(db, firmId);
  return leaked * avgDollars * 100;
}

// Progress for the Executive Summary tracker. Returns null when no find-it-free
// guarantee is configured.
export async function guaranteeProgress({ db, firmId, now = new Date() }) {
  const billing = await getFirmBilling(db, firmId);
  if (!billing || billing.guarantee_type !== "find_it_free") return null;
  const threshold = Number(billing.guarantee_threshold_cents ?? 0);
  const identified = await identifiedCents(db, firmId);
  const deadline = billing.guarantee_deadline ? new Date(billing.guarantee_deadline) : null;
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - new Date(now).getTime()) / (24 * 3600 * 1000))
    : null;
  return {
    type: "find_it_free",
    thresholdCents: threshold,
    identifiedCents: identified,
    deadline: billing.guarantee_deadline ?? null,
    daysLeft,
    met: identified >= threshold,
  };
}

// Apply the guarantee to a just-generated invoice. If the guarantee is active,
// the deadline has passed, and the threshold was NOT met, credit the base fee
// back (a negative guarantee_credit line). Returns { applied, creditCents }.
export async function applyGuarantee({ db, firmId, period, invoiceId, now = new Date() }) {
  const billing = await getFirmBilling(db, firmId);
  if (!billing || billing.guarantee_type !== "find_it_free") {
    return { applied: false, creditCents: 0 };
  }
  const deadline = billing.guarantee_deadline ? new Date(billing.guarantee_deadline) : null;
  // Only enforce once the deadline has passed; before then the guarantee is live.
  if (!deadline || new Date(now).getTime() < deadline.getTime()) {
    return { applied: false, creditCents: 0, reason: "in_progress" };
  }
  const identified = await identifiedCents(db, firmId);
  const threshold = Number(billing.guarantee_threshold_cents ?? 0);
  if (identified >= threshold) {
    return { applied: false, creditCents: 0, met: true };
  }

  // Unmet at the deadline: credit back the base fee on this invoice.
  const lines = await getInvoiceLines(db, invoiceId);
  const baseTotal = lines
    .filter((l) => l.kind === "base")
    .reduce((a, l) => a + Number(l.amount_cents), 0);
  if (baseTotal <= 0) return { applied: false, creditCents: 0, met: false };

  const credit = -baseTotal;
  await addInvoiceLine(db, {
    invoice_id: invoiceId,
    kind: "guarantee_credit",
    description: `Find-it-free guarantee: threshold not met by ${period} — base fee waived`,
    amount_cents: credit,
    outcome_id: null,
    snapshot: { identified_cents: identified, threshold_cents: threshold },
  });
  return { applied: true, creditCents: credit, met: false };
}
