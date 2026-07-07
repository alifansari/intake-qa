// POST /api/webhooks/stripe — the load-bearing provisioning route.
//
// LIVE: verifies the Stripe signature against STRIPE_WEBHOOK_SECRET over the RAW
// request body, then dispatches the event. Handles:
//   * checkout.session.completed          -> provision the firm (billing active,
//                                             auth user + owner membership, welcome)
//   * invoice.payment_failed              -> pause the firm's billing
//   * customer.subscription.updated       -> pause if status is past_due/unpaid
//
// UNSIGNED TEST PATH (P0-5a): a SIMULATED JSON payload (no signature) is accepted
// ONLY when there is no STRIPE_WEBHOOK_SECRET AND an explicit opt-in is set
// (TEST_MODE=true or STRIPE_WEBHOOK_ALLOW_UNSIGNED=true) AND no live key
// (sk_live…) is configured. If a live key is present but the secret is missing we
// FAIL CLOSED (reject) rather than accept a forgeable payload.
//
// Idempotency (P0-4a): every event id is recorded in processed_stripe_events
// before dispatch; a replay returns 200 without re-dispatching. Provisioning is
// also independently idempotent by subscription id (billing/provision.mjs).

import {
  openPipelineDb,
  closePipelineDb,
  logError,
  recordStripeEventProcessed,
} from "../../../../../ingest/store.mjs";
import {
  provisionFromCheckout,
  pauseFromSubscriptionEvent,
} from "../../../../../billing/provision.mjs";
import { isTestMode, truthy } from "../../../../../messaging/compliance.mjs";

export const runtime = "nodejs";

const PAUSE_STATUSES = new Set(["past_due", "unpaid"]);

// P0-5a: only bypass signature verification under an EXPLICIT dev/test flag. When
// live Stripe keys are present (sk_live…) we must NEVER accept unsigned JSON, even
// if the webhook secret is misconfigured — that would let anyone forge a
// provisioning event. In that case we FAIL CLOSED.
function stripeHasLiveKey(env: NodeJS.ProcessEnv): boolean {
  return String(env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
}
// Unsigned JSON is accepted ONLY when explicitly opted in (TEST_MODE or the
// dedicated flag) AND no live key is present.
function unsignedBypassAllowed(env: NodeJS.ProcessEnv): boolean {
  if (stripeHasLiveKey(env)) return false;
  return isTestMode(env) || truthy(env.STRIPE_WEBHOOK_ALLOW_UNSIGNED);
}

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

  // P0-5a: decide how to resolve the event. Prefer signature verification whenever
  // a webhook secret is present. Unsigned JSON is a NARROW dev/test convenience,
  // allowed only via an explicit flag AND never when a live key is configured.
  const hasSecret = Boolean(env.STRIPE_WEBHOOK_SECRET);
  const bypass = unsignedBypassAllowed(env);

  let event: StripeEvent;
  if (hasSecret) {
    // Secret present -> always verify (the correct production path).
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
  } else if (bypass) {
    // No secret, but explicitly opted into unsigned test mode (and no live key).
    try {
      event = JSON.parse(rawBody || "{}");
    } catch {
      return Response.json({ error: "invalid JSON (test mode)" }, { status: 400 });
    }
  } else {
    // FAIL CLOSED: no webhook secret and no explicit bypass (or a live key is
    // present). Reject rather than accept a forgeable unsigned payload.
    return Response.json(
      { error: "webhook signature verification not configured" },
      { status: 400 },
    );
  }

  const db = await openPipelineDb();
  try {
    // P0-4a IDEMPOTENCY: record the event id before dispatching. If it was already
    // processed, ack with 200 and do NOT re-dispatch (a replay must be a no-op).
    // Events without an id (only reachable in the unsigned test path) skip the
    // ledger — the downstream provisioning is itself idempotent by subscription id.
    const eventId = (event as { id?: string }).id;
    if (eventId) {
      const first = await recordStripeEventProcessed(db, eventId, event.type ?? null);
      if (!first) {
        return Response.json(
          { received: true, duplicate: true, event: eventId },
          { status: 200 },
        );
      }
    }
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
