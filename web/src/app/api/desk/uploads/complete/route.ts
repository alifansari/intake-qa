// POST /api/desk/uploads/complete — step 2 of a storage-mode desk upload.
// The browser has already put the bytes in the private bucket via the signed
// URL; this registers the call (source 'manual', consent 'consented') and
// hands it to the SAME durable scoring path as the CallRail webhook:
// intakeqa/call.received -> scorePipeline (15-min sweep as the safety net).
// The path is verified to belong to the signed-in firm — no firm can register
// an object outside its own desk/<firmId>/ prefix.
import { z } from "zod";
import { requireDeskFirm } from "@/lib/desk/firm";
import { isStudioStorageConfigured, STUDIO_BUCKET } from "@/lib/studio/storage";
import { registerUploadedCall } from "../../../../../../ingest/uploads.mjs";
import { storageUrl } from "../../../../../../ingest/storage-audio.mjs";
import { inngest } from "../../../../../../inngest/client.mjs";
import { recordEventOn } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  // desk/<firmId>/<uuid>.<ext> — shape-checked here, ownership-checked below.
  path: z.string().regex(/^desk\/[A-Za-z0-9-]{1,64}\/[0-9a-f-]{36}\.(mp3|m4a|wav)$/),
  filename: z.string().min(1).max(255),
  consent_attested: z.literal(true),
});

export async function POST(req: Request) {
  if (!isStudioStorageConfigured()) {
    return Response.json({ error: "uploads are not configured" }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const store = await import("../../../../../../ingest/store.mjs");
  const db = await store.openPipelineDb();
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;

    // Ownership: the object must live under THIS firm's prefix.
    if (!body.path.startsWith(`desk/${gate.firm.id}/`)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const callId = await registerUploadedCall({
      db,
      firmId: gate.firm.id,
      recordingUrl: storageUrl(STUDIO_BUCKET, body.path),
      filename: body.filename,
    });

    // First-party event: a call actually landed and will be scored (day-0
    // activation signal on /studio/beta). Call id only, never the filename.
    await recordEventOn(db, {
      event: "upload_completed",
      firmId: gate.firm.id,
      actor: "firm",
      context: { callId: String(callId), mode: "storage" },
    });

    // Same handoff as the webhook: best-effort event; the sweep is the net.
    try {
      await inngest.send({
        name: "intakeqa/call.received",
        data: { firmId: gate.firm.id, callId },
      });
    } catch (sendErr: unknown) {
      await store
        .logError(db, {
          source: "api.desk.uploads.complete.inngest_send",
          message: sendErr instanceof Error ? sendErr.message : "inngest send failed",
          firm_id: null,
        })
        .catch(() => {});
    }

    return Response.json({ ok: true, id: String(callId) }, { status: 201 });
  } catch (err: unknown) {
    await store
      .logError(db, {
        source: "api.desk.uploads.complete",
        message: err instanceof Error ? err.message : "complete failed",
        firm_id: null,
      })
      .catch(() => {});
    return Response.json(
      { error: "We couldn't finish that upload — we've been notified. Please try again." },
      { status: 500 },
    );
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}
