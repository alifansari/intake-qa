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

// STAGED, not shipped. Checkout is re-enabled for NEW paid signups, but two
// guards keep it safe:
//
//   1. BETA COHORT STAYS FREE. Founding/beta firms are never charged. Any email
//      listed in BETA_FIRM_EMAILS (comma-separated, case-insensitive) is refused
//      a checkout session with a plain "your desk is free" message. This is the
//      gate that stops a beta firm from accidentally paying.
//
//   2. NO REAL CHARGE WITHOUT STRIPE CONFIG. With no STRIPE_SECRET_KEY (or
//      TEST_MODE=true), createCheckoutSession runs in SIMULATION and never
//      touches Stripe — no card is charged. See billing/checkout.mjs.
//
// TODO(ali): to actually charge a card, set in host env (NEVER in code):
//   STRIPE_SECRET_KEY, plus the Stripe Price ids STRIPE_PRICE_CORE,
//   STRIPE_PRICE_PRO, STRIPE_PRICE_CHARTER (see billing/checkout.mjs), and
//   BETA_FIRM_EMAILS with every founding/beta firm's billing email so the gate
//   below actually excludes them. Until STRIPE_SECRET_KEY is set, every checkout
//   is simulated. Setting billing/secrets config is a human-only step
//   (compliance-invariants §VII: agents never touch billing or secrets config).
// NOTE: the Enterprise/volume tier is intentionally NOT self-serve — it is
// scoped by contact ("Custom — contact us for volume"), so it never reaches
// this route (the plan enum below only accepts core/pro/charter).

function betaFirmEmails(env = process.env): Set<string> {
  return new Set(
    (env.BETA_FIRM_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
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

  // GUARD 1 — beta/founding firms are free. Never route them to a charge.
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && betaFirmEmails().has(normalizedEmail)) {
    return Response.json(
      {
        betaFree: true,
        message:
          "Your firm is in the founding beta, so the desk is free. There’s nothing to check out. If something looks off, email ali@plaintiffops.com.",
      },
      { status: 200 },
    );
  }

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
