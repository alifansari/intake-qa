// POST /api/portal — open the Stripe Customer Portal (self-serve cancel / card
// update) for the signed-in firm.
//
// TEST_MODE-SAFE: with no Stripe keys / TEST_MODE, returns a simulated URL back
// to the settings page and never calls Stripe.
//
// Firm resolution: when Supabase is configured we read the caller's firm from
// their firm_members owner/operator row; otherwise (pilot) we fall back to the
// first firm on record so the pilot desk can still surface the control.

import { openPipelineDb, closePipelineDb, listFirms } from "../../../../ingest/store.mjs";
import { createPortalSession } from "../../../../billing/portal.mjs";
import { getCurrentUser } from "@/lib/supabase/server";
import { truthy } from "../../../../messaging/compliance.mjs";

export const runtime = "nodejs";

// P0-5b: the single-tenant pilot fallback (resolve firms[0] with no auth) is a
// convenience for the local pilot only. It is DENIED BY DEFAULT and must be
// explicitly opted into. In any real (multi-tenant / deployed) context the caller
// must be authenticated or the route returns 401.
function pilotFallbackAllowed(env = process.env): boolean {
  return truthy(env.PILOT_SINGLE_TENANT_FALLBACK);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  const db = await openPipelineDb();
  try {
    // Resolve the firm. Supabase membership is the real source of truth.
    const user = await getCurrentUser().catch(() => null);
    let firmId: number | string | null =
      (user?.user_metadata?.firm_id as string | undefined) ?? null;

    if (!firmId) {
      // No authenticated firm. Only fall back to the single-tenant pilot firm if
      // explicitly enabled; otherwise this is unauthenticated -> 401.
      if (!pilotFallbackAllowed()) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const firms = (await listFirms(db).catch(() => [])) as Array<{ id: number | string }>;
      firmId = firms[0]?.id ?? null;
    }
    if (!firmId) {
      return Response.json({ error: "no firm on record" }, { status: 404 });
    }

    const res = await createPortalSession({
      db,
      firmId,
      returnUrl: `${origin}/desk/settings`,
    });
    if (res.error) {
      return Response.json({ error: res.error }, { status: 409 });
    }
    return Response.json(res, { status: 200 });
  } catch {
    return Response.json({ error: "could not open billing portal" }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
