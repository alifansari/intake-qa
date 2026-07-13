// /desk/upload API — firm-scoped recording uploads (kills the "email files to
// the founder" bottleneck).
//
// POST: step 1 of an upload. Signed-in + firm-scoped (requireDeskFirm — the
//   same rules as every desk page). Validates the file with plain-English
//   errors, requires the consent attestation, and answers with either
//     { mode:"storage", signedUrl, ... }  — browser uploads DIRECTLY to the
//       private bucket via the studio signed-URL pattern (200MB, bypasses
//       Vercel’s ~4.5MB body ceiling), then calls /complete; or
//     { mode:"direct", max_bytes }       — no storage configured (local/pilot):
//       browser sends the bytes to /direct instead.
//   No call row is created here — a half-finished upload must never become a
//   call the score sweep tries to read.
//
// GET: the firm’s recent uploads with the honest per-file status the page
//   polls (waiting -> scoring -> done | failed). This is where failed_scoring
//   stops being founder-only and becomes visible to the firm that uploaded.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireDeskFirm } from "@/lib/desk/firm";
import {
  isStudioStorageConfigured,
  createSignedStudioUpload,
  STUDIO_BUCKET,
} from "@/lib/studio/storage";
import {
  STORAGE_UPLOAD_MAX_BYTES,
  directUploadMaxBytes,
  fileProblem,
  fileExtension,
  deriveUploadStatus,
  uploadFilenameFrom,
} from "../../../../../ingest/uploads.mjs";
import { recordEventOn } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  // The firm attests these calls were recorded with the consent the law
  // requires (CIPA §632 — California is all-party consent). Non-optional.
  consent_attested: z.literal(true),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json(
      { error: "Please confirm the consent box, then try the upload again." },
      { status: 400 },
    );
  }

  const storageMode = isStudioStorageConfigured();
  const maxBytes = storageMode ? STORAGE_UPLOAD_MAX_BYTES : directUploadMaxBytes();
  const problem = fileProblem(body.filename, body.size, maxBytes);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured() && storageMode) {
    return Response.json({ error: "no database" }, { status: 503 });
  }
  const db = await store.openPipelineDb();
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;

    // First-party event: a firm reaching for the upload path (counts toward
    // day-0 activation on /studio/beta). Extension + mode only, never the
    // filename or any caller content.
    await recordEventOn(db, {
      event: "upload_started",
      firmId: gate.firm.id,
      actor: "firm",
      context: { mode: storageMode ? "storage" : "direct", ext: fileExtension(body.filename) },
    });

    if (!storageMode) {
      return Response.json({ mode: "direct", max_bytes: maxBytes }, { status: 200 });
    }

    const ext = fileExtension(body.filename);
    const path = `desk/${gate.firm.id}/${randomUUID()}.${ext}`;
    const { signedUrl, token } = await createSignedStudioUpload(path);
    return Response.json(
      { mode: "storage", bucket: STUDIO_BUCKET, path, signedUrl, token, max_bytes: maxBytes },
      { status: 200 },
    );
  } catch (err: unknown) {
    await store
      .logError(db, {
        source: "api.desk.uploads.start",
        message: err instanceof Error ? err.message : "could not start upload",
        firm_id: null,
      })
      .catch(() => {});
    return Response.json(
      { error: "We couldn’t start the upload — we’ve been notified. Please try again in a minute." },
      { status: 500 },
    );
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}

export async function GET() {
  const store = await import("../../../../../ingest/store.mjs");
  const db = await store.openPipelineDb();
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;

    const { listFirmUploads } = await import("../../../../../beta/store.mjs");
    const rows = (await listFirmUploads(db, gate.firm.id)) as Array<Record<string, unknown>>;
    const uploads = rows.map((r) => ({
      id: String(r.id),
      filename: uploadFilenameFrom(r.external_call_id) ?? "recording",
      status: deriveUploadStatus(r),
      uploaded_at: (r.created_at as string) ?? (r.received_at as string) ?? null,
    }));

    const storageMode = isStudioStorageConfigured();
    return Response.json({
      uploads,
      mode: storageMode ? "storage" : "direct",
      max_bytes: storageMode ? STORAGE_UPLOAD_MAX_BYTES : directUploadMaxBytes(),
    });
  } catch (err: unknown) {
    await store
      .logError(db, {
        source: "api.desk.uploads.list",
        message: err instanceof Error ? err.message : "could not list uploads",
        firm_id: null,
      })
      .catch(() => {});
    return Response.json({ error: "could not load uploads" }, { status: 500 });
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}
