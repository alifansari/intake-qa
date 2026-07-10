// POST /api/tuning/run — founder-only. Runs one tuning-loop pass: computes
// per-trigger precision from recorded dispositions and inserts PROPOSALS
// (never applies them — approval is a separate named action).
import { requireFounderRoute } from "@/lib/studio/guard";
import { runTuningLoop, isTuningStoreConfigured } from "@/lib/tuning/store";

export const runtime = "nodejs";

export async function POST() {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  if (!isTuningStoreConfigured()) return Response.json({ configured: false });
  try {
    const result = await runTuningLoop(null);
    return Response.json({ configured: true, ...result });
  } catch {
    return Response.json({ error: "tuning run failed" }, { status: 500 });
  }
}
