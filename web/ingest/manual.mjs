// Manual ingestion fallback: create a `calls` row from either a transcript
// text file or an audio file, plus a firm_id. Mirrors the CallRail path so the
// rest of the pipeline (scoring worker → flag) treats it identically.

import { readFileSync } from "node:fs";
import { upsertCall } from "./store.mjs";

// Provide EITHER transcriptPath (a .txt/.md transcript) OR audioPath (an MP3
// to be transcribed later by the scoring worker). Returns { id, created }.
export async function ingestManual({
  db,
  firmId,
  audioPath = null,
  transcriptPath = null,
  callerPhone = null,
  callerName = null,
  receivedAt = null,
}) {
  if (!firmId) throw new Error("ingestManual requires a firmId");
  if (!audioPath && !transcriptPath) {
    throw new Error("ingestManual requires audioPath or transcriptPath");
  }

  const transcript = transcriptPath
    ? readFileSync(transcriptPath, "utf8")
    : null;

  return upsertCall(db, {
    firm_id: firmId,
    source: "manual",
    external_call_id: null,
    // Store the local audio path so the scoring worker can transcribe it.
    recording_url: audioPath,
    transcript,
    caller_phone: callerPhone,
    caller_name: callerName,
    received_at: receivedAt ?? new Date().toISOString(),
  });
}
