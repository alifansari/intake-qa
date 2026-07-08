// Studio transcribe -> frozen-scoring bridge (server-only).
//
// REUSES the existing engine exactly like web/ingest/demo.mjs does: it imports the
// ROOT engine modules (lib/transcribe.js = AssemblyAI + PII redaction, and
// lib/score-call.js = the frozen scoring engine) as NATIVE runtime imports and
// runs them on a local audio file. It does NOT rebuild transcription or scoring,
// and it does NOT touch scoring/ prompts. The Studio persists the result to
// Supabase (studio_recordings) itself — this module only produces the data.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../../../engine-root.mjs";

// The same frozen firm config the demo scores against, so the Studio's numbers
// are produced by the identical calibrated engine path.
const FIRM_CONFIG_REL = "config/demo-firm.md";

function importEngine(fileName) {
  const href = pathToFileURL(join(engineRoot(), "lib", fileName)).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// Force the file-tracer to bundle assemblyai (see ingest/demo.mjs for the why).
export async function __forceTraceStudioDeps() {
  return import("assemblyai");
}

// Transcribe then score a local audio file. Returns { transcript, scoring }.
// `onTranscribed(audioPath)` fires the moment the transcript exists so the caller
// can delete the confidential audio immediately.
export async function runStudioPipeline({ audioPath, recordingId, onTranscribed }) {
  const root = engineRoot();
  const firmConfigPath = join(root, FIRM_CONFIG_REL);

  const { transcribeFile } = await importEngine("transcribe.js");
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-studio-"));
  const record = await transcribeFile(audioPath, join(outDir, `${recordingId}.transcript.json`));
  const transcript = record.formatted_transcript;

  // Audio is confidential — let the caller delete it now that we have the text.
  if (onTranscribed) await onTranscribed(audioPath);

  const { scoreCall } = await importEngine("score-call.js");
  const scoring = await scoreCall({
    transcript,
    callId: String(recordingId),
    firmConfigPath,
    outPath: join(outDir, `${recordingId}.score.json`),
    rawOutPath: join(outDir, `${recordingId}.raw.txt`),
  });

  return { transcript, scoring };
}
