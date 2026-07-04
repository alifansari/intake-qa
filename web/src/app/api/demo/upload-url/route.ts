// POST /api/demo/upload-url — public, no-auth. Step 1 of the serverless-safe
// demo flow: rate-limit by IP, create an isolated demo_calls row, and hand back
// a short-lived signed URL the browser uploads the audio to DIRECTLY (bypassing
// Vercel's ~4.5MB request-body limit). When Supabase Storage isn't configured
// (e.g. local dev on SQLite) it returns { mode:"direct" } and the client falls
// back to the legacy /api/demo/upload path, which works on a long-lived server.
//
// NOTHING here can send — it only writes demo_calls and never creates a message.

import { z } from "zod";
import { openPipelineDb, closePipelineDb, createDemoCall } from "../../../../../ingest/store.mjs";
import { checkDemoRateLimit, purgeDemo } from "../../../../../ingest/demo.mjs";
import {
  isDemoStorageConfigured,
  createSignedDemoUpload,
  demoObjectPath,
  DEMO_BUCKET,
} from "../../../../lib/supabase/storage";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = new Set(["mp3", "m4a", "wav"]);

const Body = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "expected { filename, size }" }, { status: 400 });
  }

  const ext = (parsed.filename.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return Response.json(
      { error: "unsupported file type — upload an MP3, M4A, or WAV" },
      { status: 415 },
    );
  }
  if (parsed.size > MAX_BYTES) {
    return Response.json({ error: "file too large (25MB max)" }, { status: 413 });
  }

  const ip = clientIp(req);
  const db = await openPipelineDb();
  try {
    await purgeDemo({ db }).catch(() => {});

    const gate = await checkDemoRateLimit({ db, ip });
    if (!gate.allowed) {
      const msg =
        gate.reason === "concurrent"
          ? "A demo is still processing — please wait for it to finish."
          : "You've reached the hourly demo limit (3). Please try again later.";
      return Response.json({ error: msg, reason: gate.reason }, { status: 429 });
    }

    const id = await createDemoCall(db, { client_ip: ip, filename: parsed.filename });

    if (!isDemoStorageConfigured()) {
      // Local / no-storage fallback: client re-uploads the bytes to /api/demo/upload.
      return Response.json({ mode: "direct", id: String(id) }, { status: 200 });
    }

    const path = demoObjectPath(String(id), ext);
    const { signedUrl, token } = await createSignedDemoUpload(path);
    return Response.json(
      { mode: "storage", id: String(id), bucket: DEMO_BUCKET, path, signedUrl, token },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "could not start demo";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
