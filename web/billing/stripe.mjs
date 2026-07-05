// Stripe adapter — lazy-loaded, exactly like the Twilio pattern in send.mjs.
//
// In TEST_MODE, or when no STRIPE_SECRET_KEY is set, we NEVER call Stripe: we
// write the would-be calls to the stripe_sim_log table instead. Invoice
// generation must never be blocked on Stripe availability, so this is
// best-effort and swallows its own errors upstream.

import { appendStripeSimLog } from "../ingest/store.mjs";
import { isTestMode } from "../messaging/compliance.mjs";

function stripeEnabled(env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY) && !isTestMode(env);
}

// Simulate (or, when live, perform) the Stripe hand-off for a finalized invoice.
// `stripe` can be injected in tests. Returns { simulated, ... }.
export async function syncInvoiceToStripe({ db, firmId, invoiceId, totalCents, stripe, env = process.env }) {
  const payload = { invoiceId, firmId, amount_due_cents: totalCents };

  if (!stripeEnabled(env)) {
    await appendStripeSimLog(db, { firm_id: firmId, action: "create_invoice", payload });
    await appendStripeSimLog(db, { firm_id: firmId, action: "finalize", payload });
    return { simulated: true };
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
