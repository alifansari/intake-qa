// Data-access helpers for the ingest → score → flag pipeline.
//
// These are thin wrappers over the SQLite connection from db/connection.mjs.
// The CLI, the tests, and the Next.js webhook route all call these — never raw
// SQL — so the storage seam stays in one place (Postgres later needs only
// query-syntax tweaks here, no caller changes).

// Insert a call, or update the existing one when the same firm re-sends the
// same external_call_id (CallRail `call_modified`). Manual rows have a null
// external_call_id and always insert.
// Returns { id, created } where created=false means an existing row was updated.
export function upsertCall(db, call) {
  const {
    firm_id,
    source,
    external_call_id = null,
    recording_url = null,
    transcript = null,
    caller_phone = null,
    caller_name = null,
    received_at,
  } = call;

  if (external_call_id != null) {
    const existing = db
      .prepare(
        "SELECT id FROM calls WHERE firm_id = ? AND external_call_id = ?"
      )
      .get(firm_id, external_call_id);

    if (existing) {
      // Only overwrite columns when a new value is provided (keep prior data
      // if the modified payload omits a field).
      db.prepare(
        `UPDATE calls
           SET recording_url = COALESCE(?, recording_url),
               transcript    = COALESCE(?, transcript),
               caller_phone  = COALESCE(?, caller_phone),
               caller_name   = COALESCE(?, caller_name),
               received_at   = COALESCE(?, received_at)
         WHERE id = ?`
      ).run(
        recording_url,
        transcript,
        caller_phone,
        caller_name,
        received_at ?? null,
        existing.id
      );
      return { id: Number(existing.id), created: false };
    }
  }

  const info = db
    .prepare(
      `INSERT INTO calls
         (firm_id, source, external_call_id, recording_url, transcript, caller_phone, caller_name, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      firm_id,
      source,
      external_call_id,
      recording_url,
      transcript,
      caller_phone,
      caller_name,
      received_at
    );
  return { id: Number(info.lastInsertRowid), created: true };
}

// Persist a transcript onto an existing call (used after AssemblyAI runs).
export function setTranscript(db, callId, transcript) {
  db.prepare("UPDATE calls SET transcript = ? WHERE id = ?").run(
    transcript,
    callId
  );
}

// A call is "un-scored" when no flags row references it yet — the scoring
// worker creates the flag, so its existence marks the call as scored.
export function getUnscoredCalls(db, firmId = null) {
  const base = `
    SELECT c.* FROM calls c
    WHERE NOT EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id)`;
  if (firmId != null) {
    return db
      .prepare(`${base} AND c.firm_id = ? ORDER BY c.id`)
      .all(firmId);
  }
  return db.prepare(`${base} ORDER BY c.id`).all();
}

// Record a flag for a scored call. Returns the new flag id.
export function insertFlag(db, flag) {
  const {
    call_id,
    firm_id,
    qualification_score = null,
    is_leaked_signable = 0,
    reason = null,
  } = flag;
  const info = db
    .prepare(
      `INSERT INTO flags
         (call_id, firm_id, qualification_score, is_leaked_signable, reason)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(call_id, firm_id, qualification_score, is_leaked_signable, reason);
  return Number(info.lastInsertRowid);
}

// Fetch a firm row (needed for per-firm settings like reengage_window_hours).
export function getFirm(db, firmId) {
  return db.prepare("SELECT * FROM firms WHERE id = ?").get(firmId);
}

// Create a re-engagement conversation. consent_basis is REQUIRED by the schema.
// Returns the new conversation id.
export function createConversation(db, conv) {
  const {
    flag_id,
    firm_id,
    caller_phone,
    status = "pending_approval",
    consent_basis,
  } = conv;
  const info = db
    .prepare(
      `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(flag_id, firm_id, caller_phone, status, consent_basis);
  return Number(info.lastInsertRowid);
}

// Create a DRAFTED outbound message (unsent, unapproved). Returns the message id.
// Nothing here sends — status stays 'drafted' until the approval queue acts.
export function createDraftMessage(db, msg) {
  const { conversation_id, body } = msg;
  const info = db
    .prepare(
      `INSERT INTO messages (conversation_id, direction, body, status, approved_by, sent_at)
       VALUES (?, 'outbound', ?, 'drafted', NULL, NULL)`
    )
    .run(conversation_id, body);
  return Number(info.lastInsertRowid);
}

// --- Send layer: approval queue + sender + inbound ---------------------------

// Fetch a single message row.
export function getMessage(db, id) {
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
}

// Outbound messages awaiting human approval (status 'drafted'), joined to the
// caller for display. Optionally scoped to a firm.
export function getDraftedMessages(db, firmId = null) {
  const base = `
    SELECT m.*, cv.firm_id, cv.caller_phone, c.caller_name
      FROM messages m
      JOIN conversations cv ON cv.id = m.conversation_id
      JOIN flags f ON f.id = cv.flag_id
      JOIN calls c ON c.id = f.call_id
     WHERE m.direction = 'outbound' AND m.status = 'drafted'`;
  if (firmId != null) {
    return db.prepare(`${base} AND cv.firm_id = ? ORDER BY m.id`).all(firmId);
  }
  return db.prepare(`${base} ORDER BY m.id`).all();
}

// Approved-but-unsent outbound messages (the sender's work queue).
export function getApprovedMessages(db, firmId = null) {
  const base = `
    SELECT m.* FROM messages m
      JOIN conversations cv ON cv.id = m.conversation_id
     WHERE m.direction = 'outbound' AND m.status = 'approved'`;
  if (firmId != null) {
    return db.prepare(`${base} AND cv.firm_id = ? ORDER BY m.id`).all(firmId);
  }
  return db.prepare(`${base} ORDER BY m.id`).all();
}

// Human approves a drafted message: drafted -> approved, record who approved it.
export function approveMessage(db, id, approvedBy) {
  db.prepare(
    `UPDATE messages SET status = 'approved', approved_by = ?
       WHERE id = ? AND status = 'drafted'`
  ).run(approvedBy ?? "operator", id);
}

// Human rejects a drafted message. The schema enum has no 'rejected', so we mark
// it 'failed' — that keeps it out of the sender (which only sends 'approved')
// while preserving the log row + body.
export function rejectMessage(db, id) {
  db.prepare(
    `UPDATE messages SET status = 'failed' WHERE id = ? AND status = 'drafted'`
  ).run(id);
}

// Human edits a drafted message body in place (stays 'drafted' for re-review).
export function editDraftMessage(db, id, body) {
  db.prepare(
    `UPDATE messages SET body = ? WHERE id = ? AND status = 'drafted'`
  ).run(body, id);
}

// Mark a message actually sent (real or simulated). Sets status + sent_at.
export function markMessageSent(db, id, sentAt) {
  db.prepare(`UPDATE messages SET status = 'sent', sent_at = ? WHERE id = ?`).run(
    sentAt,
    id
  );
}

// Mark a send attempt failed (transport error). Leaves the body for retry/audit.
export function markMessageFailed(db, id) {
  db.prepare(`UPDATE messages SET status = 'failed' WHERE id = ?`).run(id);
}

// Fetch a conversation row.
export function getConversation(db, id) {
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
}

// Find the most recent conversation for a firm + caller phone (inbound routing).
export function findConversationByPhone(db, firmId, phone) {
  return db
    .prepare(
      `SELECT * FROM conversations
         WHERE firm_id = ? AND caller_phone = ?
         ORDER BY id DESC LIMIT 1`
    )
    .get(firmId, phone);
}

// All messages in a conversation, oldest first (for reply drafting context).
export function getConversationMessages(db, convId) {
  return db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id")
    .all(convId);
}

// Resolve the caller's name via the conversation's flag -> call, for greeting.
export function getCallerNameForConversation(db, convId) {
  const row = db
    .prepare(
      `SELECT c.caller_name
         FROM conversations cv
         JOIN flags f ON f.id = cv.flag_id
         JOIN calls c ON c.id = f.call_id
        WHERE cv.id = ?`
    )
    .get(convId);
  return row?.caller_name ?? null;
}

// Honor an opt-out: flag the conversation opted_out and stamp updated_at. Once
// opted out, the sender will never transmit to it again.
export function setConversationOptedOut(db, convId, now) {
  db.prepare(
    `UPDATE conversations SET status = 'opted_out', updated_at = ? WHERE id = ?`
  ).run(now, convId);
}

// Store an inbound message (a caller reply). status 'received'; its created_at
// is the audit timestamp (used as the opt-out log time). Returns the message id.
export function addInboundMessage(db, { conversation_id, body }) {
  const info = db
    .prepare(
      `INSERT INTO messages (conversation_id, direction, body, status, approved_by, sent_at)
       VALUES (?, 'inbound', ?, 'received', NULL, NULL)`
    )
    .run(conversation_id, body);
  return Number(info.lastInsertRowid);
}

// Flip the per-firm kill switch (operator halt). firmId=null flips ALL firms.
export function setFirmKillSwitch(db, firmId, on) {
  const val = on ? 1 : 0;
  if (firmId == null) {
    db.prepare("UPDATE firms SET kill_switch = ?").run(val);
  } else {
    db.prepare("UPDATE firms SET kill_switch = ? WHERE id = ?").run(val, firmId);
  }
}

// Move a conversation to a new lifecycle status (e.g. 'handed_off', 'closed').
export function setConversationStatus(db, id, status, now) {
  db.prepare(
    `UPDATE conversations SET status = ?, updated_at = ? WHERE id = ?`
  ).run(status, now ?? new Date().toISOString(), id);
}

// --- E-sign / callback handoffs ----------------------------------------------

// Create a handoff row (e-sign or callback). Returns the new handoff id.
export function createHandoff(db, handoff) {
  const {
    conversation_id,
    firm_id,
    kind,
    provider = null,
    signature_request_id = null,
    sign_url = null,
    embedded = 0,
    callback_requested_at = null,
    status = "pending",
  } = handoff;
  const info = db
    .prepare(
      `INSERT INTO handoffs
         (conversation_id, firm_id, kind, provider, signature_request_id,
          sign_url, embedded, callback_requested_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      conversation_id,
      firm_id,
      kind,
      provider,
      signature_request_id,
      sign_url,
      embedded ? 1 : 0,
      callback_requested_at,
      status
    );
  return Number(info.lastInsertRowid);
}

export function getHandoff(db, id) {
  return db.prepare("SELECT * FROM handoffs WHERE id = ?").get(id);
}

// Correlate the async e-sign completion webhook back to its handoff.
export function findHandoffBySignatureRequest(db, signatureRequestId) {
  return db
    .prepare("SELECT * FROM handoffs WHERE signature_request_id = ?")
    .get(signatureRequestId);
}

export function setHandoffStatus(db, id, status, now) {
  db.prepare(
    `UPDATE handoffs SET status = ?, updated_at = ? WHERE id = ?`
  ).run(status, now ?? new Date().toISOString(), id);
}

// --- Outcomes + recoveries (reconciliation) ----------------------------------

// Record a business outcome for a conversation. Returns the new outcome id.
export function createOutcome(db, outcome) {
  const { conversation_id, result, recovered_fee_estimate = null, noted_at } = outcome;
  const info = db
    .prepare(
      noted_at
        ? `INSERT INTO outcomes (conversation_id, result, recovered_fee_estimate, noted_at)
           VALUES (?, ?, ?, ?)`
        : `INSERT INTO outcomes (conversation_id, result, recovered_fee_estimate)
           VALUES (?, ?, ?)`
    )
    .run(
      ...(noted_at
        ? [conversation_id, result, recovered_fee_estimate, noted_at]
        : [conversation_id, result, recovered_fee_estimate])
    );
  return Number(info.lastInsertRowid);
}

// Record a recovery (feeds the weekly reconciliation). Returns the recovery id.
export function createRecovery(db, recovery) {
  const { firm_id, conversation_id, signed = 1, fee_amount = null, week_of } = recovery;
  const info = db
    .prepare(
      `INSERT INTO recoveries (firm_id, conversation_id, signed, fee_amount, week_of)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(firm_id, conversation_id, signed ? 1 : 0, fee_amount, week_of);
  return Number(info.lastInsertRowid);
}

export function getOutcomesForConversation(db, conversationId) {
  return db
    .prepare("SELECT * FROM outcomes WHERE conversation_id = ? ORDER BY id")
    .all(conversationId);
}

export function getRecoveriesForConversation(db, conversationId) {
  return db
    .prepare("SELECT * FROM recoveries WHERE conversation_id = ? ORDER BY id")
    .all(conversationId);
}

// --- Weekly reconciliation queries -------------------------------------------
// Funnel counts bucket by each entity's own created_at within the week window
// [startIso, endIso). The recovered $ figure is keyed off recoveries.week_of and
// is intentionally SIGNED-ONLY (recoveries exist only for signed outcomes).

// Leaked-signable flags raised in the window.
export function countFlaggedInWeek(db, firmId, startIso, endIso) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM flags
        WHERE firm_id = ? AND is_leaked_signable = 1
          AND created_at >= ? AND created_at < ?`
    )
    .get(firmId, startIso, endIso);
  return row.n;
}

// Re-engagement conversations started in the window.
export function countConversationsInWeek(db, firmId, startIso, endIso) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM conversations
        WHERE firm_id = ? AND created_at >= ? AND created_at < ?`
    )
    .get(firmId, startIso, endIso);
  return row.n;
}

// Conversations that got at least one inbound (caller) reply in the window.
export function countRepliedInWeek(db, firmId, startIso, endIso) {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT m.conversation_id) AS n
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
        WHERE c.firm_id = ? AND m.direction = 'inbound'
          AND m.created_at >= ? AND m.created_at < ?`
    )
    .get(firmId, startIso, endIso);
  return row.n;
}

// Signed recoveries for the week, with the caller name + a case-type label
// (from the flag reason) for the itemized list and "case of the week".
export function getSignedRecoveries(db, firmId, weekOf) {
  return db
    .prepare(
      `SELECT r.conversation_id, r.fee_amount,
              cl.caller_name AS name, f.reason AS case_type
         FROM recoveries r
         LEFT JOIN conversations cv ON cv.id = r.conversation_id
         LEFT JOIN flags f ON f.id = cv.flag_id
         LEFT JOIN calls cl ON cl.id = f.call_id
        WHERE r.firm_id = ? AND r.signed = 1 AND r.week_of = ?
        ORDER BY r.fee_amount DESC, r.id`
    )
    .all(firmId, weekOf);
}

// Month-to-date recovered: SUM of signed recovery fees from the month's first day
// through the report week (inclusive). ISO dates sort lexicographically.
export function sumRecoveredMonthToDate(db, firmId, monthStartDate, throughWeekOf) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(fee_amount), 0) AS total
         FROM recoveries
        WHERE firm_id = ? AND signed = 1
          AND week_of >= ? AND week_of <= ?`
    )
    .get(firmId, monthStartDate, throughWeekOf);
  return row.total;
}

// --- Demo Mode (public, no-auth, hard-isolated from the firm pipeline) --------
// These never touch calls/conversations/messages; a demo upload can never send.

// Create a demo call row (status 'queued'). Returns the new id.
export function createDemoCall(db, { client_ip = null, filename = null } = {}) {
  const info = db
    .prepare(`INSERT INTO demo_calls (client_ip, filename) VALUES (?, ?)`)
    .run(client_ip, filename);
  return Number(info.lastInsertRowid);
}

export function getDemoCall(db, id) {
  return db.prepare("SELECT * FROM demo_calls WHERE id = ?").get(id);
}

// Advance the lifecycle status ('queued'->'transcribing'->'scoring'->'done'|'error').
export function setDemoCallStatus(db, id, status, now) {
  db.prepare(
    `UPDATE demo_calls SET status = ?, updated_at = ? WHERE id = ?`
  ).run(status, now ?? new Date().toISOString(), id);
}

export function setDemoCallTranscript(db, id, transcript, now) {
  db.prepare(
    `UPDATE demo_calls SET transcript = ?, updated_at = ? WHERE id = ?`
  ).run(transcript, now ?? new Date().toISOString(), id);
}

// Store the computed result and mark done. `resultJson` is a JSON string.
export function setDemoCallResult(db, id, resultJson, now) {
  db.prepare(
    `UPDATE demo_calls SET result_json = ?, status = 'done', updated_at = ? WHERE id = ?`
  ).run(resultJson, now ?? new Date().toISOString(), id);
}

export function setDemoCallError(db, id, error, now) {
  db.prepare(
    `UPDATE demo_calls SET error = ?, status = 'error', updated_at = ? WHERE id = ?`
  ).run(String(error ?? "unknown error"), now ?? new Date().toISOString(), id);
}

// Record that the uploaded audio bytes have been deleted (retention selling point).
export function markDemoAudioDeleted(db, id, now) {
  db.prepare(
    `UPDATE demo_calls SET audio_deleted = 1, updated_at = ? WHERE id = ?`
  ).run(now ?? new Date().toISOString(), id);
}

// Rate limiting: uploads by this IP since `sinceIso` (trailing-hour count).
export function countRecentDemoUploadsByIp(db, ip, sinceIso) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM demo_calls WHERE client_ip = ? AND created_at >= ?`
    )
    .get(ip, sinceIso);
  return row.n;
}

// Concurrency: uploads by this IP still in an active (non-terminal) status.
export function countActiveDemoUploadsByIp(db, ip) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM demo_calls
        WHERE client_ip = ? AND status IN ('queued','transcribing','scoring')`
    )
    .get(ip);
  return row.n;
}

// Retention purge: null out transcript + result for demo rows older than
// `beforeIso` (keeps the row so demo_leads FK survives). Returns rows purged.
export function purgeExpiredDemoCalls(db, beforeIso) {
  const info = db
    .prepare(
      `UPDATE demo_calls
          SET transcript = NULL, result_json = NULL, status = 'done'
        WHERE created_at < ? AND (transcript IS NOT NULL OR result_json IS NOT NULL)`
    )
    .run(beforeIso);
  return Number(info.changes ?? 0);
}

// Lead capture ("email me this report"). Returns the new lead id.
export function createDemoLead(db, { demo_call_id = null, email }) {
  const info = db
    .prepare(`INSERT INTO demo_leads (demo_call_id, email) VALUES (?, ?)`)
    .run(demo_call_id, email);
  return Number(info.lastInsertRowid);
}
