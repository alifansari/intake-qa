// Studio transcribe -> scoring bridge (server-only).
//
// SHADOW MODE (2026-07-12): v1 (frozen engine) remains the FIRM-VISIBLE product
// exactly as before. Engine V2 (scoring-v2/, triage) runs DARK on the same
// transcript and its verdict is attached to the stored scoring object under the
// internal key `_v2_shadow` (never rendered by the UI; ScoredCall is a
// passthrough schema so the extra key is tolerated). This accrues the v1-vs-v2
// disagreement corpus needed to eventually measure v2's false-alarm rate and
// earn a firm-visible flip — with ZERO firm-visible change today.
//
// HARD RAIL: the v2 shadow pass is wrapped so any failure NEVER affects the
// firm-visible v1 result. Shadow scoring must not be able to break production.
//
// COMPLIANCE: v1 stays the firm-visible scorer, so the published false-alarm
// rate / calibrated-rubric claims remain accurate. v2 emits tiers + a
// disposition, never a dollar and never a computed date; the adapter preserves
// those rails (no revenue_at_risk.amount_usd). _v2_shadow is internal derived
// data under the same confidentiality/retention as the v1 scoring (§VI).

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../../../engine-root.mjs";
import { v2VerdictToScoredCall } from "./v2-adapter.mjs";

// The same frozen firm config the demo scores against, so the Studio's numbers
// are produced by the identical calibrated v1 engine path (firm-visible).
const FIRM_CONFIG_REL = "config/demo-firm.md";

function importEngine(fileName) {
  const href = pathToFileURL(join(engineRoot(), "lib", fileName)).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// Import the v2 harness from the vendored engine root (engineRoot()/scoring-v2).
function importV2() {
  const href = pathToFileURL(join(engineRoot(), "scoring-v2", "score-v2.js")).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// SHADOW PASS — run Engine V2 dark on the same transcript and return the
// adapted verdict (which carries the full v2 verdict under `.v2`). Wrapped so
// it can NEVER throw into the firm-visible path: any failure returns a small
// error stub instead. Not awaited on the critical path's success.
async function runV2Shadow({ transcript, recordingId, root }) {
  try {
    const { scoreV2 } = await importV2();
    const verdict = await scoreV2({
      transcript,
      callId: String(recordingId),
      pkgRoot: join(root, "scoring-v2"),
    });
    return v2VerdictToScoredCall(verdict);
  } catch (err) {
    return { shadow_error: String((err && err.message) || err), engine: "scoring-v2" };
  }
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

  // FIRM-VISIBLE: v1 frozen engine, exactly as before the cutover work.
  const { scoreCall } = await importEngine("score-call.js");
  const scoring = await scoreCall({
    transcript,
    callId: String(recordingId),
    firmConfigPath,
    outPath: join(outDir, `${recordingId}.score.json`),
    rawOutPath: join(outDir, `${recordingId}.raw.txt`),
  });

  // SHADOW: Engine V2 runs dark and rides along under an internal key. It is
  // failure-isolated (runV2Shadow never throws) so it cannot affect the
  // firm-visible v1 result above. Not rendered by any UI surface.
  scoring._v2_shadow = await runV2Shadow({ transcript, recordingId, root });

  return { transcript, scoring };
}
