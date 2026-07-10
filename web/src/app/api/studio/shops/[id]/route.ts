// PATCH /api/studio/shops/[id] — founder-only. Saves the shop editor: per-channel
// structured facts (grade/rings/latency/answered-by are founder-entered facts,
// never LLM output) + shop fields, and ALWAYS recomputes the deterministic
// leakage from the inputs (same math + honesty stance as the scorecard: no
// attorney-supplied fee → no dollar figure). A 'final' shop is locked.
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { getShop, updateShop, upsertShopChannels } from "@/lib/studio/shops-data";
import { computeLeakage } from "@/lib/studio/rubric";
import {
  isShopChannelKey,
  isShopGradeKey,
  SHOP_PROTOCOL_TEXT_VERSION,
} from "@/lib/studio/shops";

export const runtime = "nodejs";

const ChannelRow = z.object({
  channel: z.string(),
  grade: z.string().nullable().optional(),
  ring_count: z.number().int().nonnegative().nullable().optional(),
  response_latency_seconds: z.number().int().nonnegative().nullable().optional(),
  answered_by: z.enum(["human", "machine", "none"]).nullable().optional(),
  attempted_at: z.string().nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
  spot_check_id: z.string().uuid().nullable().optional(),
});

const Body = z.object({
  shopped_from: z.string().nullable().optional(),
  shopped_to: z.string().nullable().optional(),
  market: z.string().max(200).nullable().optional(),
  scenario_key: z.string().max(200).nullable().optional(),
  // CIPA-safe fieldwork attestation (§II). Setting true stamps when + which
  // protocol text version was attested; the DB CHECK blocks finalize without it.
  protocol_attested: z.boolean().optional(),
  channels: z.array(ChannelRow).max(4).optional(),
  leakage_inputs: z
    .object({
      average_signed_case_fee: z.number().nonnegative().nullable().optional(),
      illustrative_monthly_recurrence: z.number().nonnegative().nullable().optional(),
    })
    .optional(),
  // Narrative fields are editable DRAFTS. Editing them resets the review gate.
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
  const existing = await getShop(gate.supabase, id);
  if (!existing) return Response.json({ error: "not found" }, { status: 404 });
  if (existing.status === "final") {
    return Response.json({ error: "shop report is finalized and locked" }, { status: 409 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  // Validate channel/grade vocabulary against the canonical sets (the DB CHECKs
  // back this up; validating here gives a clean 400 instead of a 500).
  const channels = body.channels ?? [];
  for (const c of channels) {
    if (!isShopChannelKey(c.channel)) {
      return Response.json({ error: `unknown channel: ${c.channel}` }, { status: 400 });
    }
    if (c.grade != null && !isShopGradeKey(c.grade)) {
      return Response.json({ error: `unknown grade: ${c.grade}` }, { status: 400 });
    }
  }

  const leakInputs =
    body.leakage_inputs ??
    ((existing.leakage_inputs as Record<string, number | null>) || {});
  const leak = computeLeakage({
    averageSignedCaseFee: leakInputs.average_signed_case_fee ?? null,
    illustrativeMonthlyRecurrence: leakInputs.illustrative_monthly_recurrence ?? null,
  });

  const narrativeChanged =
    (body.narrative_failure !== undefined &&
      body.narrative_failure !== existing.narrative_failure) ||
    (body.narrative_fix !== undefined && body.narrative_fix !== existing.narrative_fix);

  const patch: Record<string, unknown> = {
    leakage_inputs: {
      average_signed_case_fee: leak.averageSignedCaseFee,
      illustrative_monthly_recurrence: leak.illustrativeMonthlyRecurrence,
    },
    leakage_single_case: leak.singleCase,
    leakage_illustrative_annual: leak.illustrativeAnnual,
  };
  if (body.shopped_from !== undefined) patch.shopped_from = body.shopped_from;
  if (body.shopped_to !== undefined) patch.shopped_to = body.shopped_to;
  if (body.market !== undefined) patch.market = body.market;
  if (body.scenario_key !== undefined) patch.scenario_key = body.scenario_key;
  if (body.protocol_attested !== undefined) {
    patch.protocol_attested = body.protocol_attested;
    patch.protocol_attested_at = body.protocol_attested ? new Date().toISOString() : null;
    patch.protocol_text_version = body.protocol_attested ? SHOP_PROTOCOL_TEXT_VERSION : null;
  }
  if (body.narrative_failure !== undefined) patch.narrative_failure = body.narrative_failure;
  if (body.narrative_fix !== undefined) patch.narrative_fix = body.narrative_fix;
  if (narrativeChanged) patch.narrative_reviewed = false;
  else if (body.narrative_reviewed !== undefined)
    patch.narrative_reviewed = body.narrative_reviewed;

  try {
    if (body.channels !== undefined) {
      await upsertShopChannels(gate.supabase, id, channels);
    }
    const updated = await updateShop(gate.supabase, id, patch as never);
    return Response.json({ shop: updated });
  } catch {
    return Response.json({ error: "could not save" }, { status: 500 });
  }
}
