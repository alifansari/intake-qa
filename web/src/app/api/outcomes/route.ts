import { NextResponse } from "next/server";
import { z } from "zod";
import { repo } from "@/lib/json-repository";
import { OutcomeCode } from "@/lib/schema";

export const runtime = "nodejs";

const Body = z.object({
  call_id: z.string(),
  outcome_code: OutcomeCode,
  callback_made: z.boolean().optional(),
  callback_timestamp: z.string().nullable().optional(),
  time_to_callback_hours: z.number().nullable().optional(),
  who_called: z.string().nullable().optional(),
  realized_fee_recovered: z.number().nullable().optional(),
  outcome_entered_by: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { call_id, ...patch } = parsed.data;
  const saved = await repo.upsertOutcome(call_id, patch);
  return NextResponse.json({ outcome: saved });
}
