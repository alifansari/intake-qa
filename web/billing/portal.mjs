// Stripe Customer Portal — self-serve cancel / card update for a firm.
//
// TEST_MODE-SAFE: with no keys / TEST_MODE, returns a simulated URL and never
// calls Stripe. Live: creates a billing_portal.Session for the firm's Stripe
// customer and returns its URL.

import { getFirmBilling, appendStripeSimLog } from "../ingest/store.mjs";
import { isTestMode } from "../messaging/compliance.mjs";

function stripeEnabled(env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY) && !isTestMode(env);
}

/**
 * @param {{ db?: unknown, firmId: number | string, returnUrl?: string, stripe?: unknown, env?: Record<string, string | undefined> }} args
 */
export async function createPortalSession({ db, firmId, returnUrl, stripe, env = process.env }) {
  const base = env.APP_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const back = returnUrl || `${base}/desk/settings`;

  if (!stripeEnabled(env)) {
    await appendStripeSimLog(db, {
      firm_id: typeof firmId === "number" ? firmId : null,
      action: "create_portal_session",
      payload: { firmId, returnUrl: back, simulated: true },
    }).catch(() => {});
    return { simulated: true, url: back };
  }

  const billing = await getFirmBilling(db, firmId);
  const customerId = billing?.stripe_customer_id ?? null;
  if (!customerId) {
    return { error: "no_stripe_customer", url: null };
  }

  const mod = "stripe";
  const { default: Stripe } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ mod
  );
  const client = stripe ?? new Stripe(env.STRIPE_SECRET_KEY);
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: back,
  });
  return { simulated: false, url: session.url };
}
