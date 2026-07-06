// Transcribes a local audio file with AssemblyAI (speaker diarization +
// language detection + conservative PII redaction), assigns INTAKE/CALLER roles,
// and writes a diarized transcript JSON. Uses the SDK's built-in polling (no
// webhooks).

import { AssemblyAI } from "assemblyai";
import { readFileSync, writeFileSync } from "node:fs";
import { buildTranscribeParams, redactionEnabled } from "./transcribe-config.js";

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
  const transcript = await client.transcripts.transcribe(
    buildTranscribeParams(audioPath, { redact })
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
