// Transcribes a local audio file with AssemblyAI (speaker diarization +
// language detection + conservative PII redaction), assigns INTAKE/CALLER roles,
// and writes a diarized transcript JSON. Uses the SDK's built-in polling (no
// webhooks).

import { AssemblyAI } from "assemblyai";
import { readFileSync, writeFileSync } from "node:fs";
import {
  buildTranscribeParams,
  redactionEnabled,
  pollingIntervalMs,
  webhookConfig,
} from "./transcribe-config.js";

// mm:ss from a millisecond offset.
function mmss(ms) {
  const total = Math.floor((ms || 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Reads firm_name out of a firm-config file so the greeting heuristic can
// look for the firm's own name in the opening line.
function firmNameFromConfig(configPath) {
  try {
    const text = readFileSync(configPath, "utf8");
    const m = text.match(/firm_name:\s*(.+)/i);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

// Decides which diarized speaker is the intake rep.
// Heuristic: the speaker whose FIRST utterance sounds like a firm greeting
// (firm name, "law", "this is", "how can I help", "thank you for calling")
// is INTAKE. If that is ambiguous, the speaker who talks first is INTAKE and
// role_confidence is "low".
function assignRoles(utterances, firmName) {
  const firstBySpeaker = new Map();
  for (const u of utterances) {
    if (!firstBySpeaker.has(u.speaker)) firstBySpeaker.set(u.speaker, u.text || "");
  }
  const speakers = [...firstBySpeaker.keys()];
  const firstSpeaker = utterances.length ? utterances[0].speaker : speakers[0];

  const greeting = new RegExp(
    [
      "\\blaw\\b",
      "this is",
      "how can i help",
      "thank you for calling",
      "\\blegal\\b",
      "\\binjury\\b",
      firmName ? firmName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : null,
    ]
      .filter(Boolean)
      .join("|"),
    "i"
  );

  const matches = speakers.filter((sp) => greeting.test(firstBySpeaker.get(sp)));

  let intakeSpeaker;
  let confidence;
  if (matches.length === 1) {
    intakeSpeaker = matches[0];
    confidence = "high";
  } else {
    intakeSpeaker = firstSpeaker;
    confidence = "low"; // both or neither matched the greeting pattern
  }

  const roleMap = {};
  let callerCount = 0;
  for (const sp of speakers) {
    if (sp === intakeSpeaker) roleMap[sp] = "INTAKE";
    else roleMap[sp] = callerCount++ === 0 ? "CALLER" : `SPEAKER_${sp}`;
  }
  if (speakers.length > 2) confidence = "low";
  return { roleMap, confidence };
}

// Public: transcribe an audio file. Returns the transcript record and also
// writes it to `outPath`.
export async function transcribeFile(audioPath, outPath, configPath) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is missing from .env");

  const client = new AssemblyAI({ apiKey });
  const firmName = firmNameFromConfig(configPath);

  const redact = redactionEnabled();
  // BLOCKING poll path (today). pollingInterval throttles the SDK's status
  // polling so a high-volume sweep with many transcriptions in flight doesn't
  // hammer the API. The non-blocking WEBHOOK alternative is submitForWebhook()
  // below — see the TODO in transcribe-config.js.
  const transcript = await client.transcripts.transcribe(
    buildTranscribeParams(audioPath, { redact }),
    { pollingInterval: pollingIntervalMs() }
  );

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  const utterances = (transcript.utterances || []).map((u) => ({
    speaker: u.speaker,
    text: u.text,
    start: u.start,
    end: u.end,
  }));

  if (utterances.length === 0) {
    throw new Error(
      "No diarized utterances returned. The audio may be too short, silent, or single-speaker."
    );
  }

  const { roleMap, confidence } = assignRoles(utterances, firmName);

  const formatted = utterances
    .map((u) => `[${mmss(u.start)}] ${roleMap[u.speaker] || u.speaker}: ${u.text}`)
    .join("\n");

  const record = {
    audio_file: audioPath,
    language_code: transcript.language_code || "en",
    speaker_role_map: roleMap,
    role_confidence: confidence,
    duration_sec: Math.round((transcript.audio_duration || 0)),
    pii_redacted: redact, // compliance trail: was server-side PII redaction applied
    utterances,
    formatted_transcript: formatted,
  };

  writeFileSync(outPath, JSON.stringify(record, null, 2));
  return record;
}

// ---------------------------------------------------------------------------
// SCALE PATH (scaffold — NOT yet wired into the pipeline).
//
// Submit a transcription job with a WEBHOOK instead of blocking-polling. Returns
// the queued transcript id immediately; AssemblyAI will POST to
// webhookConfig().url when the transcript is ready. The receiving route
// (web/src/app/api/transcribe/webhook/route.ts) is a stub that must:
//   1. map the incoming transcript_id -> the call it belongs to,
//   2. fetch the finished transcript (client.transcripts.get(id)),
//   3. run the same diarization/role-assignment as transcribeFile,
//   4. persist the transcript and re-emit `intakeqa/call.received` so scoring
//      resumes on the (now cheap, no-transcribe) path.
//
// TODO(webhook-transcription): build that id->call map + two-phase worker, flip
// ASSEMBLYAI_WEBHOOK_ENABLED=true, and call this from ingest/transcribe.mjs's
// ensureTranscript in place of the blocking transcribeFile.
// ---------------------------------------------------------------------------
export async function submitForWebhook(audioPath, env = process.env) {
  const wh = webhookConfig(env);
  if (!wh.enabled || !wh.url) {
    throw new Error(
      "submitForWebhook requires ASSEMBLYAI_WEBHOOK_ENABLED=true and ASSEMBLYAI_WEBHOOK_URL"
    );
  }
  const apiKey = env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is missing from .env");

  const client = new AssemblyAI({ apiKey });
  const redact = redactionEnabled(env);
  const queued = await client.transcripts.submit(
    buildTranscribeParams(audioPath, { redact, webhook: wh })
  );
  return queued.id;
}
