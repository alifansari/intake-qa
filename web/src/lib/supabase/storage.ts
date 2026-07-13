import "server-only";

// Server-only Supabase Storage helper for public Demo Mode uploads.
//
// The hosted /demo can’t stream audio through the Vercel function (Vercel caps
// request bodies at ~4.5MB). Instead the browser uploads straight to a private
// Storage bucket via a short-lived signed upload URL, and the server later
// downloads the object to a temp file for the pipeline to transcribe. This
// module holds the SERVICE-ROLE key — it must NEVER be imported by a client
// component (guarded by "server-only"). Secrets come only from env.
//
// When the service-role key / Supabase URL are absent (e.g. local dev on
// SQLite), isDemoStorageConfigured() is false and the demo falls back to the
// direct-file-upload route, which works on a long-lived Node server.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEMO_BUCKET = "demo-audio";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isDemoStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

// Storage object path for a demo call: demo/<id>.<ext>. `ext` is validated by
// the caller; kept here so the upload + download sides agree on the layout.
export function demoObjectPath(id: string | number, ext: string): string {
  return `demo/${id}.${ext}`;
}

let _client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (!isDemoStorageConfigured()) {
    throw new Error("Supabase Storage is not configured (missing URL or service-role key)");
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Create a short-lived signed URL the browser uploads the file to (bypasses the
// Vercel body limit). Returns the token + path the client needs.
export async function createSignedDemoUpload(
  path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
  const { data, error } = await serviceClient()
    .storage.from(DEMO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "could not create signed upload URL");
  return { signedUrl: data.signedUrl, token: data.token, path };
}

// Download the uploaded object to a temp file the pipeline transcribes. Returns
// the local path. The caller deletes both the temp file and the storage object
// (via removeDemoAudio) once transcription is done — audio is confidential.
export async function downloadDemoAudio(path: string): Promise<string> {
  const { data, error } = await serviceClient().storage.from(DEMO_BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "could not download demo audio");
  const buf = Buffer.from(await data.arrayBuffer());
  const ext = path.split(".").pop() || "bin";
  const local = join(tmpdir(), `intakeqa-demo-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  await writeFile(local, buf);
  return local;
}

// Best-effort delete of the stored audio object.
export async function removeDemoAudio(path: string): Promise<void> {
  await serviceClient().storage.from(DEMO_BUCKET).remove([path]);
}
