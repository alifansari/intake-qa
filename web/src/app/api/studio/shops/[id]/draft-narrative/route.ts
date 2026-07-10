// POST /api/studio/shops/[id]/draft-narrative — founder-only. Drafts ONLY the
// two narrative fields (narrative_failure, narrative_fix) for the shop report
// from the founder's STRUCTURED channel facts + field notes. It NEVER grades a
// channel, ranks the firm, or computes any number — those are deterministic
// (shops-content.mjs). Output lands as EDITABLE DRAFT and resets the review
// gate (narrative_reviewed=false) so a human must approve before finalize.
//
// If ANTHROPIC_API_KEY is unconfigured, falls back to the deterministic no-LLM
// draft (draftShopNarrative) — same philosophy as the scorecard's mapper
// fallback: a grounded draft always exists.
import Anthropic from "@anthropic-ai/sdk";
import { requireFounderRoute } from "@/lib/studio/guard";
import { getShop, updateShop, listShopChannels } from "@/lib/studio/shops-data";
import {
  channelLabel,
  computeShopSummary,
  draftShopNarrative,
  formatLatency,
} from "@/lib/studio/shops";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `You draft prose for an "Intake Coverage Audit — Mystery Shop" report prepared by an independent intake scorer for a California plaintiff personal-injury firm. The firm's intake channels were shopped with a fixed scenario; you write TWO short fields only, from the structured per-channel facts and the analyst's field notes you are given.

STRICT RULES:
- You do NOT assign or mention any grade, rank, count, or number beyond restating the facts provided — grades and benchmarks are computed elsewhere deterministically. Never invent one.
- Every factual claim must trace to the provided facts/field notes. No citation, no claim. Do not invent quotes, events, dollar amounts, or outcomes.
- No guarantees, no promised recoveries, no manufactured urgency. Plain, precise, non-alarmist.
- This is a small structured sample; do not imply it measures the whole firm.
- The report is about the firm's own lost leads — keep it about their prospective clients' experience, not about any product or technology.
- Return ONE JSON object only, no prose around it, no code fences:
  { "narrative_failure": "...", "narrative_fix": "..." }
- narrative_failure: 2–4 sentences naming the single most expensive thing that went wrong across the shopped channels, grounded in the facts.
- narrative_fix: 2–4 sentences on the concrete, specific fix. Actionable, no fluff.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  const { supabase } = gate;

  const { id } = await params;
  const shop = await getShop(supabase, id);
  if (!shop) return Response.json({ error: "not found" }, { status: 404 });
  if (shop.status === "final") {
    return Response.json({ error: "shop report is finalized and locked" }, { status: 409 });
  }

  const channels = await listShopChannels(supabase, id);
  const summary = computeShopSummary(channels);
  if (summary.graded === 0) {
    return Response.json(
      { error: "no_graded_channels", message: "Grade at least one channel first." },
      { status: 409 },
    );
  }

  async function land(draft: { narrative_failure: string; narrative_fix: string }) {
    // Land as DRAFT and RESET the review gate — a human must approve.
    const updated = await updateShop(supabase, id, {
      narrative_failure: draft.narrative_failure,
      narrative_fix: draft.narrative_fix,
      narrative_reviewed: false,
    } as never);
    return Response.json({ shop: updated, draft });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Deterministic no-LLM fallback: grounded in the structured facts.
    const draft = draftShopNarrative(channels);
    if (!draft) {
      return Response.json(
        { error: "nothing_to_draft", message: "No fumbled or lost channel to write about." },
        { status: 409 },
      );
    }
    return land(draft);
  }

  const factLines = channels
    .map((c) => {
      const parts = [
        `- ${channelLabel(c.channel)}: ${c.grade ?? "not graded"}`,
        c.ring_count != null ? `${c.ring_count} rings` : null,
        c.response_latency_seconds != null
          ? `response after ${formatLatency(c.response_latency_seconds)}`
          : null,
        c.answered_by ? `answered by: ${c.answered_by}` : null,
        c.notes?.trim() ? `field notes: ${c.notes.trim()}` : null,
      ].filter(Boolean);
      return parts.join("; ");
    })
    .join("\n");

  const user = `PER-CHANNEL SHOP FACTS (analyst-entered):
${factLines}

Shop window: ${shop.shopped_from ?? "?"} to ${shop.shopped_to ?? "?"}. Scenario: ${shop.scenario_key ?? "(unspecified)"}.

Draft the two fields now. Ground every claim in the facts above.`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const text = (msg.content || [])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const s = clean.indexOf("{");
    const e = clean.lastIndexOf("}");
    if (s === -1 || e === -1) return Response.json({ error: "parse_failed" }, { status: 502 });
    let parsed: { narrative_failure?: string; narrative_fix?: string };
    try {
      parsed = JSON.parse(clean.slice(s, e + 1));
    } catch {
      return Response.json({ error: "parse_failed" }, { status: 502 });
    }
    return land({
      narrative_failure: parsed.narrative_failure ?? shop.narrative_failure ?? "",
      narrative_fix: parsed.narrative_fix ?? shop.narrative_fix ?? "",
    });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
