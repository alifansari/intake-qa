// Demo Mode pipeline (public, no-auth) — transcribe -> frozen scoring engine ->
// flag verdict -> fee-at-risk + WATERMARKED draft preview. HARD-ISOLATED from the
// firm pipeline: it writes only to demo_calls, never creates a conversation or a
// message row, and never touches the send chokepoint. Nothing here can send.
//
// The transcriber, scorer, and drafter are injectable so tests run with
// deterministic fakes — zero network, zero cost, zero sends. Production defaults
// call the real AssemblyAI + frozen Claude scoring engine + compliant drafter.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scoreCall } from "../../lib/score-call.js";
import { transcribeFile } from "../../lib/transcribe.js";
import { evaluateFlag, signabilityScore } from "../messaging/flag-logic.mjs";
import { draftFirstMessage } from "../messaging/draft.mjs";
import { getTemplate } from "../messaging/templates.mjs";
import {
  setDemoCallStatus,
  setDemoCallTranscript,
  setDemoCallResult,
  setDemoCallError,
  markDemoAudioDeleted,
  countRecentDemoUploadsByIp,
  countActiveDemoUploadsByIp,
  purgeExpiredDemoCalls,
} from "./store.mjs";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DEFAULT_CONFIG_PATH = fileURLToPath(new URL("../demo-config.json", import.meta.url));

const WATERMARK = "DRAFT PREVIEW — nothing is sent from demo mode.";

// Load the demo fee config (labeled estimates). Cached after first read.
let _cfg = null;
export function loadDemoConfig(path = DEFAULT_CONFIG_PATH) {
  if (_cfg && path === DEFAULT_CONFIG_PATH) return _cfg;
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  cfg.firmConfigAbsPath = join(REPO_ROOT, cfg.firmConfigPath);
  if (path === DEFAULT_CONFIG_PATH) _cfg = cfg;
  return cfg;
}

// --- Rate limiting -----------------------------------------------------------
// 3 uploads / hour / IP, 1 concurrent. Returns { allowed, reason }.
export async function checkDemoRateLimit({
  db,
  ip,
  now = new Date(),
  maxPerHour = 3,
  maxConcurrent = 1,
}) {
  const key = ip || "unknown";
  const sinceIso = new Date(new Date(now).getTime() - 3600 * 1000).toISOString();
  const active = await countActiveDemoUploadsByIp(db, key);
  if (active >= maxConcurrent) {
    return { allowed: false, reason: "concurrent", retryHint: "a demo is still processing" };
  }
  const recent = await countRecentDemoUploadsByIp(db, key, sinceIso);
  if (recent >= maxPerHour) {
    return { allowed: false, reason: "hourly", retryHint: "hourly demo limit reached" };
  }
  return { allowed: true };
}

// --- Pure result assembly ----------------------------------------------------

export function scoreBand(overall) {
  if (overall == null) return "unknown";
  if (overall >= 80) return "strong";
  if (overall >= 60) return "moderate";
  return "weak";
}

// Was there a retainer ask on the call? (honest "did your team ask?" signal)
const NO_ASK_OUTCOMES = new Set(["no_ask", "caller_deferred", "n_a", "na"]);
export function wasThereAnAsk(score) {
  const o = score?.conversion?.retainer_outcome;
  if (!o) return null;
  return !NO_ASK_OUTCOMES.has(o);
}

// Best-effort case-type label from the lenient score object.
export function caseTypeOf(score) {
  return (
    score?.case_type ??
    score?.matter_type ??
    score?.conversion?.case_type ??
    null
  );
}

// Fee at risk from the DEMO estimate table (labeled estimate, not a valuation).
export function estimateFeeAtRisk(score, config) {
  const ct = caseTypeOf(score);
  const table = config?.feeEstimatesByCaseType ?? {};
  const fee = (ct && table[ct]) || config?.defaultFeeEstimate || 0;
  return fee;
}

// Defensively pull up to 3 short transcript quotes that justify signability.
export function pickEvidenceQuotes(score, max = 3) {
  const out = [];
  const push = (v) => {
    if (typeof v === "string" && v.trim() && !out.includes(v.trim())) out.push(v.trim());
  };
  const candidates = [
    score?.signability_evidence,
    score?.evidence,
    score?.alerts?.lost_signable_case?.evidence,
    score?.case_signability_evidence,
    score?.quotes,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) c.forEach((x) => push(typeof x === "string" ? x : x?.quote));
    else push(c);
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

// Assemble the demo result object (pure). `draftPreview` is filled in separately
// (it requires an async drafter) and is always watermarked.
export function buildDemoResult({ score, mapped, config, callerName, firmName }) {
  const overall = score?.scores?.overall ?? null;
  const flagged = mapped.is_leaked_signable === 1 || mapped.is_leaked_signable === true;
  return {
    overallScore: overall == null ? null : Math.round(overall),
    scoreBand: scoreBand(overall),
    signability: score?.case_signability ?? "unknown",
    signabilityScore: signabilityScore(score),
    conversionOutcome: score?.conversion?.retainer_outcome ?? "unknown",
    askMade: wasThereAnAsk(score),
    leaked: flagged,
    reason: mapped.reason,
    evidenceQuotes: pickEvidenceQuotes(score),
    feeAtRisk: flagged ? estimateFeeAtRisk(score, config) : 0,
    feeBasis: config?.disclaimer ?? "Estimates.",
    summary: score?.summary ?? null,
    firmName: firmName ?? null,
    callerName: callerName ?? null,
    draftPreview: null,
    draftWatermark: WATERMARK,
    generatedAt: new Date().toISOString(),
  };
}

// --- Default (production) transcriber ---------------------------------------
// Accepts a local audio path or URL; returns transcript text. Deletes nothing
// itself (the pipeline handles audio cleanup after this returns).
async function defaultTranscriber({ audioPath }) {
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-demo-transcribe-"));
  const record = await transcribeFile(audioPath, join(outDir, "demo.transcript.json"));
  return record.formatted_transcript;
}

async function defaultScorer({ transcript, callId, firmConfigPath }) {
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-demo-score-"));
  return scoreCall({
    transcript,
    callId,
    firmConfigPath,
    outPath: join(outDir, `${callId}.score.json`),
    rawOutPath: join(outDir, `${callId}.raw.txt`),
  });
}

// --- The demo pipeline -------------------------------------------------------
// Drives one demo_calls row through transcribe -> score -> result. Deletes the
// audio immediately after transcription. Records errors on the row (no throw to
// the caller by default so the status endpoint can surface a clean message).
export async function runDemoPipeline({
  db,
  demoCallId,
  audioPath,
  onAudioProcessed, // optional hook to delete the temp file (default: unlink path)
  transcriber = defaultTranscriber,
  scorer = defaultScorer,
  drafter, // undefined => real compliant drafter
  config = loadDemoConfig(),
  now = new Date(),
} = {}) {
  try {
    await setDemoCallStatus(db, demoCallId, "transcribing", new Date(now).toISOString());
    const transcript = await transcriber({ audioPath, callId: String(demoCallId) });

    // Audio is confidential: delete it the moment we have the transcript.
    if (onAudioProcessed) await onAudioProcessed(audioPath);
    await markDemoAudioDeleted(db, demoCallId, new Date(now).toISOString());
    await setDemoCallTranscript(db, demoCallId, transcript, new Date(now).toISOString());

    await setDemoCallStatus(db, demoCallId, "scoring", new Date(now).toISOString());
    const score = await scorer({
      transcript,
      callId: String(demoCallId),
      firmConfigPath: config.firmConfigAbsPath,
    });

    // Demo treats the call as fresh, so the re-engage window always passes; the
    // verdict turns on signability + not-converted (the same gate as production).
    const nowIso = new Date(now).toISOString();
    const mapped = evaluateFlag({ score, receivedAt: nowIso, now: nowIso });

    const result = buildDemoResult({
      score,
      mapped,
      config,
      firmName: "Demo Personal Injury Firm",
    });

    // If leaked, show the exact re-engagement text that WOULD be drafted — but
    // only as a watermarked preview. draftFirstMessage returns text only; it
    // never writes a message row and never sends.
    if (result.leaked) {
      try {
        const template = getTemplate(null);
        result.draftPreview = await draftFirstMessage({
          transcriptSummary: score?.summary,
          template,
          firmName: result.firmName,
          callerName: result.callerName,
          ...(drafter ? { drafter } : {}),
        });
      } catch {
        result.draftPreview = null; // never block the result on a preview failure
      }
    }

    await setDemoCallResult(db, demoCallId, JSON.stringify(result), nowIso);
    return { ok: true, result };
  } catch (err) {
    await setDemoCallError(db, demoCallId, err?.message ?? err, new Date(now).toISOString());
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// --- Retention purge ---------------------------------------------------------
// Null out transcript + result for demo rows older than retentionHours. Safe to
// run opportunistically on each upload and as a scheduled cron. Returns count.
export async function purgeDemo({ db, now = new Date(), retentionHours } = {}) {
  const hours = retentionHours ?? loadDemoConfig().retentionHours ?? 72;
  const beforeIso = new Date(new Date(now).getTime() - hours * 3600 * 1000).toISOString();
  return purgeExpiredDemoCalls(db, beforeIso);
}
