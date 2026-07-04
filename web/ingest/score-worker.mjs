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
import { fileURLToPath } from "node:url";
import { scoreCall } from "../../lib/score-call.js";
import { ensureTranscript } from "./transcribe.mjs";
import {
  getUnscoredCalls,
  insertFlag,
  getFirm,
  createConversation,
  createDraftMessage,
} from "./db.mjs";
import { evaluateFlag } from "../messaging/flag-logic.mjs";
import { draftFirstMessage } from "../messaging/draft.mjs";
import { getTemplate } from "../messaging/templates.mjs";

// Firm config used to assemble the scoring prompt (root config/test-firm.md).
const DEFAULT_FIRM_CONFIG = fileURLToPath(
  new URL("../../config/test-firm.md", import.meta.url)
);

// Consent basis for pilot re-engagement: the caller's own inbound inquiry
// (established business relationship). REQUIRED by the conversations schema.
const CONSENT_BASIS = "inbound_call_inquiry_EBR";

// Default (production) scorer: the real calibrated engine. Writes its JSON to a
// temp file per call (scoreCall requires an outPath) and returns the parsed obj.
async function defaultScorer({ transcript, callId, firmConfigPath }) {
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-score-"));
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
  const calls = getUnscoredCalls(db, firmId);
  const results = [];

  for (const call of calls) {
    const firm = getFirm(db, call.firm_id);
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

    const flagId = insertFlag(db, {
      call_id: call.id,
      firm_id: call.firm_id,
      qualification_score: mapped.qualification_score,
      is_leaked_signable: mapped.is_leaked_signable,
      reason: mapped.reason,
    });

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

      conversationId = createConversation(db, {
        flag_id: flagId,
        firm_id: call.firm_id,
        caller_phone: call.caller_phone,
        status: "pending_approval",
        consent_basis: CONSENT_BASIS,
      });
      messageId = createDraftMessage(db, {
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
  }
  return results;
}
