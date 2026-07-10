// POST /api/oncall/sweep — founder-only. Runs one ack-timeout sweep pass:
// routes fresh escalations (assign target + deadline) and waterfalls overdue
// unacked ones toward the backstop. Alerting inside stays mock-only. This is
// the manual/cron entry point; a scheduled runner can call it later.
import { requireFounderRoute } from "@/lib/studio/guard";
import { sweepEscalations, isSweepConfigured } from "@/lib/oncall/sweep";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  if (!isSweepConfigured()) {
    return Response.json({ configured: false });
  }
  try {
    const result = await sweepEscalations();
    return Response.json({ configured: true, ...result });
  } catch {
    return Response.json({ error: "sweep failed" }, { status: 500 });
  }
}
