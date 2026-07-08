// POST /api/studio/firms — founder-only. Create a firm the founder is spot-checking.
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { createFirm, listFirms } from "@/lib/studio/data";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(60).optional(),
  website: z.string().max(300).optional(),
});

export async function GET() {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  const firms = await listFirms(gate.supabase);
  return Response.json({ firms });
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "expected { name, ... }" }, { status: 400 });
  }

  try {
    const firm = await createFirm(gate.supabase, parsed);
    return Response.json({ firm }, { status: 201 });
  } catch {
    return Response.json({ error: "could not create firm" }, { status: 500 });
  }
}
