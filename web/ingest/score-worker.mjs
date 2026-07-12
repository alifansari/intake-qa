// Scoring worker: turn un-scored `calls` rows into `flags` rows by running the
// EXISTING calibrated Claude scoring engine (root lib/score-call.js). The
// scoring prompt is NOT touched — we import scoreCall and feed it a transcript.
// For each newly flagged leaked-signable lead it also DRAFTS a compliant first
// SMS (via lib messaging/draft.mjs) and stores it as a pending-approval
// conversation with a `drafted` message. NOTHING sends here.
//
// The scorer and the drafter are injectable so tests can supply deterministic
// fakes (the synthetic seed transcripts can't be scored by real Claude, and live
// API calls cost money / need a key). Production uses the real defaults.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../engine-root.mjs";
import { ensureTranscript } from "./transcribe.mjs";
import {
  getUnscoredCalls,
  insertFlag,
  getFirm,
  createConversation,
  createDraftMessage,
  setCallStatus,
  logError,
} from "./store.mjs";
import { evaluateFlag } from "../messaging/flag-logic.mjs";
import { draftFirstMessage } from "../messaging/draft.mjs";
import { getTemplate } from "../messaging/templates.mjs";

// The root engine (lib/score-call.js) lives outside web/ locally and is vendored
// into web/.engine for the serverless bundle. Load it as a NATIVE runtime import
// (webpackIgnore) exactly like ingest/demo.mjs, so the bundler never tries to
// resolve the repo-root path at build time. See ../engine-root.mjs.
function importEngine(fileName) {
  const href = pathToFileURL(join(engineRoot(), "lib", fileName)).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// Firm config used to assemble the scoring prompt (config/test-firm.md, resolved
// from the same engine root as the engine .js files).
const DEFAULT_FIRM_CONFIG = join(engineRoot(), "config", "test-firm.md");

// Consent basis for pilot re-engagement: the caller's own inbound inquiry
// (established business relationship). REQUIRED by the conversations schema.
const CONSENT_BASIS = "inbound_call_inquiry_EBR";

// Default (production) scorer: the real calibrated engine. Writes its JSON to a
// temp file per call (scoreCall requires an outPath) and returns the parsed obj.
async function defaultScorer({ transcript, callId, firmConfigPath }) {
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-score-"));
  const { scoreCall } = await importEngine("score-call.js");
  return scoreCall({
    transcript,
    callId,
    firmConfigPath,
    outPath: join(outDir, `${callId}.score.json`),
    rawOutPath: join(outDir, `${callId}.raw.txt`),
  });
}

// Score every un-scored call for a firm (or all firms) and create a flag row
// for each. Newly flagged leaked-signable leads also get a pending-approval
// conversation + a `drafted` first message. Returns created flag summaries.
export async function scoreUnscored({
  db,
  firmConfigPath = DEFAULT_FIRM_CONFIG,
  scorer = defaultScorer,
  drafter, // injectable; undefined => draftFirstMessage uses the real Claude default
  firmId = null,
  thresholdScore = 60,
  templateId = null, // null => first template in config/message-templates.md
  now = new Date(),
} = {}) {
  const calls = await getUnscoredCalls(db, firmId);
  const results = [];

  for (const call of calls) {
    // P1(a): one poison call (bad transcript, scorer throw, draft failure) must
    // never abort the whole batch. Isolate each iteration: on failure, mark the
    // call failed with a reason, log it, and continue with the next call.
    try {
    const firm = await getFirm(db, call.firm_id);
    const windowHours = firm?.reengage_window_hours ?? 72;

    const transcript = await ensureTranscript({ db, call });
    const score = await scorer({
      transcript,
      callId: String(call.id),
      firmConfigPath,
    });

    const mapped = evaluateFlag({
      score,
      thresholdScore,
      windowHours,
      receivedAt: call.received_at,
      now,
    });

    const flagId = await insertFlag(db, {
      call_id: call.id,
      firm_id: call.firm_id,
      qualification_score: mapped.qualification_score,
      is_leaked_signable: mapped.is_leaked_signable,
      reason: mapped.reason,
      case_type: mapped.case_type,
    });

    // Mark the call terminal-succeeded. The whole schema keys "done" off
    // status = 'analyzed' (v_call_reconciliation's `processed` bucket, the
    // desk's "N calls processing" count, getUnprocessedCalls, monthly scored
    // counts) — but the pipeline previously only ever wrote 'failed_scoring',
    // never 'analyzed', so a clean-scored call (flag row, no leak) stayed
    // status=NULL and read as "still processing" forever, and the desk's
    // all-clear panel could never render. Setting it here closes that gap.
    // (Session 9 red-team.)
    await setCallStatus(db, call.id, "analyzed").catch(() => {});

    let conversationId = null;
    let messageId = null;

    // Leaked-signable => draft a first re-engagement SMS (drafted only).
    if (mapped.is_leaked_signable) {
      const template = getTemplate(templateId);
      const draft = await draftFirstMessage({
        transcriptSummary: score?.summary,
        template,
        firmName: firm?.name,
        callerName: call.caller_name,
        ...(drafter ? { drafter } : {}),
      });

      conversationId = await createConversation(db, {
        flag_id: flagId,
        firm_id: call.firm_id,
        caller_phone: call.caller_phone,
        status: "pending_approval",
        consent_basis: CONSENT_BASIS,
      });
      messageId = await createDraftMessage(db, {
        conversation_id: conversationId,
        body: draft,
      });
    }

    results.push({
      flag_id: flagId,
      call_id: call.id,
      caller_name: call.caller_name,
      qualification_score: mapped.qualification_score,
      signability_score: mapped.signability_score,
      is_leaked_signable: mapped.is_leaked_signable,
      reason: mapped.reason,
      conversation_id: conversationId,
      message_id: messageId,
    });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await setCallStatus(db, call.id, "failed_scoring", reason).catch(() => {});
      await logError(db, {
        source: "score-worker.scoreUnscored",
        message: `call ${call.id} failed to score: ${reason}`,
        firm_id: call.firm_id ?? null,
      }).catch(() => {});
      results.push({ call_id: call.id, error: reason, failed: true });
      // continue with the next call — never abort the batch.
    }
  }
  return results;
}
