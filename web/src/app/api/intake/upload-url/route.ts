// POST /api/intake/upload-url — mint a short-lived signed upload URL for a
// visitor photo (crash/hazard/injury) into the PRIVATE intake-uploads bucket,
// and record the attachment on the canonical record. Uses the service-role
// Storage client (same pattern as demo-audio); when Storage or the DB store
// is unconfigured the route answers {configured:false} and the chat simply
// skips uploads — graceful degradation, never an error to the visitor.
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { isIntakeStoreConfigured, recordAttachment } from "@/lib/intake/store";

export const runtime = "nodejs";

export const INTAKE_BUCKET = "intake-uploads";
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB per photo
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "heic", "webp", "gif", "pdf"]);

const Body = z.object({
  lead_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  content_type: z.string().max(100).optional(),
  size_bytes: z.number().int().positive().max(MAX_SIZE_BYTES).optional(),
});

function storageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req: Request) {
  if (!storageConfigured() || !isIntakeStoreConfigured()) {
    return Response.json({ configured: false });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const ext = body.filename.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return Response.json({ error: "unsupported file type" }, { status: 400 });
  }

  const path = `intake/${body.lead_id}/${crypto.randomUUID()}.${ext}`;
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await client.storage
      .from(INTAKE_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "no signed url");

    await recordAttachment(body.lead_id, {
      storage_path: path,
      original_filename: body.filename,
      content_type: body.content_type,
      size_bytes: body.size_bytes,
    });

    return Response.json({
      configured: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path,
    });
  } catch {
    return Response.json({ configured: false });
  }
}
