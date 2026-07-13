// POST /api/intake/interpret — the ONE narrow LLM task in the intake agent:
// turn the visitor’s free-text "what happened" into structured DATA FIELDS
// (summary, boolean flags). Output is never shown to the visitor and never
// touches routing (see guardrails.mjs for the UPL rationale — ABA Op. 512).
// Degrades silently: no ANTHROPIC_API_KEY → 200 with {interpreted:false} and
// the narrative stays verbatim-only.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { rateLimited } from "@/lib/intake/rate-limit";
import { INTERPRET_SYSTEM_RULES } from "@/lib/intake/guardrails.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-sonnet-4-6";

const Body = z.object({
  narrative: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  if (rateLimited(req)) return Response.json({ interpreted: false }, { status: 429 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ interpreted: false });

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      temperature: 0,
      system: INTERPRET_SYSTEM_RULES,
      messages: [{ role: "user", content: `NARRATIVE:\n${body.narrative}` }],
    });
    const text = (msg.content || [])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s === -1 || e === -1) return Response.json({ interpreted: false });
    const parsed = JSON.parse(text.slice(s, e + 1)) as Record<string, unknown>;
    // Whitelist the fields; anything else the model returns is dropped.
    return Response.json({
      interpreted: true,
      interpretation: {
        summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : undefined,
        mentions_injury: typeof parsed.mentions_injury === "boolean" ? parsed.mentions_injury : undefined,
        mentions_prior_attorney:
          typeof parsed.mentions_prior_attorney === "boolean" ? parsed.mentions_prior_attorney : undefined,
        distress_cues: typeof parsed.distress_cues === "boolean" ? parsed.distress_cues : undefined,
      },
    });
  } catch {
    return Response.json({ interpreted: false });
  }
}
