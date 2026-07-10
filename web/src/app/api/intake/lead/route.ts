// POST /api/intake/lead — persist a snapshot of the canonical intake record
// from the chat demo. Public endpoint BY DESIGN (the visitor is anonymous),
// but write-only: it returns only the lead id, never reads anything back, and
// the intake tables have no public read/write policy (this route writes via
// the server-only store). Zod caps every field so the surface can't be abused
// for storage. Called on every step so an ABANDONED session is still a lead.
import { z } from "zod";
import {
  isIntakeStoreConfigured,
  saveLeadSnapshot,
  RecordSchema,
} from "@/lib/intake/store";
import { deriveEscalations } from "@/lib/escalation/engine.mjs";
import { sendAlert } from "@/lib/escalation/alert-sender.mjs";
import { fireEscalations, appendEscalationEvent } from "@/lib/escalation/store";

export const runtime = "nodejs";

const Body = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  record: RecordSchema,
});

export async function POST(req: Request) {
  if (!isIntakeStoreConfigured()) {
    // Demo still works without persistence — the UI shows the record locally.
    return Response.json({ stored: false });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const { leadId } = await saveLeadSnapshot(body.lead_id ?? null, body.record);

    // Phase 3: a COMPLETED record fires its escalations (idempotent per
    // lead+trigger). Alert "delivery" goes through the chokepoint, which is
    // mock/simulate-only in this codebase — the event log records what WOULD
    // have been sent (alert_attempted, simulated:true). Best-effort: an
    // escalation failure never breaks lead capture.
    if (body.record.status === "complete") {
      try {
        const derived = deriveEscalations(body.record, {});
        const fired = await fireEscalations(leadId, null, derived);
        for (const esc of fired) {
          const result = await sendAlert({
            escalationId: esc.id,
            tier: esc.tier,
            trigger_key: esc.trigger_key,
            target: { name: "on-call (mock)", channel: "mock" },
          });
          await appendEscalationEvent(
            esc.id,
            result.skipped ? "alert_suppressed" : "alert_attempted",
            result as unknown as Record<string, unknown>,
          );
        }
      } catch {
        // never let escalation plumbing break lead capture
      }
    }

    return Response.json({ stored: true, lead_id: leadId });
  } catch {
    return Response.json({ stored: false }, { status: 500 });
  }
}
