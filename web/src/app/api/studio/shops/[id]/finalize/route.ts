// POST /api/studio/shops/[id]/finalize — founder-only. Locks the shop report:
// draft -> final, sets finalized_at + ref_code (MS-YYYYMMDD-XXXX). Gates, all
// backed by DB CHECKs where marked:
//   * narrative_reviewed must be true (DB CHECK studio_shops_final_requires_review)
//   * protocol_attested must be true — the CIPA-safe fieldwork attestation,
//     compliance-invariants §II (DB CHECK studio_shops_final_requires_protocol)
//   * both narrative fields present
//   * at least one channel graded (an audit with no graded findings is not a
//     deliverable — no citation, no claim)
import { requireFounderRoute } from "@/lib/studio/guard";
import { getShop, updateShop, listShopChannels } from "@/lib/studio/shops-data";
import { generateShopRefCode, computeShopSummary } from "@/lib/studio/shops";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const shop = await getShop(gate.supabase, id);
  if (!shop) return Response.json({ error: "not found" }, { status: 404 });
  if (shop.status === "final") {
    return Response.json({ shop, alreadyFinal: true });
  }

  if (!shop.protocol_attested) {
    return Response.json(
      {
        error: "protocol_required",
        message:
          "Attest the CIPA-safe fieldwork protocol before finalizing (the attestation checkbox in the editor).",
      },
      { status: 409 },
    );
  }
  if (!shop.narrative_reviewed) {
    return Response.json(
      { error: "review_required", message: "Review the drafted narrative before finalizing." },
      { status: 409 },
    );
  }
  if (!shop.narrative_failure?.trim() || !shop.narrative_fix?.trim()) {
    return Response.json(
      { error: "narrative_incomplete", message: "Both narrative fields are required." },
      { status: 409 },
    );
  }

  const channels = await listShopChannels(gate.supabase, id);
  const summary = computeShopSummary(channels);
  if (summary.graded === 0) {
    return Response.json(
      {
        error: "no_graded_channels",
        message: "Grade at least one shopped channel before finalizing.",
      },
      { status: 409 },
    );
  }

  try {
    const updated = await updateShop(gate.supabase, id, {
      status: "final",
      finalized_at: new Date().toISOString(),
      ref_code: shop.ref_code ?? generateShopRefCode(),
    } as never);
    return Response.json({ shop: updated });
  } catch {
    return Response.json({ error: "could not finalize" }, { status: 500 });
  }
}
