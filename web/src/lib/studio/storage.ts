import "server-only";

// Server-only Supabase Storage helper for the founder-only Spot Check Studio.
// Mirrors src/lib/supabase/storage.ts (the demo pattern): the browser uploads the
// firm's consented audio DIRECTLY to a PRIVATE bucket via a short-lived signed
// URL (bypassing Vercel's ~4.5MB body limit), and the server later downloads the
// object to a temp file for the existing transcribe pipeline. Holds the
// SERVICE-ROLE key — must NEVER be imported by a client component (guarded by
// "server-only"). Secrets come only from env.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const STUDIO_BUCKET = "studio-audio";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isStudioStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

// Object path: studio/<recordingId>.<ext>. The upload + download sides agree here.
export function studioObjectPath(id: string, ext: string): string {
  return `studio/${id}.${ext}`;
}

let _client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (!isStudioStorageConfigured()) {
    throw new Error("Studio Storage is not configured (missing URL or service-role key)");
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Short-lived signed URL the browser uploads the file to (bypasses the Vercel
// body limit). Returns the token + path the client needs.
export async function createSignedStudioUpload(
  path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
  const { data, error } = await serviceClient()
    .storage.from(STUDIO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "could not create signed upload URL");
  return { signedUrl: data.signedUrl, token: data.token, path };
}

// Download the uploaded object to a temp file the pipeline transcribes. Returns
// the local path. The caller deletes the temp file once transcription is done.
export async function downloadStudioAudio(path: string): Promise<string> {
  const { data, error } = await serviceClient().storage.from(STUDIO_BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "could not download studio audio");
  const buf = Buffer.from(await data.arrayBuffer());
  const ext = path.split(".").pop() || "bin";
  const local = join(
    tmpdir(),
    `intakeqa-studio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
  );
  await writeFile(local, buf);
  return local;
}

// Best-effort delete of the stored audio object (audio is confidential).
export async function removeStudioAudio(path: string): Promise<void> {
  await serviceClient().storage.from(STUDIO_BUCKET).remove([path]);
}
