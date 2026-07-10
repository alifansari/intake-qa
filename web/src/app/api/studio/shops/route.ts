// GET/POST /api/studio/shops — founder-only. List shops (optionally per firm) /
// create a draft mystery-shop audit for a firm. Same guard stack as the rest of
// the Studio (middleware + requireFounderRoute + RLS).
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { listShops, createShop } from "@/lib/studio/shops-data";
import { getFirm } from "@/lib/studio/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  const firmId = new URL(req.url).searchParams.get("firm") ?? undefined;
  try {
    const shops = await listShops(gate.supabase, firmId);
    return Response.json({ shops });
  } catch {
    return Response.json({ error: "could not list shops" }, { status: 500 });
  }
}

const CreateBody = z.object({
  firm_id: z.string().uuid(),
  market: z.string().max(200).nullable().optional(),
});

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const firm = await getFirm(gate.supabase, body.firm_id);
  if (!firm) return Response.json({ error: "firm not found" }, { status: 404 });

  try {
    const shop = await createShop(gate.supabase, {
      firm_id: body.firm_id,
      market: body.market ?? null,
    });
    return Response.json({ shop }, { status: 201 });
  } catch {
    return Response.json({ error: "could not create shop" }, { status: 500 });
  }
}
