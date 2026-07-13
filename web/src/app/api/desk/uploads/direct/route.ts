// POST /api/desk/uploads/direct — the no-storage fallback for desk uploads
// (local dev / pilot without Supabase Storage). The bytes travel through the
// request body to a temp file, exactly like ingest/manual.mjs stores a local
// path for the scoring worker to transcribe. On Vercel this route is only
// reachable if storage is missing, and bodies over ~4.5MB die at the platform
// edge — which is why POST /api/desk/uploads advertises the honest direct cap
// and the storage path is the production mode.
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { requireDeskFirm } from "@/lib/desk/firm";
import {
  directUploadMaxBytes,
  fileProblem,
  fileExtension,
  registerUploadedCall,
} from "../../../../../../ingest/uploads.mjs";
import { inngest } from "../../../../../../inngest/client.mjs";
import { recordEventOn } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  // Consent attestation travels with the bytes (the page blocks without it,
  // this enforces it server-side too).
  if (form.get("consent_attested") !== "true") {
    return Response.json(
      { error: "Please confirm the consent box, then try the upload again." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || typeof (file as File).name !== "string") {
    return Response.json({ error: "no file uploaded" }, { status: 400 });
  }
  const upload = file as File;
  const problem = fileProblem(upload.name, upload.size, directUploadMaxBytes());
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const store = await import("../../../../../../ingest/store.mjs");
  const db = await store.openPipelineDb();
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;

    const audioPath = join(tmpdir(), `intakeqa-desk-${randomUUID()}.${fileExtension(upload.name)}`);
    await writeFile(audioPath, Buffer.from(await upload.arrayBuffer()));

    const callId = await registerUploadedCall({
      db,
      firmId: gate.firm.id,
      recordingUrl: audioPath,
      filename: upload.name,
    });

    // First-party event: a call actually landed and will be scored (day-0
    // activation signal on /studio/beta). Call id only, never the filename.
    await recordEventOn(db, {
      event: "upload_completed",
      firmId: gate.firm.id,
      actor: "firm",
      context: { callId: String(callId), mode: "direct" },
    });

    try {
      await inngest.send({
        name: "intakeqa/call.received",
        data: { firmId: gate.firm.id, callId },
      });
    } catch (sendErr: unknown) {
      await store
        .logError(db, {
          source: "api.desk.uploads.direct.inngest_send",
          message: sendErr instanceof Error ? sendErr.message : "inngest send failed",
          firm_id: null,
        })
        .catch(() => {});
    }

    return Response.json({ ok: true, id: String(callId) }, { status: 201 });
  } catch (err: unknown) {
    await store
      .logError(db, {
        source: "api.desk.uploads.direct",
        message: err instanceof Error ? err.message : "direct upload failed",
        firm_id: null,
      })
      .catch(() => {});
    return Response.json(
      { error: "We couldn’t take that upload — we’ve been notified. Please try again." },
      { status: 500 },
    );
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}
