// POST /api/studio/scorecards/[id]/finalize — founder-only. Locks the scorecard:
// draft -> final, sets finalized_at + ref_code. HARD GATE: refuses unless the AI
// narrative has been human-reviewed (narrative_reviewed = true) AND both narrative
// fields exist. The DB CHECK enforces the review gate too (belt and suspenders).
import { requireFounderRoute } from "@/lib/studio/guard";
import { getSpotCheck, updateSpotCheck } from "@/lib/studio/data";
import { generateRefCode } from "@/lib/studio/scorecard";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const sc = await getSpotCheck(gate.supabase, id);
  if (!sc) return Response.json({ error: "not found" }, { status: 404 });
  if (sc.status === "final") {
    return Response.json({ spotCheck: sc, alreadyFinal: true });
  }

  // Review gate: no unreviewed AI text can reach a finalized/printed scorecard.
  if (!sc.narrative_reviewed) {
    return Response.json(
      { error: "review_required", message: "Review the drafted narrative before finalizing." },
      { status: 409 },
    );
  }
  if (!sc.narrative_failure?.trim() || !sc.narrative_fix?.trim()) {
    return Response.json(
      { error: "narrative_incomplete", message: "Both narrative fields are required." },
      { status: 409 },
    );
  }
  if (sc.computed_score == null || !sc.computed_grade) {
    return Response.json(
      { error: "score_incomplete", message: "Fill in the rubric inputs first." },
      { status: 409 },
    );
  }

  try {
    const updated = await updateSpotCheck(gate.supabase, id, {
      status: "final",
      finalized_at: new Date().toISOString(),
      ref_code: sc.ref_code ?? generateRefCode(),
    } as never);
    return Response.json({ spotCheck: updated });
  } catch {
    return Response.json({ error: "could not finalize" }, { status: 500 });
  }
}
