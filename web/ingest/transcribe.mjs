// Transcript-availability helper. If a call already carries a transcript
// (CallRail supplied one, or a manual text upload), use it. Otherwise call the
// EXISTING AssemblyAI engine (root lib/transcribe.js) on the recording URL and
// persist the result. The engine is imported, never duplicated or modified.

import { mkdtempSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../engine-root.mjs";
import { setTranscript } from "./store.mjs";
import { isStorageUrl, downloadStorageAudio, removeStorageAudio } from "./storage-audio.mjs";

// The root engine (lib/transcribe.js) lives outside web/ locally and is vendored
// into web/.engine for the serverless bundle. Load it as a NATIVE runtime import
// (webpackIgnore) exactly like ingest/demo.mjs — otherwise the Next bundler tries
// (and fails) to resolve the repo-root path at build time. engineRoot() resolves
// whichever copy is present. See ../engine-root.mjs.
function importEngine(fileName) {
  const href = pathToFileURL(join(engineRoot(), "lib", fileName)).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// Returns the transcript text for a call, transcribing on demand if needed.
// `call` is a row from the calls table.
export async function ensureTranscript({ db, call }) {
  if (call.transcript && call.transcript.trim()) {
    return call.transcript;
  }
  if (!call.recording_url) {
    throw new Error(
      `Call ${call.id} has no transcript and no recording_url to transcribe`
    );
  }

  // Desk uploads store a stable `supabase-storage://bucket/path` reference
  // (a signed URL would expire before a delayed sweep/retry). Download the
  // object to a temp file for the engine, and once the transcript exists,
  // delete BOTH the temp file and the storage object — confidential audio
  // never outlives its transcription (same posture as demo/studio).
  let source = call.recording_url;
  let downloadedTemp = null;
  if (isStorageUrl(call.recording_url)) {
    downloadedTemp = await downloadStorageAudio(call.recording_url);
    source = downloadedTemp;
  }

  try {
    // transcribeFile writes a transcript record to disk and returns it; we only
    // need the formatted transcript text. AssemblyAI accepts a URL or local path.
    const outDir = mkdtempSync(join(tmpdir(), "intakeqa-transcribe-"));
    const outPath = join(outDir, `${call.id}.transcript.json`);
    const { transcribeFile } = await importEngine("transcribe.js");
    const record = await transcribeFile(source, outPath);
    const text = record.formatted_transcript;

    await setTranscript(db, call.id, text);
    if (downloadedTemp) await removeStorageAudio(call.recording_url).catch(() => {});
    return text;
  } finally {
    if (downloadedTemp) await unlink(downloadedTemp).catch(() => {});
  }
}
