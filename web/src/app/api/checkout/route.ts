// POST /api/checkout — create a Stripe subscription-mode Checkout Session for a
// plan and return its URL. The buy button on /pricing POSTs here.
//
// TEST_MODE-SAFE: with no STRIPE_SECRET_KEY or TEST_MODE=true, this returns
// { simulated:true, url:"/welcome?simulated=1" } and never touches Stripe.
//
// The audit session token (client_reference_id) stitches the payer back to their
// audit so the webhook can provision the right firm.

import { z } from "zod";
import { openPipelineDb, closePipelineDb } from "../../../../ingest/store.mjs";
import { createCheckoutSession } from "../../../../billing/checkout.mjs";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["core", "pro", "charter"]),
  auditToken: z.string().min(1).max(200).nullish(),
  email: z.string().email().nullish(),
});

function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  return url.origin;
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "expected { plan: 'core'|'pro'|'charter', auditToken?, email? }" },
      { status: 422 },
    );
  }
  const { plan, auditToken, email } = parsed.data;

  const db = await openPipelineDb();
  try {
    const res = await createCheckoutSession({
      db,
      plan,
      auditToken: auditToken ?? null,
      email: email ?? null,
      origin: requestOrigin(req),
    });
    return Response.json(res, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "could not start checkout";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
