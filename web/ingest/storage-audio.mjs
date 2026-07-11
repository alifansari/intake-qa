// Supabase Storage audio references for the pipeline (plain .mjs — usable by
// ingest code that can't import server-only TS from src/lib).
//
// Desk uploads store `supabase-storage://<bucket>/<path>` as the call's
// recording_url instead of a signed download URL: a signed URL expires (the
// 15-min sweep or an Inngest retry may pick the call up much later), while
// this stable reference lets ensureTranscript download the object with the
// service-role key at transcription time — and DELETE the confidential audio
// object the moment the transcript exists (same posture as the demo/studio
// pipelines: audio never outlives its transcription).

import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const STORAGE_URL_SCHEME = "supabase-storage://";

export function storageUrl(bucket, path) {
  return `${STORAGE_URL_SCHEME}${bucket}/${path}`;
}

export function parseStorageUrl(url) {
  if (typeof url !== "string" || !url.startsWith(STORAGE_URL_SCHEME)) return null;
  const rest = url.slice(STORAGE_URL_SCHEME.length);
  const slash = rest.indexOf("/");
  if (slash <= 0 || slash === rest.length - 1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

export function isStorageUrl(url) {
  return parseStorageUrl(url) !== null;
}

// Service-role client, created lazily so this module never forces the SDK (or
// the secrets) on code paths that don't touch storage.
async function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase Storage is not configured (missing URL or service-role key)");
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Download the referenced object to a local temp file the transcribe engine
// can read. Caller is responsible for deleting the temp file.
export async function downloadStorageAudio(url) {
  const ref = parseStorageUrl(url);
  if (!ref) throw new Error(`not a storage url: ${url}`);
  const client = await serviceClient();
  const { data, error } = await client.storage.from(ref.bucket).download(ref.path);
  if (error || !data) throw new Error(error?.message ?? "could not download stored audio");
  const ext = ref.path.split(".").pop() || "bin";
  const local = join(tmpdir(), `intakeqa-upload-${randomUUID()}.${ext}`);
  await writeFile(local, Buffer.from(await data.arrayBuffer()));
  return local;
}

// Best-effort delete of the stored object (confidential audio).
export async function removeStorageAudio(url) {
  const ref = parseStorageUrl(url);
  if (!ref) return;
  const client = await serviceClient();
  await client.storage.from(ref.bucket).remove([ref.path]);
}
