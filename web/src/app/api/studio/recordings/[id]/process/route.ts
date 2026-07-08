// POST /api/studio/recordings/[id]/process — founder-only. Runs the EXISTING
// pipeline (transcribe -> frozen scoring) on the uploaded audio, persists the
// transcript + scoring to studio_recordings, and deletes the confidential audio
// the moment it is transcribed. Runs synchronously (awaited) so the serverless
// function stays alive through transcription/scoring; the recording page polls.
import { unlink } from "node:fs/promises";
import { requireFounderRoute } from "@/lib/studio/guard";
import { getRecording, setRecordingTranscriptAndScoring } from "@/lib/studio/data";
import {
  isStudioStorageConfigured,
  downloadStudioAudio,
  removeStudioAudio,
} from "@/lib/studio/storage";
// The engine bridge is a native runtime .mjs import (webpackIgnore'd engine deps);
// import it lazily inside the handler so it stays out of the static graph.

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  if (!isStudioStorageConfigured()) {
    return Response.json({ error: "studio storage not configured" }, { status: 503 });
  }

  const { id } = await params;
  const recording = await getRecording(gate.supabase, id);
  if (!recording) return Response.json({ error: "not found" }, { status: 404 });

  // Idempotent: if we already have a transcript, don't re-run (guards abuse/cost).
  if (recording.transcript && recording.transcript.trim()) {
    return Response.json({ ok: true, status: "done" });
  }

  try {
    const audioPath = await downloadStudioAudio(recording.storage_path);
    const { runStudioPipeline } = await import("@/lib/studio/pipeline.mjs");
    const { transcript, scoring } = await runStudioPipeline({
      audioPath,
      recordingId: recording.id,
      // Delete the confidential audio (temp file + storage object) as soon as
      // transcription completes.
      onTranscribed: async (p: string) => {
        await unlink(p).catch(() => {});
        await removeStudioAudio(recording.storage_path).catch(() => {});
      },
    });

    await setRecordingTranscriptAndScoring(gate.supabase, recording.id, transcript, scoring);
    return Response.json({ ok: true, status: "done" });
  } catch {
    // Generic client message; the founder can retry from the recording page.
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}
