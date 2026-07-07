// POST /api/coach/consent — record the recording/analysis consent affirmation for
// the Live Coach BEFORE the microphone can open (P0-2 / CIPA Penal Code §632).
//
// The coach page must call this and receive a 200 before it starts speech
// recognition. This writes a ConsentEvent through the store/Repository so there is
// a durable, firm-scoped record that consent was affirmed. Denied by default when
// the caller's firm is not entitled to the coach.
import { z } from "zod";
import {
  openPipelineDb,
  closePipelineDb,
  createConsentEvent,
  logError,
} from "../../../../../ingest/store.mjs";
import { isLiveCoachEntitled } from "@/lib/coach-entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The exact affirmation the operator must actively confirm on screen.
export const CONSENT_STATEMENT =
  "All parties on this call have consented to recording and analysis under CA Penal Code §632";

const BodySchema = z.object({
  // Must echo the exact affirmation, and confirmed must be true — a passive or
  // partial confirmation is rejected (active confirmation required).
  affirmation: z.string(),
  confirmed: z.literal(true),
});

export async function POST(req: Request) {
  const { entitled, firmId } = await isLiveCoachEntitled();
  if (!entitled) {
    return Response.json({ error: "not_entitled" }, { status: 403 });
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "consent_not_affirmed" }, { status: 400 });
  }
  if (parsed.affirmation.trim() !== CONSENT_STATEMENT) {
    return Response.json({ error: "consent_not_affirmed" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const consentId = await createConsentEvent(db, {
      firm_id: firmId ?? null,
      basis: "live_coach_recording_analysis_CIPA_632",
      detail: CONSENT_STATEMENT,
      actor: "desk_operator",
    });
    return Response.json({ ok: true, consent_id: consentId }, { status: 200 });
  } catch (err) {
    await logError(db, {
      source: "api.coach.consent",
      message: err instanceof Error ? err.message : "consent write failed",
      firm_id: null,
    }).catch(() => {});
    return Response.json({ error: "consent_write_failed" }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
