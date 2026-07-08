// Stripe subscription-mode Checkout — session creation for the click-to-buy flow.
//
// TEST_MODE-SAFE: with no STRIPE_SECRET_KEY, or TEST_MODE=true, we NEVER call
// Stripe. We log the would-be call to stripe_sim_log and return a simulated
// welcome URL, exactly mirroring billing/stripe.mjs. No real charge can occur
// without keys.
//
// PRICING MODEL (Rule 5.4 / B&P §§6151-6152 / SB 37): every price here is a FLAT
// MONTHLY subscription. Never per recovered case / per signed client / % of
// recovery. The Charter plan is a flat $1,500/mo intro that steps up to the flat
// $2,500/mo Core price after 90 days — still flat monthly at every phase.

import { appendStripeSimLog } from "../ingest/store.mjs";
import { isTestMode } from "../messaging/compliance.mjs";

// The three sellable plans and the env var that names their Stripe Price id.
// Prices are created by hand in the Stripe dashboard (see the human setup
// checklist) and their ids pasted into env; we NEVER hardcode a price/amount
// here — the amount lives on the Stripe Price object.
export const PLAN_PRICE_ENV = {
  core: "STRIPE_PRICE_CORE", // flat $2,500/mo
  pro: "STRIPE_PRICE_PRO", // flat $5,000/mo
  charter: "STRIPE_PRICE_CHARTER", // flat $1,500/mo intro -> steps up to Core
};

// Charter step-up: 3 monthly iterations at the Charter price, then Core ongoing.
export const CHARTER_INTRO_ITERATIONS = 3;

function stripeEnabled(env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY) && !isTestMode(env);
}

// Lazy-load the Stripe SDK (optional dep, kept out of the bundle until go-live),
// matching billing/stripe.mjs.
async function loadStripe(env) {
  const mod = "stripe";
  const { default: Stripe } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ mod
  );
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// Absolute origin for success/cancel URLs. Prefer an explicit env; fall back to
// the request origin the caller passes in.
function resolveOrigin({ env = process.env, origin }) {
  return env.APP_URL || env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";
}

// Create a subscription-mode Checkout Session for `plan`, stitched to the audit
// session token via client_reference_id so the webhook can match payer -> audit.
//
// Returns { simulated:true, url } in TEST_MODE / no keys, else { simulated:false,
// url, id } with the live Checkout URL.
/**
 * @param {{ db?: unknown, plan: string, auditToken?: string | null, email?: string | null, stripe?: unknown, env?: Record<string, string | undefined>, origin?: string }} args
 */
export async function createCheckoutSession({
  db,
  plan,
  auditToken = null,
  email = null,
  stripe,
  env = process.env,
  origin,
}) {
  if (!PLAN_PRICE_ENV[plan]) {
    throw new Error(`unknown plan "${plan}"`);
  }
  const base = resolveOrigin({ env, origin });
  const successUrl = `${base}/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/pricing`;

  // Simulated path — nothing hits Stripe.
  if (!stripeEnabled(env)) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "create_checkout_session",
      payload: { plan, auditToken, email, mode: "subscription" },
    }).catch(() => {});
    return { simulated: true, url: "/welcome?simulated=1" };
  }

  const priceId = env[PLAN_PRICE_ENV[plan]];
  if (!priceId) {
    throw new Error(`${PLAN_PRICE_ENV[plan]} is not set (create the Stripe Price and paste its id)`);
  }

  const client = stripe ?? (await loadStripe(env));

  // Common session params for every plan.
  /** @type {Record<string, unknown>} */
  const params = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card", "us_bank_account"],
    // Stitch payer -> their audit so provisioning can attach to the right firm.
    client_reference_id: auditToken ?? undefined,
    customer_email: email ?? undefined,
    // Require the firm to accept the Terms of Service (links to /msa, /dpa) at
    // checkout — a compliance requirement, not a nicety.
    consent_collection: { terms_of_service: "required" },
    automatic_tax: { enabled: true },
    // Stripe needs a shipping/billing address to compute automatic tax.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { plan, audit_token: auditToken ?? "" },
    subscription_data: { metadata: { plan, audit_token: auditToken ?? "" } },
  };

  const session = await client.checkout.sessions.create(params);

  // CHARTER STEP-UP ($1,500 x3 months -> $2,500 Core ongoing).
  //
  // A subscription schedule cannot be attached inside checkout.sessions.create;
  // the subscription doesn't exist until the customer pays. So we create the sub
  // on the flat Charter price now, and convert it to a two-phase schedule when
  // the webhook sees checkout.session.completed (see attachCharterStepUp below).
  //
  // TODO: schedule day-90 step-up — implemented in attachCharterStepUp(), invoked
  // from the checkout.session.completed handler for the Charter plan.

  return { simulated: false, url: session.url, id: session.id };
}

// Convert a freshly-created Charter subscription into a subscription schedule:
//   phase 1: Charter price, CHARTER_INTRO_ITERATIONS monthly iterations
//   phase 2: Core price, ongoing
// Flat monthly at every phase — no outcome-tied component. Best-effort: a failure
// here must never break provisioning; it is logged for the operator to retry.
/**
 * @param {{ db?: unknown, subscriptionId?: string, stripe?: unknown, env?: Record<string, string | undefined> }} args
 */
export async function attachCharterStepUp({ db, subscriptionId, stripe, env = process.env }) {
  if (!stripeEnabled(env)) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "charter_step_up_schedule",
      payload: { subscriptionId, intro_iterations: CHARTER_INTRO_ITERATIONS },
    }).catch(() => {});
    return { simulated: true };
  }
  const charterPrice = env[PLAN_PRICE_ENV.charter];
  const corePrice = env[PLAN_PRICE_ENV.core];
  if (!charterPrice || !corePrice) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "error",
      payload: { subscriptionId, message: "charter step-up needs STRIPE_PRICE_CHARTER + STRIPE_PRICE_CORE" },
    }).catch(() => {});
    return { simulated: true, error: true };
  }
  try {
    const client = stripe ?? (await loadStripe(env));
    // Create a schedule FROM the existing subscription, then set its phases.
    const schedule = await client.subscriptionSchedules.create({
      from_subscription: subscriptionId,
    });
    await client.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: charterPrice, quantity: 1 }],
          iterations: CHARTER_INTRO_ITERATIONS,
        },
        {
          items: [{ price: corePrice, quantity: 1 }],
        },
      ],
    });
    return { simulated: false, scheduleId: schedule.id };
  } catch (err) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "error",
      payload: {
        subscriptionId,
        message: err instanceof Error ? err.message : String(err),
        step: "charter_step_up_schedule",
      },
    }).catch(() => {});
    return { simulated: true, error: true };
  }
}
