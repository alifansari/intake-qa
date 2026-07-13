// POST /api/studio/recordings/upload-url — founder-only. Step 1 of the studio
// upload: the founder MUST attest all-party consent; we then create the recording
// row (which stores the immutable consent attestation and is refused by the DB
// unless consent_attested = true), and hand back a short-lived signed URL the
// browser uploads the firm’s audio DIRECTLY to the PRIVATE studio-audio bucket
// (bypassing Vercel’s ~4.5MB body limit). Nothing here transcribes or scores.
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { createRecording } from "@/lib/studio/data";
import { CONSENT_ATTESTATION_TEXT, CONSENT_TEXT_VERSION } from "@/lib/studio/consent";
import {
  isStudioStorageConfigured,
  createSignedStudioUpload,
  studioObjectPath,
  STUDIO_BUCKET,
} from "@/lib/studio/storage";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 200 * 1024 * 1024; // firm-supplied files can be full-length calls
const ALLOWED_EXT = new Set(["mp3", "m4a", "wav"]);

const Body = z.object({
  firm_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  // NON-optional consent attestation — must be literally true AND match the
  // current attestation text/version the client rendered.
  consent_attested: z.literal(true),
  consent_text: z.string(),
  consent_text_version: z.string(),
});

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  if (!isStudioStorageConfigured()) {
    return Response.json({ error: "studio storage not configured" }, { status: 503 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return Response.json(
      { error: "consent attestation is required, plus { firm_id, filename, size }" },
      { status: 400 },
    );
  }

  // Defense in depth: the attested text/version must match what this server
  // considers current. A stale or tampered attestation is refused.
  if (
    parsed.consent_text !== CONSENT_ATTESTATION_TEXT ||
    parsed.consent_text_version !== CONSENT_TEXT_VERSION
  ) {
    return Response.json({ error: "consent attestation text is out of date" }, { status: 409 });
  }

  const ext = (parsed.filename.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return Response.json(
      { error: "unsupported file type — upload an MP3, M4A, or WAV" },
      { status: 415 },
    );
  }
  if (parsed.size > MAX_BYTES) {
    return Response.json({ error: "file too large (200MB max)" }, { status: 413 });
  }

  try {
    // Create the recording row FIRST (DB refuses it without consent_attested=true),
    // then derive the storage path from its id so upload + later download agree.
    const recording = await createRecording(gate.supabase, {
      firm_id: parsed.firm_id,
      storage_path: "pending", // set below once we know the id
      original_filename: parsed.filename,
      consent_attested: true,
      consent_attested_by: gate.user.id,
      consent_text_version: CONSENT_TEXT_VERSION,
    });

    const path = studioObjectPath(recording.id, ext);
    // Persist the real path on the row (RLS-scoped update via the founder client).
    const supabase = await getSupabaseServer();
    if (supabase) {
      await supabase.from("studio_recordings").update({ storage_path: path }).eq("id", recording.id);
    }

    const { signedUrl, token } = await createSignedStudioUpload(path);
    return Response.json(
      { recordingId: recording.id, bucket: STUDIO_BUCKET, path, signedUrl, token },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "could not start upload" }, { status: 500 });
  }
}
