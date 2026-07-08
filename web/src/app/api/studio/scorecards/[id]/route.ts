// PATCH /api/studio/scorecards/[id] — founder-only. Saves editor fields and ALWAYS
// recomputes the deterministic score/grade/leakage from the structured inputs via
// the rubric (NO LLM in the number). A 'final' scorecard is locked (no edits).
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { getSpotCheck, updateSpotCheck } from "@/lib/studio/data";
import { recomputeDeterministic } from "@/lib/studio/scorecard";

export const runtime = "nodejs";

const Body = z.object({
  tested_at: z.string().optional(),
  scenario_key: z.string().max(200).nullable().optional(),
  touchpoints: z.array(z.unknown()).optional(),
  dimension_inputs: z.record(z.string(), z.number()).optional(),
  critical_fails: z.array(z.string()).optional(),
  notes: z.string().max(20000).nullable().optional(),
  leakage_inputs: z
    .object({
      average_signed_case_fee: z.number().nonnegative().nullable().optional(),
      illustrative_monthly_recurrence: z.number().nonnegative().nullable().optional(),
    })
    .optional(),
  // Narrative fields are editable DRAFTS. Editing them resets the review gate
  // (handled below) so unreviewed AI/edited text can never slip through.
  narrative_failure: z.string().max(20000).nullable().optional(),
  narrative_fix: z.string().max(20000).nullable().optional(),
  narrative_reviewed: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const existing = await getSpotCheck(gate.supabase, id);
  if (!existing) return Response.json({ error: "not found" }, { status: 404 });
  if (existing.status === "final") {
    return Response.json({ error: "scorecard is finalized and locked" }, { status: 409 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const dimensionInputs = body.dimension_inputs ?? existing.dimension_inputs ?? {};
  const criticalFails = body.critical_fails ?? existing.critical_fails ?? [];
  const leakInputs = body.leakage_inputs ?? (existing.leakage_inputs as Record<string, number>) ?? {};
  const fee =
    leakInputs && "average_signed_case_fee" in leakInputs
      ? (leakInputs.average_signed_case_fee as number | null)
      : null;
  const recurrence =
    leakInputs && "illustrative_monthly_recurrence" in leakInputs
      ? (leakInputs.illustrative_monthly_recurrence as number | null)
      : null;

  const { spot, leak } = recomputeDeterministic({
    dimensionInputs,
    criticalFails,
    averageSignedCaseFee: fee,
    illustrativeMonthlyRecurrence: recurrence,
  });

  // If narrative prose changed, force re-review (the human must re-approve edited
  // or freshly-drafted text before it can reach 'final'/print).
  const narrativeChanged =
    (body.narrative_failure !== undefined &&
      body.narrative_failure !== existing.narrative_failure) ||
    (body.narrative_fix !== undefined && body.narrative_fix !== existing.narrative_fix);

  const patch: Record<string, unknown> = {
    dimension_inputs: dimensionInputs,
    critical_fails: criticalFails,
    computed_score: spot.score,
    computed_grade: spot.grade,
    dimension_scores: spot.dimensionScores,
    leakage_inputs: {
      average_signed_case_fee: leak.averageSignedCaseFee,
      illustrative_monthly_recurrence: leak.illustrativeMonthlyRecurrence,
    },
    leakage_single_case: leak.singleCase,
    leakage_illustrative_annual: leak.illustrativeAnnual,
  };
  if (body.tested_at !== undefined) patch.tested_at = body.tested_at;
  if (body.scenario_key !== undefined) patch.scenario_key = body.scenario_key;
  if (body.touchpoints !== undefined) patch.touchpoints = body.touchpoints;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.narrative_failure !== undefined) patch.narrative_failure = body.narrative_failure;
  if (body.narrative_fix !== undefined) patch.narrative_fix = body.narrative_fix;
  if (narrativeChanged) patch.narrative_reviewed = false;
  else if (body.narrative_reviewed !== undefined)
    patch.narrative_reviewed = body.narrative_reviewed;

  try {
    const updated = await updateSpotCheck(gate.supabase, id, patch as never);
    return Response.json({ spotCheck: updated });
  } catch {
    return Response.json({ error: "could not save" }, { status: 500 });
  }
}
