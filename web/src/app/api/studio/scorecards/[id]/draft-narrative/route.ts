// POST /api/studio/scorecards/[id]/draft-narrative — founder-only. Anthropic drafts
// ONLY the two narrative fields (narrative_failure, narrative_fix) from STRUCTURED
// inputs + the founder's notes + the engine analysis (transcript excerpt/summary).
// It NEVER computes the score. Output lands as EDITABLE DRAFT text and resets the
// review gate (narrative_reviewed=false) so a human must approve before finalize.
import Anthropic from "@anthropic-ai/sdk";
import { requireFounderRoute } from "@/lib/studio/guard";
import { getSpotCheck, updateSpotCheck, getRecordingForSpotCheck } from "@/lib/studio/data";
import { DIMENSIONS, CRITICAL_FAILS } from "@/lib/studio/rubric";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `You draft prose for an "Intake Quality Audit — Spot Check" scorecard prepared by an independent intake scorer for a California plaintiff personal-injury firm. You write TWO short fields only, from the structured facts and the cited transcript evidence you are given.

STRICT RULES:
- You do NOT assign or mention any score, grade, or number — those are computed elsewhere by a fixed rubric. Never invent one.
- Every factual claim must trace to the provided evidence (transcript excerpt / analysis). No citation, no claim. Do not invent quotes, facts, dollar amounts, or outcomes.
- No guarantees, no "slam dunk", no promised recoveries. Plain, precise, non-alarmist. No manufactured urgency.
- This is a spot check of a small sample; do not imply it measures the whole firm.
- Return ONE JSON object only, no prose around it, no code fences:
  { "narrative_failure": "...", "narrative_fix": "..." }
- narrative_failure: 2–4 sentences naming the single most expensive thing that went wrong on this call, grounded in the evidence.
- narrative_fix: 2–4 sentences on the concrete, specific fix. Actionable, no fluff.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "analysis_unconfigured" }, { status: 503 });

  const { id } = await params;
  const sc = await getSpotCheck(gate.supabase, id);
  if (!sc) return Response.json({ error: "not found" }, { status: 404 });
  if (sc.status === "final") {
    return Response.json({ error: "scorecard is finalized and locked" }, { status: 409 });
  }

  const rec = await getRecordingForSpotCheck(gate.supabase, id);
  const scoring = (rec?.scoring ?? {}) as Record<string, unknown>;

  // Compact, structured inputs for the drafter (NOT the raw transcript in full —
  // give it the engine's summary + evidence quotes + the founder's structured
  // findings). The transcript is available but we send a bounded slice as context.
  const dimLabels = DIMENSIONS.map((d) => {
    const v = (sc.dimension_inputs ?? {})[d.key];
    return `- ${d.label}: ${v === 100 ? "good" : v === 50 ? "partial" : "poor/absent"}`;
  }).join("\n");
  const activeFails = (sc.critical_fails ?? [])
    .map((k) => CRITICAL_FAILS.find((c) => c.key === k)?.label)
    .filter(Boolean)
    .join("; ");

  const evidenceSummary =
    typeof scoring.summary === "string" ? scoring.summary : "(no engine summary available)";
  const transcriptSlice =
    typeof rec?.transcript === "string" ? rec.transcript.slice(0, 6000) : "(no transcript)";

  const user = `STRUCTURED FINDINGS (founder-entered):
${dimLabels}
Critical fails checked: ${activeFails || "none"}
Founder notes: ${sc.notes || "(none)"}

ENGINE ANALYSIS SUMMARY (evidence): ${evidenceSummary}

TRANSCRIPT EXCERPT (evidence to cite from):
${transcriptSlice}

Draft the two fields now. Ground every claim in the evidence above.`;

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

    // Land as DRAFT and RESET the review gate — a human must approve.
    const updated = await updateSpotCheck(gate.supabase, id, {
      narrative_failure: parsed.narrative_failure ?? sc.narrative_failure,
      narrative_fix: parsed.narrative_fix ?? sc.narrative_fix,
      narrative_reviewed: false,
    } as never);
    return Response.json({
      spotCheck: updated,
      draft: {
        narrative_failure: parsed.narrative_failure ?? "",
        narrative_fix: parsed.narrative_fix ?? "",
      },
    });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
