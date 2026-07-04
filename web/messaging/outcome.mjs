// Outcome + recovery recording — the end of the recovery loop. When a handoff
// resolves, we write the business result into the EXISTING outcomes/recoveries
// tables so the weekly reconciliation can tally recovered fees.
//
//   * signed          -> outcome + a recovery valued at the firm's avg_case_fee,
//                        conversation closed.
//   * booked_callback -> outcome only (the callback is still to happen).
//   * no_response/lost -> outcome only.
//   * opted_out       -> outcome only; conversation was already flagged opted_out.
//
// Nothing here sends anything.

import {
  getConversation,
  getFirm,
  createOutcome,
  createRecovery,
  setConversationStatus,
  setConversationOptedOut,
  findHandoffBySignatureRequest,
  setHandoffStatus,
} from "../ingest/db.mjs";

// ISO date (YYYY-MM-DD) of the Monday of the week containing `date`, in UTC.
// Weeks start Monday; Sunday belongs to the week that just ended.
export function weekOf(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const backToMonday = (dow + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  d.setUTCDate(d.getUTCDate() - backToMonday);
  return d.toISOString().slice(0, 10);
}

// Record a business outcome for a conversation. A 'signed' result also creates a
// recovery (valued at the firm's avg_case_fee unless an explicit fee is given)
// and closes the conversation. Returns { outcomeId, recoveryId }.
export function recordOutcome({
  db,
  conversationId,
  result,
  recoveredFee = null,
  now = new Date(),
}) {
  const conversation = getConversation(db, conversationId);
  if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);
  const firm = getFirm(db, conversation.firm_id);

  const nowIso = now.toISOString();
  let recoveredFeeEstimate = recoveredFee;
  let recoveryId = null;

  if (result === "signed") {
    // Default the recovered fee to the firm's average contingency fee.
    if (recoveredFeeEstimate == null) recoveredFeeEstimate = firm?.avg_case_fee ?? 0;
  }

  const outcomeId = createOutcome(db, {
    conversation_id: conversationId,
    result,
    recovered_fee_estimate: recoveredFeeEstimate,
    noted_at: nowIso,
  });

  if (result === "signed") {
    recoveryId = createRecovery(db, {
      firm_id: conversation.firm_id,
      conversation_id: conversationId,
      signed: 1,
      fee_amount: recoveredFeeEstimate,
      week_of: weekOf(now),
    });
    setConversationStatus(db, conversationId, "closed", nowIso);
  } else if (result === "opted_out") {
    setConversationOptedOut(db, conversationId, nowIso);
  }

  return { outcomeId, recoveryId };
}

// Handle an e-sign COMPLETION (webhook or manual). Correlates the signature
// request back to its handoff/conversation, marks the handoff completed, and
// records the signed outcome + recovery. Returns the recordOutcome result plus
// the resolved ids (or { handled:false } if the id is unknown).
export function completeSignatureRequest({ db, signatureRequestId, now = new Date() }) {
  const handoff = findHandoffBySignatureRequest(db, signatureRequestId);
  if (!handoff) return { handled: false, reason: "unknown_signature_request" };

  setHandoffStatus(db, handoff.id, "completed", now.toISOString());
  const res = recordOutcome({
    db,
    conversationId: handoff.conversation_id,
    result: "signed",
    now,
  });
  return { handled: true, handoffId: handoff.id, ...res };
}
