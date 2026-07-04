// POST /api/demo/process — public, no-auth. Step 2 of the serverless-safe demo
// flow (storage mode only). Downloads the audio the browser uploaded to Storage,
// runs transcribe -> frozen scoring -> flag SYNCHRONOUSLY (the awaited request
// keeps the function alive up to maxDuration, unlike fire-and-forget which dies
// on serverless), then deletes the audio. The client polls /api/demo/status for
// staged progress + the result. NOTHING here can send.

import { z } from "zod";
import { unlink } from "node:fs/promises";
import { openPipelineDb, closePipelineDb, getDemoCall } from "../../../../../ingest/store.mjs";
import { runDemoPipeline } from "../../../../../ingest/demo.mjs";
import {
  isDemoStorageConfigured,
  downloadDemoAudio,
  removeDemoAudio,
  demoObjectPath,
} from "../../../../lib/supabase/storage";

export const runtime = "nodejs";
export const maxDuration = 300; // Pro plan: allow long transcription/scoring

const ALLOWED_EXT = new Set(["mp3", "m4a", "wav"]);
const Body = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  if (!isDemoStorageConfigured()) {
    return Response.json({ error: "storage not configured" }, { status: 400 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "expected { id }" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const row = await getDemoCall(db, parsed.id);
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    // Only process a freshly-created row — guards against re-processing/abuse.
    if (row.status !== "queued") {
      return Response.json({ ok: true, status: row.status }, { status: 200 });
    }

    const ext = (String(row.filename ?? "").split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return Response.json({ error: "unsupported file type" }, { status: 415 });
    }

    const path = demoObjectPath(String(row.id), ext);
    const audioPath = await downloadDemoAudio(path);

    // Audio is confidential: delete the temp file AND the storage object the
    // moment transcription is done (runDemoPipeline calls this after transcribe).
    const onAudioProcessed = async (p: string) => {
      await unlink(p).catch(() => {});
      await removeDemoAudio(path).catch(() => {});
    };

    const res = await runDemoPipeline({ db, demoCallId: row.id, audioPath, onAudioProcessed });
    return Response.json({ ok: res.ok !== false, error: res.error ?? null }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "processing failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
