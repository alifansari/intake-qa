// Inbound SMS handling (caller replies). Two jobs:
//   * OPT-OUT — if the reply is a STOP-family keyword, immediately flag the
//     conversation opted_out and log it. NOTHING further is ever sent to it.
//   * REPLY   — otherwise, draft a compliant follow-up (reusing the same guarded
//     Claude drafter as first messages) and drop it into the approval queue as a
//     'drafted' message. Still human-approved before it can send — the inbound
//     path NEVER auto-sends.
//
// The drafter is injectable (default = real Claude) so tests use a deterministic
// fake, mirroring the score-worker pattern. Nothing here transmits.

import {
  getFirm,
  findConversationByPhone,
  getConversationMessages,
  getCallerNameForConversation,
  addInboundMessage,
  setConversationOptedOut,
  createDraftMessage,
} from "../ingest/store.mjs";
import { detectOptOut } from "./compliance.mjs";
import { draftReply } from "./draft.mjs";
import { getTemplate } from "./templates.mjs";
import { createHmac, timingSafeEqual } from "node:crypto";

// Verify Twilio's X-Twilio-Signature: HMAC-SHA1, base64, over the full request
// URL with the POST params appended as sorted key+value pairs, keyed by the
// account auth token. Compared in constant time.
export function verifyTwilioSignature({ url, params, signatureHeader, authToken }) {
  if (!authToken) throw new Error("TWILIO_AUTH_TOKEN is not set");
  if (!signatureHeader) return false;

  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + params[key];
  }
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signatureHeader), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Handle one inbound message from `from` with text `body` for `firmId`.
// Returns a small result object describing what happened.
export async function ingestInbound({
  db,
  firmId,
  from,
  body,
  drafter = undefined, // injectable; undefined => draftReply uses the real Claude default
  templateId = null,
  now = new Date(),
}) {
  const conversation = await findConversationByPhone(db, firmId, from);
  if (!conversation) {
    // No active re-engagement for this number — nothing to attach the reply to.
    return { handled: false, reason: "no_conversation" };
  }

  // Always log the inbound message first; its created_at is the audit timestamp.
  const inboundId = await addInboundMessage(db, {
    conversation_id: conversation.id,
    body,
  });

  // OPT-OUT: honor immediately, log, send nothing further.
  if (detectOptOut(body)) {
    await setConversationOptedOut(db, conversation.id, now.toISOString());
    console.log(
      `Opt-out honored: conversation #${conversation.id} (${from}) at ${now.toISOString()}`
    );
    return {
      handled: true,
      optedOut: true,
      conversationId: conversation.id,
      inboundMessageId: inboundId,
    };
  }

  // Already opted out (defensive): never draft a reply.
  if (conversation.status === "opted_out") {
    return {
      handled: true,
      optedOut: true,
      conversationId: conversation.id,
      inboundMessageId: inboundId,
    };
  }

  // REPLY: draft a compliant follow-up into the approval queue (human-approved).
  const firm = await getFirm(db, conversation.firm_id);
  const callerName = await getCallerNameForConversation(db, conversation.id);
  const history = (await getConversationMessages(db, conversation.id))
    .filter((m) => m.id !== inboundId && m.body)
    .map((m) => ({ direction: m.direction, body: m.body }));

  const reply = await draftReply({
    history,
    incoming: body,
    template: getTemplate(templateId),
    firmName: firm?.name,
    callerName,
    ...(drafter ? { drafter } : {}),
  });

  const messageId = await createDraftMessage(db, {
    conversation_id: conversation.id,
    body: reply,
  });

  return {
    handled: true,
    drafted: true,
    conversationId: conversation.id,
    inboundMessageId: inboundId,
    messageId,
  };
}
