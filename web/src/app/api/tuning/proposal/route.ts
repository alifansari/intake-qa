// POST /api/tuning/proposal — founder-only. Approve or reject a tuning
// proposal BY NAME. Approval merges the change into
// firm_escalation_config.overrides (the only sanctioned write path).
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { approveProposal, rejectProposal, isTuningStoreConfigured } from "@/lib/tuning/store";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  by: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  if (!isTuningStoreConfigured()) return Response.json({ configured: false });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    if (body.action === "approve") await approveProposal(body.id, body.by);
    else await rejectProposal(body.id, body.by);
    return Response.json({ ok: true, action: body.action });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "proposal action failed" },
      { status: 400 },
    );
  }
}
