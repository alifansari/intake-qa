// POST /api/webhooks/stripe — the load-bearing provisioning route.
//
// LIVE: verifies the Stripe signature against STRIPE_WEBHOOK_SECRET over the RAW
// request body, then dispatches the event. Handles:
//   * checkout.session.completed          -> provision the firm (billing active,
//                                             auth user + owner membership, welcome)
//   * invoice.payment_failed              -> pause the firm's billing
//   * customer.subscription.updated       -> pause if status is past_due/unpaid
//
// TEST_MODE: when TEST_MODE=true or no STRIPE_WEBHOOK_SECRET is set, we accept a
// SIMULATED JSON payload (no signature required) and run the SAME provisioning
// against the JSON/SQLite repo. This lets the whole flow be exercised end-to-end
// without any Stripe keys. No real charge or send can occur in this mode.
//
// Idempotency is handled downstream in billing/provision.mjs (keyed on the Stripe
// subscription id), so a replayed event never double-provisions.

import { openPipelineDb, closePipelineDb, logError } from "../../../../../ingest/store.mjs";
import {
  provisionFromCheckout,
  pauseFromSubscriptionEvent,
} from "../../../../../billing/provision.mjs";
import { isTestMode } from "../../../../../messaging/compliance.mjs";

export const runtime = "nodejs";

const PAUSE_STATUSES = new Set(["past_due", "unpaid"]);

// Lazy-load Stripe only when we actually need to verify a signature (optional dep,
// kept out of the bundle until billing goes live).
async function verifyStripeEvent(rawBody: string, signature: string, secret: string) {
  const mod = "stripe";
  const { default: Stripe } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ mod
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// Minimal shape guard for the event we dispatch on.
type StripeEvent = { type?: string; data?: { object?: Record<string, unknown> } };

export async function POST(req: Request) {
  const env = process.env;
  const rawBody = await req.text();
  const testMode = isTestMode(env) || !env.STRIPE_WEBHOOK_SECRET;

  // Resolve the event: verified in live mode, parsed-as-is in TEST_MODE.
  let event: StripeEvent;
  if (testMode) {
    try {
      event = JSON.parse(rawBody || "{}");
    } catch {
      return Response.json({ error: "invalid JSON (test mode)" }, { status: 400 });
    }
  } else {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return Response.json({ error: "missing stripe-signature" }, { status: 400 });
    }
    try {
      event = (await verifyStripeEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET!,
      )) as unknown as StripeEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "signature verification failed";
      return Response.json({ error: `webhook signature verification failed: ${message}` }, { status: 400 });
    }
  }

  const db = await openPipelineDb();
  try {
    const obj = (event.data?.object ?? {}) as Record<string, unknown>;
    switch (event.type) {
      case "checkout.session.completed": {
        const result = await provisionFromCheckout({ db, session: obj, env });
        return Response.json({ received: true, handled: event.type, result }, { status: 200 });
      }

      case "invoice.payment_failed": {
        const subscriptionId =
          (obj.subscription as string | undefined) ??
          ((obj.parent as { subscription_details?: { subscription?: string } } | undefined)
            ?.subscription_details?.subscription);
        const result = await pauseFromSubscriptionEvent({ db, subscriptionId, env });
        return Response.json({ received: true, handled: event.type, result }, { status: 200 });
      }

      case "customer.subscription.updated": {
        const status = obj.status as string | undefined;
        if (status && PAUSE_STATUSES.has(status)) {
          const result = await pauseFromSubscriptionEvent({
            db,
            subscriptionId: obj.id as string | undefined,
            env,
          });
          return Response.json({ received: true, handled: event.type, status, result }, { status: 200 });
        }
        return Response.json({ received: true, ignored: event.type, status }, { status: 200 });
      }

      default:
        // Acknowledge everything else so Stripe stops retrying.
        return Response.json({ received: true, ignored: event.type ?? "unknown" }, { status: 200 });
    }
  } catch (err) {
    await logError(db, {
      source: "api.webhooks.stripe",
      message: `webhook handler error: ${err instanceof Error ? err.message : err}`,
      firm_id: null,
    }).catch(() => {});
    // 500 so Stripe retries a transient failure.
    return Response.json({ error: "webhook handler error" }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
