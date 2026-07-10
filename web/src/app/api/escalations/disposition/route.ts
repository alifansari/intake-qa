// POST /api/escalations/disposition — founder-only. Record the disposition on
// a resolved escalation (Phase 5 input). false_positive requires a reason
// (DB CHECK backs this up); "converted" is the separate conversion axis and
// never affects precision. Named, like every judgment in this system.
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { recordDisposition, isTuningStoreConfigured } from "@/lib/tuning/store";

export const runtime = "nodejs";

const Body = z.object({
  escalation_id: z.string().uuid(),
  disposition: z.enum(["true_positive", "false_positive", "right_call_bad_outcome"]),
  fp_reason: z.string().max(500).optional(),
  converted: z.boolean().nullable().optional(),
  by: z.string().min(1).max(120),
  note: z.string().max(2000).optional(),
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
    await recordDisposition({
      escalation_id: body.escalation_id,
      disposition: body.disposition,
      fp_reason: body.fp_reason,
      converted: body.converted ?? null,
      noted_by: body.by,
      note: body.note,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "disposition failed" },
      { status: 400 },
    );
  }
}
