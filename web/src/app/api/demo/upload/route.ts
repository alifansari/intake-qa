// POST /api/demo/upload — public, no-auth Demo Mode upload.
//
// Accepts one audio file (mp3/m4a/wav, <=25MB), rate-limits by IP (3/hour, 1
// concurrent), creates an isolated demo_calls row, writes the bytes to a temp
// file, and kicks off the demo pipeline (transcribe -> frozen scoring -> flag).
// The audio is deleted the moment it is transcribed. Returns { id } immediately;
// the client polls /api/demo/status. NOTHING here can send — the demo pipeline
// writes only to demo_calls and never creates a message row.

import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openPipelineDb, closePipelineDb, createDemoCall } from "../../../../../ingest/store.mjs";
import { runDemoPipeline, checkDemoRateLimit, purgeDemo } from "../../../../../ingest/demo.mjs";

export const runtime = "nodejs";
export const maxDuration = 300; // allow long transcription/scoring where supported

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = new Set(["mp3", "m4a", "wav"]);

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "expected multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob) || typeof (file as File).name !== "string") {
    return Response.json({ error: "no file uploaded" }, { status: 400 });
  }
  const upload = file as File;
  const ext = (upload.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return Response.json(
      { error: "unsupported file type — upload an MP3, M4A, or WAV" },
      { status: 415 },
    );
  }
  if (upload.size > MAX_BYTES) {
    return Response.json({ error: "file too large (25MB max)" }, { status: 413 });
  }

  const ip = clientIp(req);
  const db = await openPipelineDb();
  try {
    // Opportunistic retention purge (also runnable as a cron).
    await purgeDemo({ db }).catch(() => {});

    const gate = await checkDemoRateLimit({ db, ip });
    if (!gate.allowed) {
      const msg =
        gate.reason === "concurrent"
          ? "A demo is still processing — please wait for it to finish."
          : "You've reached the hourly demo limit (3). Please try again later.";
      await closePipelineDb(db);
      return Response.json({ error: msg, reason: gate.reason }, { status: 429 });
    }

    const id = await createDemoCall(db, { client_ip: ip, filename: upload.name });

    // Persist bytes to a temp file the pipeline transcribes then deletes.
    const audioPath = join(tmpdir(), `intakeqa-demo-${id}.${ext}`);
    const buf = Buffer.from(await upload.arrayBuffer());
    await writeFile(audioPath, buf);

    // Fire-and-forget: process in the background, close the db when done. The
    // client polls /api/demo/status for staged progress. (On a long-lived Node
    // server this runs to completion; see GO_LIVE.md for the serverless note.)
    void runDemoPipeline({
      db,
      demoCallId: id,
      audioPath,
      onAudioProcessed: async (p: string) => { await unlink(p).catch(() => {}); },
    })
      .catch(() => {})
      .finally(() => closePipelineDb(db));

    return Response.json({ id: String(id) }, { status: 202 });
  } catch (err: unknown) {
    await closePipelineDb(db).catch(() => {});
    const message = err instanceof Error ? err.message : "upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
