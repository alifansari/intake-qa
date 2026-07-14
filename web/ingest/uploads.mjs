// Firm self-serve recording uploads — the business logic behind /desk/upload
// and the shared upload limits for every uploader (desk, Leak Audit, demo).
//
// Pure helpers live here (testable, no I/O) plus registerUploadedCall, the one
// write path that turns an uploaded file into a `calls` row. The row is
// IDENTICAL in shape to a CallRail-ingested call (source 'manual', same table),
// so the scoring pipeline (intakeqa/call.received -> scorePipeline ->
// scoreUnscored) treats uploads exactly like webhook calls — one pipeline, no
// special cases.

import { randomUUID } from "node:crypto";
import { upsertCall } from "./store.mjs";
import { setCallConsentStatus } from "../beta/store.mjs";

// ---------------------------------------------------------------------------
// Limits — the single source of truth, shared by /api/desk/uploads and the
// public /api/demo routes so UI copy can never drift from what the server
// actually accepts.
//
// * Storage mode (Supabase signed URL): the browser uploads DIRECTLY to the
//   private bucket, bypassing Vercel's ~4.5MB request-body ceiling — a
//   full-length 45-minute intake call fits comfortably under 200MB. This is the
//   DEFAULT path and the only one that handles real-length calls. It REQUIRES
//   two env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   (see storageUploadAvailable + isStudioStorageConfigured). Without them the
//   product silently falls back to the 4MB direct trap below.
// * Direct mode (no storage configured): the bytes travel through the Next
//   route body. On Vercel that dies at ~4.5MB BEFORE our handler runs, so the
//   honest advertised cap there is 4MB; on a long-lived local/pilot server
//   25MB is fine. A real intake call (10-50MB) CANNOT be handled in this mode —
//   at scale that is a config error, not a "your file is too big" user error.
// ---------------------------------------------------------------------------

export const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav"]);
export const STORAGE_UPLOAD_MAX_BYTES = 200 * 1024 * 1024; // matches the studio signed-URL path

export function directUploadMaxBytes(env = process.env) {
  return env.VERCEL ? 4 * 1024 * 1024 : 25 * 1024 * 1024;
}

// The signed-URL (200MB) path is available iff BOTH Supabase env vars are set.
// This is the single source of truth for "can we accept a real-length call?" and
// mirrors isStudioStorageConfigured() in src/lib/studio/storage.ts (kept in the
// .mjs layer so ingest code that can't import server-only TS can gate on it too).
// SUPABASE_SERVICE_ROLE_KEY is the load-bearing secret: set it in the host env or
// every upload is stuck under the 4MB direct trap.
export function storageUploadAvailable(env = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

// LOUD operator diagnostic (for logError / server logs, NOT the firm-facing UI).
// Returns a clear config-cause message when a file is too big for direct mode
// AND the signed-URL path isn't configured — so the real fix (set the service-
// role key) surfaces instead of the firm just seeing a polite "re-export" no.
// Returns null when there's no config gap (storage available, or the file fits).
export function largeUploadConfigWarning(size, env = process.env) {
  if (storageUploadAvailable(env)) return null;
  if (!Number.isFinite(size) || size <= directUploadMaxBytes(env)) return null;
  return (
    `Upload of ${toMb(size)}MB rejected: the 200MB signed-URL path is NOT configured ` +
    `(missing SUPABASE_SERVICE_ROLE_KEY${env.NEXT_PUBLIC_SUPABASE_URL ? "" : " and NEXT_PUBLIC_SUPABASE_URL"}). ` +
    `Set it in the host env so real-length calls (10-50MB) can be accepted; until then ` +
    `the direct cap is only ${toMb(directUploadMaxBytes(env))}MB.`
  );
}

export function toMb(bytes) {
  return Math.max(1, Math.round(bytes / (1024 * 1024)));
}

// File types we can name specifically, for a friendlier "no" than
// "unsupported file type". Audience: non-technical law-firm staff.
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "avi", "wmv", "webm", "mkv"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf", "csv", "xlsx", "zip"]);

export function fileExtension(filename) {
  const ext = String(filename ?? "").split(".").pop() ?? "";
  return ext === filename ? "" : ext.toLowerCase();
}

// Returns a plain-English problem string for a candidate file, or null when
// the file is acceptable. `maxBytes` is the cap for the mode in play.
export function fileProblem(filename, size, maxBytes) {
  const ext = fileExtension(filename);
  if (VIDEO_EXTENSIONS.has(ext)) {
    return "That file is a video — export the audio as an MP3 and try again.";
  }
  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return "That file is a document, not a recording — we need the call audio as an MP3, M4A, or WAV.";
  }
  if (!AUDIO_EXTENSIONS.has(ext)) {
    return `We can't read .${ext || "?"} files yet — export the call as an MP3, M4A, or WAV and try again.`;
  }
  if (Number.isFinite(size) && Number.isFinite(maxBytes) && size > maxBytes) {
    return `That file is ${toMb(size)}MB and the limit here is ${toMb(maxBytes)}MB — try re-exporting it as an MP3 (much smaller), or email the file to ali@plaintiffops.com and we'll handle it.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Upload identity. The calls table has no filename column, and adding one
// would need a twinned migration applied to the hosted DB before Monday.
// Instead the external_call_id (TEXT, null for CallRail-manual rows) carries
// "upload:<uuid>:<original filename>": unique per upload (so a re-sent file
// can never silently merge into another call), recognizable (LIKE 'upload:%'),
// and the filename is recoverable for the status list.
// ---------------------------------------------------------------------------

export const UPLOAD_EXTERNAL_PREFIX = "upload:";

export function makeUploadExternalId(filename, uuid = randomUUID()) {
  const name = String(filename ?? "").slice(0, 160);
  return `${UPLOAD_EXTERNAL_PREFIX}${uuid}:${name}`;
}

export function uploadFilenameFrom(externalCallId) {
  if (typeof externalCallId !== "string" || !externalCallId.startsWith(UPLOAD_EXTERNAL_PREFIX)) {
    return null;
  }
  const rest = externalCallId.slice(UPLOAD_EXTERNAL_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep === -1) return null;
  const name = rest.slice(sep + 1);
  return name || null;
}

// ---------------------------------------------------------------------------
// Status the FIRM sees for each uploaded file, derived from the same row the
// pipeline writes (no extra state to drift):
//   done    — a flags row exists: scored, results live on the desk.
//   failed  — scoreUnscored marked it failed_* (task 2: the firm must see this,
//             not just the founder's error log).
//   scoring — transcript captured, score pending.
//   waiting — uploaded, in line to be read (event fired; 15-min sweep is the net).
// ---------------------------------------------------------------------------

function truthy(v) {
  return v === true || v === 1 || v === "1" || v === "t";
}

export function deriveUploadStatus(row) {
  if (truthy(row?.scored)) return "done";
  const status = typeof row?.status === "string" ? row.status : "";
  if (status.startsWith("failed")) return "failed";
  if (truthy(row?.has_transcript)) return "scoring";
  return "waiting";
}

// ---------------------------------------------------------------------------
// The one write path. Consent: the uploader attested the checkbox (the route
// Zod-requires consent_attested === true), so the call is marked 'consented'
// per migration 0021's per-call consent semantics (CIPA invariant §II).
// received_at is the upload time — for a self-served upload it is the best
// truthful timestamp we have (we never guess the original call date).
// ---------------------------------------------------------------------------

export async function registerUploadedCall({
  db,
  firmId,
  recordingUrl,
  filename,
  receivedAt = new Date().toISOString(),
}) {
  if (!db || firmId == null || !recordingUrl) {
    throw new Error("registerUploadedCall requires db, firmId, recordingUrl");
  }
  const { id } = await upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    external_call_id: makeUploadExternalId(filename),
    recording_url: recordingUrl,
    transcript: null,
    caller_phone: null,
    caller_name: null,
    received_at: receivedAt,
  });
  await setCallConsentStatus(db, id, "consented");
  return id;
}
