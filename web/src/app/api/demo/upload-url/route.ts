// POST /api/demo/upload-url — public, no-auth. Step 1 of the serverless-safe
// demo flow: rate-limit by IP, create an isolated demo_calls row, and hand back
// a short-lived signed URL the browser uploads the audio to DIRECTLY (bypassing
// Vercel's ~4.5MB request-body limit). When Supabase Storage isn't configured
// (e.g. local dev on SQLite) it returns { mode:"direct" } and the client falls
// back to the legacy /api/demo/upload path, which works on a long-lived server.
//
// NOTHING here can send — it only writes demo_calls and never creates a message.

import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  openPipelineDb,
  closePipelineDb,
  createDemoCall,
  countAuditSessionCalls,
  attachDemoCallToSession,
  logError,
} from "../../../../../ingest/store.mjs";
import { checkDemoRateLimit, purgeDemo } from "../../../../../ingest/demo.mjs";
import { resolveSession, MAX_CALLS_PER_SESSION } from "../../../../../ingest/audit.mjs";
import type { ResolveResult } from "@/lib/audit-types";
import {
  isDemoStorageConfigured,
  createSignedDemoUpload,
  demoObjectPath,
  DEMO_BUCKET,
} from "../../../../lib/supabase/storage";
import {
  STORAGE_UPLOAD_MAX_BYTES,
  directUploadMaxBytes,
  toMb,
} from "../../../../../ingest/uploads.mjs";

export const runtime = "nodejs";

// Copy = reality: the cap depends on HOW the bytes travel. Signed-URL storage
// mode matches the studio path (200MB — a 45-minute intake call fits); direct
// mode (no storage configured) is bounded by the request body — ~4.5MB on
// Vercel, 25MB on a long-lived local server. The uploader UIs read this from
// GET below instead of hard-coding a number that can lie.
function currentMaxBytes(): number {
  return isDemoStorageConfigured() ? STORAGE_UPLOAD_MAX_BYTES : directUploadMaxBytes();
}

const ALLOWED_EXT = new Set(["mp3", "m4a", "wav"]);

const Body = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  // Optional Intake Quality Audit session token — when present, this upload joins that
  // session (governed by the session's 10-call cap, not the 3/hour demo limit).
  session: z.string().min(1).max(128).optional(),
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
  const maxBytes = currentMaxBytes();
  if (parsed.size > maxBytes) {
    return Response.json(
      {
        error: `That file is ${toMb(parsed.size)}MB and the limit here is ${toMb(maxBytes)}MB — try re-exporting it as an MP3, or email it to ali@plaintiffops.com and we'll run it by hand.`,
      },
      { status: 413 },
    );
  }

  const ip = clientIp(req);
  const db = await openPipelineDb();
  try {
    await purgeDemo({ db }).catch(() => {});

    // Audit uploads are bounded by the session (10 calls, 1 session/7d/visitor),
    // so they skip the single-call demo 3/hour gate. Everything else stays a demo.
    let auditSessionId: unknown = null;
    if (parsed.session) {
      const resolved = (await resolveSession({ db, token: parsed.session })) as ResolveResult;
      if (!resolved.ok || !resolved.session) {
        const status = resolved.reason === "not_found" ? 404 : 410;
        return Response.json(
          { error: "audit session unavailable", reason: resolved.reason },
          { status },
        );
      }
      const count = await countAuditSessionCalls(db, resolved.session.id);
      if (count >= MAX_CALLS_PER_SESSION) {
        return Response.json(
          { error: `An audit holds up to ${MAX_CALLS_PER_SESSION} calls.`, reason: "call_limit" },
          { status: 429 },
        );
      }
      auditSessionId = resolved.session.id;
    } else {
      const gate = await checkDemoRateLimit({ db, ip });
      if (!gate.allowed) {
        const msg =
          gate.reason === "concurrent"
            ? "A demo is still processing — please wait for it to finish."
            : "You've reached the hourly demo limit (3). Please try again later.";
        return Response.json({ error: msg, reason: gate.reason }, { status: 429 });
      }
    }

    const statusToken = randomBytes(24).toString("base64url");
    const { id } = await createDemoCall(db, {
      client_ip: ip,
      filename: parsed.filename,
      public_token: statusToken,
    });

    if (!isDemoStorageConfigured()) {
      // Local / no-storage fallback: the client re-uploads the bytes to
      // /api/demo/upload (passing the session itself, which creates + attaches
      // its own row there). This row is unused in direct mode; it purges at 72h.
      return Response.json({ mode: "direct", id: String(id), statusToken }, { status: 200 });
    }

    // Storage mode: the row created here is the one that gets processed, so
    // attach IT to the audit session.
    if (auditSessionId != null) await attachDemoCallToSession(db, auditSessionId, id);

    const path = demoObjectPath(String(id), ext);
    // `token` here is the Supabase signed-upload token — distinct from
    // statusToken, which is the unguessable handle the client polls with.
    const { signedUrl, token } = await createSignedDemoUpload(path);
    return Response.json(
      { mode: "storage", id: String(id), statusToken, bucket: DEMO_BUCKET, path, signedUrl, token },
      { status: 200 },
    );
  } catch (err: unknown) {
    // P1(c): generic message to the client; details to the server log only.
    await logError(db, {
      source: "api.demo.upload-url",
      message: err instanceof Error ? err.message : "could not start demo",
      firm_id: null,
    }).catch(() => {});
    return Response.json({ error: "could not start demo" }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}

// GET — capability probe for the uploader UIs (/audit, /demo): which mode this
// deploy runs and the REAL size cap, so on-page copy always equals what the
// server will actually accept. No auth, no writes, nothing sensitive.
export async function GET() {
  const storage = isDemoStorageConfigured();
  const maxBytes = currentMaxBytes();
  return Response.json({
    mode: storage ? "storage" : "direct",
    max_bytes: maxBytes,
    max_mb: toMb(maxBytes),
  });
}
