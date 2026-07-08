// GET /api/studio/recordings/[id] — founder-only. Returns processing status +
// (once done) the transcript and scoring. The recording page polls this after an
// upload kicks off /process.
import { requireFounderRoute } from "@/lib/studio/guard";
import { getRecording } from "@/lib/studio/data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const { id } = await params;
  const rec = await getRecording(gate.supabase, id);
  if (!rec) return Response.json({ error: "not found" }, { status: 404 });

  const done = Boolean(rec.transcript && rec.transcript.trim());
  return Response.json({
    id: rec.id,
    firm_id: rec.firm_id,
    original_filename: rec.original_filename,
    status: done ? "done" : "processing",
    transcript: rec.transcript,
    scoring: rec.scoring,
    transcribed_at: rec.transcribed_at,
  });
}
