// Stripe adapter — lazy-loaded, exactly like the Twilio pattern in send.mjs.
//
// In TEST_MODE, or when no STRIPE_SECRET_KEY is set, we NEVER call Stripe: we
// write the would-be calls to the stripe_sim_log table instead. Invoice
// generation must never be blocked on Stripe availability, so this is
// best-effort and swallows its own errors upstream.

import { appendStripeSimLog, getFirmBilling } from "../ingest/store.mjs";
import { isTestMode } from "../messaging/compliance.mjs";

function stripeEnabled(env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY) && !isTestMode(env);
}

// Simulate (or, when live, perform) the Stripe hand-off for a finalized invoice.
// `stripe` can be injected in tests. Returns { simulated, ... }.
//
// GUARANTEE REFUND (P1 item 8): when a guarantee_credit brings an already-charged
// month's net to <= 0, the base fee was already collected on the flat monthly
// subscription, so a credit LINE alone doesn't return money. We must issue a
// Stripe refund/credit for the collected amount. TEST_MODE / no keys: logged.
export async function syncInvoiceToStripe({ db, firmId, invoiceId, totalCents, stripe, env = process.env }) {
  const payload = { invoiceId, firmId, amount_due_cents: totalCents };

  if (!stripeEnabled(env)) {
    await appendStripeSimLog(db, { firm_id: firmId, action: "create_invoice", payload });
    await appendStripeSimLog(db, { firm_id: firmId, action: "finalize", payload });
    // A net <= 0 after a guarantee credit means the flat month should be refunded.
    if (typeof totalCents === "number" && totalCents <= 0) {
      await appendStripeSimLog(db, {
        firm_id: firmId,
        action: "refund_guarantee_credit",
        payload: { invoiceId, refund_cents: Math.abs(totalCents), reason: "find_it_free_guarantee" },
      });
    }
    return { simulated: true, refundSimulated: totalCents <= 0 };
  }

  // Live path: only reached with a key AND TEST_MODE off. Lazy-load the SDK so
  // the optional dependency isn't bundled until billing goes live.
  try {
    const client =
      stripe ??
      (await (async () => {
        // Keep the optional `stripe` dep out of the bundle until billing goes
        // live (installed only then). The ignore hints tell the bundler to leave
        // this as a native runtime import instead of failing to resolve it.
        const mod = "stripe";
        const { default: Stripe } = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ mod
        );
        return new Stripe(env.STRIPE_SECRET_KEY);
      })());
    // Intentionally minimal — the real finalize/collection flow is a go-live task.
    await client.invoices.create({ metadata: { invoiceId: String(invoiceId), firmId: String(firmId) } });

    // Guarantee refund: when the net is <= 0, the flat month was already collected
    // on the subscription, so issue a customer balance credit for the refunded
    // amount. (A precise per-charge refund needs the PaymentIntent id from the
    // subscription invoice; a negative balance transaction is the safe, auditable
    // form that reduces the next invoice — do NOT silently swallow the credit.)
    if (typeof totalCents === "number" && totalCents <= 0) {
      const refundCents = Math.abs(totalCents);
      const billing = await getFirmBilling(db, firmId).catch(() => null);
      const customerId = billing?.stripe_customer_id ?? null;
      if (customerId && refundCents > 0) {
        await client.customers.createBalanceTransaction(customerId, {
          amount: -refundCents, // negative = credit to the customer
          currency: "usd",
          description: `Find-it-free guarantee credit (invoice ${invoiceId})`,
        });
      } else {
        await appendStripeSimLog(db, {
          firm_id: firmId,
          action: "refund_guarantee_credit_pending",
          payload: { invoiceId, refund_cents: refundCents, reason: "no_stripe_customer_on_file" },
        });
      }
    }
    return { simulated: false };
  } catch (err) {
    // Never let a Stripe failure break invoicing; record it for the operator.
    await appendStripeSimLog(db, {
      firm_id: firmId,
      action: "error",
      payload: { invoiceId, message: err instanceof Error ? err.message : String(err) },
    });
    return { simulated: true, error: true };
  }
}
