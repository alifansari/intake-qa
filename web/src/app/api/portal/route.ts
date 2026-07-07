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

export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  const db = await openPipelineDb();
  try {
    // Resolve the firm. Supabase membership is the real source; the pilot falls
    // back to the single firm on record.
    const user = await getCurrentUser().catch(() => null);
    let firmId: number | string | null =
      (user?.user_metadata?.firm_id as string | undefined) ?? null;
    if (!firmId) {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "could not open billing portal";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
