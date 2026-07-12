// Data-access helpers for the ingest → score → flag pipeline.
//
// These are thin wrappers over the SQLite connection from db/connection.mjs.
// The CLI, the tests, and the Next.js webhook route all call these — never raw
// SQL — so the storage seam stays in one place (Postgres later needs only
// query-syntax tweaks here, no caller changes).

import { encodeCallRailSecret } from "../integrations/crypto.mjs";

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
  // A call is "unscored" only if it has no flag row AND is not in a terminal
  // status. `failed_*` and `excluded_*` are terminal: without this guard a
  // permanently-failed call (bad audio, Spanish/single-speaker transcript throw)
  // is re-selected by EVERY sweep, burning a transcribe+score attempt per cycle
  // forever and re-alerting the founder each pass. A failed call already
  // surfaces once (visible status_reason on the desk + one founder alert); it
  // must not be retried blindly. To retry after fixing the cause, clear the
  // call's status back to NULL. (Retry-cap decision, Session 9 red-team.)
  const base = `
    SELECT c.* FROM calls c
    WHERE NOT EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id)
      AND (c.status IS NULL
           OR (c.status NOT LIKE 'failed%' AND c.status NOT LIKE 'excluded%'))`;
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
    case_type = null,
  } = flag;
  const info = db
    .prepare(
      `INSERT INTO flags
         (call_id, firm_id, qualification_score, is_leaked_signable, reason, case_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(call_id, firm_id, qualification_score, is_leaked_signable, reason, case_type ?? null);
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

// Per-firm CallRail signing secret (migration 0026 local / 0034 supabase).
// Pass null to clear it (the per-firm webhook route then falls back to the
// shared env secret). Returns true when a firm row was updated.
export function setFirmCallRailSecret(db, firmId, secret) {
  // Encrypt at rest — the signing key can forge valid webhook signatures, so it
  // must never be stored as plaintext where a DB dump would expose it.
  const stored = encodeCallRailSecret(secret);
  const info = db
    .prepare("UPDATE firms SET callrail_webhook_secret = ? WHERE id = ?")
    .run(stored, firmId);
  return Number(info.changes) > 0;
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

// Create a demo call row (status 'queued'). Returns { id, token }.
// public_token is an unguessable per-row handle: the demo result contains the
// uploader's own callers' PII, so polling must be by token, never by the
// sequential integer id (which any visitor could enumerate).
export function createDemoCall(db, { client_ip = null, filename = null, public_token = null } = {}) {
  const info = db
    .prepare(`INSERT INTO demo_calls (client_ip, filename, public_token) VALUES (?, ?, ?)`)
    .run(client_ip ?? null, filename ?? null, public_token ?? null);
  return { id: Number(info.lastInsertRowid), token: public_token ?? null };
}

export function getDemoCall(db, id) {
  return db.prepare("SELECT * FROM demo_calls WHERE id = ?").get(id);
}

export function getDemoCallByToken(db, token) {
  return db.prepare("SELECT * FROM demo_calls WHERE public_token = ?").get(token);
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

// --- Firm onboarding ---------------------------------------------------------
// kill_switch defaults to 1 (ON): a newly onboarded firm can send NOTHING until
// an operator explicitly clears the switch after A2P approval. Safe by default.

// Create a firm from the onboarding wizard. Returns the new firm id.
export function createFirm(db, firm) {
  const {
    name,
    avg_case_fee = 0,
    timezone = "America/Los_Angeles",
    subscription_price = null,
  } = firm;
  const info = db
    .prepare(
      `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price)
       VALUES (?, ?, ?, ?)`
    )
    .run(name, avg_case_fee, timezone, subscription_price);
  return Number(info.lastInsertRowid);
}

// Save a new approved template pack version for a firm. The version is monotonic
// per firm (previous max + 1). `pack` is an array of { id, name, body }.
// Returns { id, version }.
export function saveTemplateVersion(db, { firm_id, pack, approved_by = null }) {
  const row = db
    .prepare("SELECT MAX(version) AS v FROM template_versions WHERE firm_id = ?")
    .get(firm_id);
  const version = (row?.v ?? 0) + 1;
  const info = db
    .prepare(
      `INSERT INTO template_versions (firm_id, version, pack_json, approved_by)
       VALUES (?, ?, ?, ?)`
    )
    .run(firm_id, version, JSON.stringify(pack), approved_by);
  return { id: Number(info.lastInsertRowid), version };
}

// The current (highest-version) template pack for a firm, or null.
export function getLatestTemplateVersion(db, firmId) {
  const row = db
    .prepare(
      `SELECT * FROM template_versions
        WHERE firm_id = ? ORDER BY version DESC LIMIT 1`
    )
    .get(firmId);
  if (!row) return null;
  return { ...row, pack: JSON.parse(row.pack_json) };
}

// All template pack versions for a firm, newest first (audit trail).
export function listTemplateVersions(db, firmId) {
  return db
    .prepare(
      `SELECT id, firm_id, version, approved_by, created_at
         FROM template_versions WHERE firm_id = ? ORDER BY version DESC`
    )
    .all(firmId);
}

// All firms, for the operator status page + per-firm kill-switch controls.
export function listFirms(db) {
  return db
    .prepare(
      `SELECT id, name, kill_switch, autonomy_level, timezone
         FROM firms ORDER BY id`
    )
    .all();
}

// --- Operator error log (migration 0007) -------------------------------------
// Best-effort observability: pipeline/webhook/API failures land here so an
// operator can see what broke without server logs. `context` is a JSON string.

// Record an error. Returns the new error id. Callers wrap this in try/catch so a
// logging failure can NEVER break the pipeline.
export function logError(db, { source, message, context = null, firm_id = null }) {
  const info = db
    .prepare(
      `INSERT INTO errors (source, message, context, firm_id)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      String(source ?? "unknown"),
      String(message ?? ""),
      context == null ? null : typeof context === "string" ? context : JSON.stringify(context),
      firm_id
    );
  return Number(info.lastInsertRowid);
}

// Most recent errors (newest first) for the status page.
export function getRecentErrors(db, limit = 20) {
  return db
    .prepare(`SELECT * FROM errors ORDER BY id DESC LIMIT ?`)
    .all(Math.max(1, Math.floor(limit)));
}

// Count errors since an ISO timestamp (for the digest / alert threshold).
export function countRecentErrors(db, sinceIso) {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM errors WHERE created_at >= ?`)
    .get(sinceIso);
  return row.n;
}

// Mark a set of error ids as alerted (so an operator alert fires once per row).
export function markErrorsAlerted(db, ids = []) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const info = db
    .prepare(`UPDATE errors SET alerted = 1 WHERE id IN (${placeholders})`)
    .run(...ids);
  return Number(info.changes ?? 0);
}

// Un-alerted errors since an ISO timestamp (the alert module's work queue).
export function getUnalertedErrors(db, sinceIso) {
  return db
    .prepare(
      `SELECT * FROM errors WHERE alerted = 0 AND created_at >= ? ORDER BY id`
    )
    .all(sinceIso);
}

// --- Per-firm feature flags (migration 0008) ---------------------------------

// All explicitly-set flags for a firm as { feature: boolean }. Features with no
// row are simply absent (callers treat absent as OFF — see isFeatureEnabled).
export function getFirmFeatures(db, firmId) {
  const rows = db
    .prepare("SELECT feature, enabled FROM firm_features WHERE firm_id = ?")
    .all(firmId);
  const out = {};
  for (const r of rows) out[r.feature] = r.enabled === 1;
  return out;
}

// Is one feature enabled for a firm? DEFAULT OFF when the row is absent.
export function isFeatureEnabled(db, firmId, feature) {
  const row = db
    .prepare(
      "SELECT enabled FROM firm_features WHERE firm_id = ? AND feature = ?"
    )
    .get(firmId, feature);
  return row ? row.enabled === 1 : false;
}

// Turn a feature on/off for a firm (idempotent upsert on (firm_id, feature)).
export function setFirmFeature(db, firmId, feature, enabled, now) {
  db.prepare(
    `INSERT INTO firm_features (firm_id, feature, enabled, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (firm_id, feature)
     DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`
  ).run(firmId, feature, enabled ? 1 : 0, now ?? new Date().toISOString());
}

// --- Leak Audit sessions (migration 0009) ------------------------------------

export function createAuditSession(
  db,
  { token, visitor_fingerprint = null, monthly_call_volume = null, expires_at }
) {
  const info = db
    .prepare(
      `INSERT INTO audit_sessions (token, visitor_fingerprint, monthly_call_volume, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(token, visitor_fingerprint, monthly_call_volume, expires_at);
  return Number(info.lastInsertRowid);
}

export function getAuditSessionByToken(db, token) {
  return db.prepare("SELECT * FROM audit_sessions WHERE token = ?").get(token);
}

// Patch email / monthly_call_volume / status on a session (only provided fields).
export function updateAuditSession(db, id, patch = {}) {
  const sets = [];
  const vals = [];
  for (const k of ["email", "monthly_call_volume", "status"]) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(patch[k]);
    }
  }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE audit_sessions SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function attachDemoCallToSession(db, sessionId, demoCallId) {
  db.prepare(
    `INSERT OR IGNORE INTO audit_session_calls (session_id, demo_call_id) VALUES (?, ?)`
  ).run(sessionId, demoCallId);
}

// The demo_calls rows belonging to a session, in upload order.
export function getAuditSessionCalls(db, sessionId) {
  return db
    .prepare(
      `SELECT dc.* FROM audit_session_calls asc_
         JOIN demo_calls dc ON dc.id = asc_.demo_call_id
        WHERE asc_.session_id = ?
        ORDER BY asc_.id`
    )
    .all(sessionId);
}

export function countAuditSessionCalls(db, sessionId) {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM audit_session_calls WHERE session_id = ?`)
    .get(sessionId);
  return row.n;
}

export function countRecentAuditSessionsByFingerprint(db, fingerprint, sinceIso) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM audit_sessions
        WHERE visitor_fingerprint = ? AND created_at >= ?`
    )
    .get(fingerprint, sinceIso);
  return row.n;
}

// Most recent still-valid (unexpired) session for a fingerprint — used to RESUME
// an in-flight audit after a mid-batch upload hiccup instead of 7-day-locking the
// visitor out for a failure that was ours.
export function getRecentAuditSessionByFingerprint(db, fingerprint, nowIso) {
  return db
    .prepare(
      `SELECT * FROM audit_sessions
        WHERE visitor_fingerprint = ? AND expires_at > ?
        ORDER BY id DESC LIMIT 1`
    )
    .get(fingerprint, nowIso);
}

// Operator console: recent sessions (newest first) with their call counts.
export function listRecentAuditSessions(db, limit = 50) {
  return db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM audit_session_calls c WHERE c.session_id = s.id) AS call_count
         FROM audit_sessions s
        ORDER BY s.id DESC
        LIMIT ?`
    )
    .all(Math.max(1, Math.floor(limit)));
}

// Expire sessions past their expires_at (report becomes unavailable). Returns count.
export function purgeExpiredAuditSessions(db, nowIso) {
  const info = db
    .prepare(
      `UPDATE audit_sessions SET status = 'expired'
        WHERE status != 'expired' AND expires_at < ?`
    )
    .run(nowIso);
  return Number(info.changes ?? 0);
}

// --- Per-recovered-case billing (migration 0010) -----------------------------
// FLAT fee per case. NONE of these read a recovered-fee value — billing is
// structurally independent of what the firm actually recovered (Rule 5.4).

export function listBillingPlans(db) {
  return db.prepare("SELECT * FROM billing_plans ORDER BY base_monthly_cents").all();
}
export function getBillingPlan(db, id) {
  return db.prepare("SELECT * FROM billing_plans WHERE id = ?").get(id);
}
export function getBillingPlanByName(db, name) {
  return db.prepare("SELECT * FROM billing_plans WHERE name = ?").get(name);
}

export function getFirmBilling(db, firmId) {
  return db
    .prepare(
      `SELECT fb.*, p.name AS plan_name, p.base_monthly_cents, p.per_case_fee_cents,
              p.per_case_fee_by_type, p.monthly_case_fee_cap_cents, p.monthly_call_cap
         FROM firm_billing fb JOIN billing_plans p ON p.id = fb.plan_id
        WHERE fb.firm_id = ?`
    )
    .get(firmId);
}

// Create or update a firm's billing config (one row per firm).
export function upsertFirmBilling(db, cfg) {
  const {
    firm_id,
    plan_id,
    status = "trialing",
    billing_anchor_day = 1,
    stripe_customer_id = null,
    stripe_subscription_id = null,
    guarantee_type = "none",
    guarantee_threshold_cents = null,
    guarantee_deadline = null,
  } = cfg;
  db.prepare(
    `INSERT INTO firm_billing
       (firm_id, plan_id, status, billing_anchor_day, stripe_customer_id,
        stripe_subscription_id, guarantee_type, guarantee_threshold_cents, guarantee_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (firm_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       status = excluded.status,
       billing_anchor_day = excluded.billing_anchor_day,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       guarantee_type = excluded.guarantee_type,
       guarantee_threshold_cents = excluded.guarantee_threshold_cents,
       guarantee_deadline = excluded.guarantee_deadline`
  ).run(
    firm_id,
    plan_id,
    status,
    billing_anchor_day,
    stripe_customer_id,
    stripe_subscription_id,
    guarantee_type,
    guarantee_threshold_cents,
    guarantee_deadline
  );
  return getFirmBilling(db, firm_id);
}

// Set ONLY the lifecycle status on a firm's billing row (e.g. pause on a failed
// payment / past_due). Leaves stripe ids and plan untouched. Returns the row.
export function setFirmBillingStatus(db, firmId, status) {
  db.prepare(`UPDATE firm_billing SET status = ? WHERE firm_id = ?`).run(status, firmId);
  return getFirmBilling(db, firmId);
}

// Find a firm's billing row by its Stripe subscription id (for lifecycle webhook
// events that only carry the subscription). Returns the joined row or undefined.
export function getFirmBillingBySubscription(db, subscriptionId) {
  return db
    .prepare(
      `SELECT fb.*, p.name AS plan_name, p.base_monthly_cents
         FROM firm_billing fb JOIN billing_plans p ON p.id = fb.plan_id
        WHERE fb.stripe_subscription_id = ?`
    )
    .get(subscriptionId);
}

// Find a firm by exact name (idempotent firm matching in the checkout webhook).
export function getFirmByName(db, name) {
  return db.prepare("SELECT * FROM firms WHERE name = ?").get(name);
}

// Accrue ONE billable event for a signed outcome (idempotent on outcome_id).
// The fee applied is passed in from the plan — never derived from a recovered
// fee. Returns { id, created }.
export function accrueBillableEvent(db, ev) {
  const { firm_id, outcome_id, case_type = null, per_case_fee_cents_applied, period } = ev;
  const info = db
    .prepare(
      `INSERT OR IGNORE INTO billable_events
         (firm_id, outcome_id, case_type, per_case_fee_cents_applied, period)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(firm_id, outcome_id, case_type, per_case_fee_cents_applied, period);
  if (info.changes > 0) return { id: Number(info.lastInsertRowid), created: true };
  const existing = db
    .prepare("SELECT id FROM billable_events WHERE outcome_id = ?")
    .get(outcome_id);
  return { id: existing ? Number(existing.id) : null, created: false };
}

export function getBillableEvents(db, firmId, { period = null, status = null } = {}) {
  let sql = "SELECT * FROM billable_events WHERE firm_id = ?";
  const args = [firmId];
  if (period) { sql += " AND period = ?"; args.push(period); }
  if (status) { sql += " AND status = ?"; args.push(status); }
  sql += " ORDER BY id";
  return db.prepare(sql).all(...args);
}

// Count analyzed (received) calls for a firm in a 'YYYY-MM' period. Used only to
// flag "over your tier volume — consider upgrading" in the operator console; it
// is NEVER an input to any charge.
export function countCallsInPeriod(db, firmId, period) {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM calls WHERE firm_id = ? AND substr(received_at, 1, 7) = ?")
    .get(firmId, period);
  return Number(row?.n ?? 0);
}

export function getAccruedBillableEvents(db, firmId, period) {
  return db
    .prepare(
      "SELECT * FROM billable_events WHERE firm_id = ? AND period = ? AND status = 'accrued' ORDER BY id"
    )
    .all(firmId, period);
}

export function setBillableEventStatus(db, id, status, { dispute_reason = null, invoice_id = null } = {}) {
  db.prepare(
    `UPDATE billable_events
        SET status = ?, dispute_reason = ?, invoice_id = COALESCE(?, invoice_id)
      WHERE id = ?`
  ).run(status, dispute_reason, invoice_id, id);
}

export function markBillableEventsInvoiced(db, ids = [], invoiceId) {
  if (!ids.length) return 0;
  const ph = ids.map(() => "?").join(",");
  const info = db
    .prepare(
      `UPDATE billable_events SET status = 'invoiced', invoice_id = ?
        WHERE id IN (${ph}) AND status = 'accrued'`
    )
    .run(invoiceId, ...ids);
  return Number(info.changes ?? 0);
}

export function createInvoice(db, { firm_id, period, total_cents = 0, status = "open" }) {
  const info = db
    .prepare(
      "INSERT INTO invoices (firm_id, period, total_cents, status) VALUES (?, ?, ?, ?)"
    )
    .run(firm_id, period, total_cents, status);
  return Number(info.lastInsertRowid);
}

// P0-4b: the live (non-void) invoice for a firm+period, if any. Used to make
// invoice generation idempotent (one invoice per firm per period).
export function getInvoiceByFirmPeriod(db, firmId, period) {
  return db
    .prepare(
      "SELECT * FROM invoices WHERE firm_id = ? AND period = ? AND status <> 'void' ORDER BY id DESC LIMIT 1"
    )
    .get(firmId, period);
}

export function addInvoiceLine(db, line) {
  const { invoice_id, kind, description, amount_cents, outcome_id = null, snapshot = null } = line;
  const info = db
    .prepare(
      `INSERT INTO invoice_lines (invoice_id, kind, description, amount_cents, outcome_id, snapshot)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      invoice_id,
      kind,
      description,
      amount_cents,
      outcome_id,
      snapshot == null ? null : typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot)
    );
  return Number(info.lastInsertRowid);
}

export function setInvoiceTotal(db, id, totalCents, status = null) {
  if (status) {
    db.prepare("UPDATE invoices SET total_cents = ?, status = ? WHERE id = ?").run(totalCents, status, id);
  } else {
    db.prepare("UPDATE invoices SET total_cents = ? WHERE id = ?").run(totalCents, id);
  }
}

// Void (never delete) an invoice. Returns nothing.
export function voidInvoice(db, id, reason, now) {
  db.prepare(
    "UPDATE invoices SET status = 'void', void_reason = ?, voided_at = ? WHERE id = ?"
  ).run(reason ?? null, now ?? new Date().toISOString(), id);
}

export function getInvoice(db, id) {
  return db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
}
export function getInvoiceLines(db, invoiceId) {
  return db.prepare("SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id").all(invoiceId);
}
export function listInvoices(db, firmId) {
  return db.prepare("SELECT * FROM invoices WHERE firm_id = ? ORDER BY id DESC").all(firmId);
}

export function appendStripeSimLog(db, { firm_id = null, action, payload = null }) {
  const info = db
    .prepare("INSERT INTO stripe_sim_log (firm_id, action, payload) VALUES (?, ?, ?)")
    .run(
      firm_id,
      action,
      payload == null ? null : typeof payload === "string" ? payload : JSON.stringify(payload)
    );
  return Number(info.lastInsertRowid);
}
export function listStripeSimLog(db, { firm_id = null, limit = 50 } = {}) {
  if (firm_id != null) {
    return db
      .prepare("SELECT * FROM stripe_sim_log WHERE firm_id = ? ORDER BY id DESC LIMIT ?")
      .all(firm_id, Math.max(1, Math.floor(limit)));
  }
  return db
    .prepare("SELECT * FROM stripe_sim_log ORDER BY id DESC LIMIT ?")
    .all(Math.max(1, Math.floor(limit)));
}
export function countStripeSimLog(db) {
  return db.prepare("SELECT COUNT(*) AS n FROM stripe_sim_log").get().n;
}

// Count leaked-signable flags for a firm (guarantee "identified" tally). The
// guarantee values these at the firm's avg_case_fee in guarantee.mjs.
export function countLeakedFlags(db, firmId, sinceIso = null) {
  if (sinceIso) {
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM flags WHERE firm_id = ? AND is_leaked_signable = 1 AND created_at >= ?"
      )
      .get(firmId, sinceIso).n;
  }
  return db
    .prepare("SELECT COUNT(*) AS n FROM flags WHERE firm_id = ? AND is_leaked_signable = 1")
    .get(firmId).n;
}

// --- Peer benchmarking (migration 0011) --------------------------------------

export function setBenchmarkConsent(db, firmId, on) {
  db.prepare("UPDATE firms SET benchmark_data_sharing = ? WHERE id = ?").run(on ? 1 : 0, firmId);
}
export function countConsentingFirms(db) {
  return db.prepare("SELECT COUNT(*) AS n FROM firms WHERE benchmark_data_sharing = 1").get().n;
}
export function getConsentingFirmIds(db) {
  return db
    .prepare("SELECT id FROM firms WHERE benchmark_data_sharing = 1 ORDER BY id")
    .all()
    .map((r) => r.id);
}

// Per-flag rows for consenting firms: score, leaked, and whether the flag's
// conversation ended in a signed outcome. No firm identity leaves this layer —
// the aggregator reduces these to distribution stats only.
export function getBenchmarkRows(db, firmIds = []) {
  if (!firmIds.length) return [];
  const ph = firmIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT f.qualification_score AS score,
              f.is_leaked_signable AS leaked,
              CASE WHEN EXISTS (
                SELECT 1 FROM conversations c JOIN outcomes o ON o.conversation_id = c.id
                 WHERE c.flag_id = f.id AND o.result = 'signed'
              ) THEN 1 ELSE 0 END AS signed
         FROM flags f
        WHERE f.firm_id IN (${ph})`
    )
    .all(...firmIds);
}

export function insertBenchmarkSnapshot(db, s) {
  const info = db
    .prepare(
      `INSERT INTO benchmark_snapshots
         (contributor_count, sample_size, median_handling_score, q1_handling_score,
          q3_handling_score, leak_rate, sign_rate_by_band)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      s.contributor_count,
      s.sample_size,
      s.median_handling_score ?? null,
      s.q1_handling_score ?? null,
      s.q3_handling_score ?? null,
      s.leak_rate ?? null,
      s.sign_rate_by_band == null
        ? null
        : typeof s.sign_rate_by_band === "string"
          ? s.sign_rate_by_band
          : JSON.stringify(s.sign_rate_by_band)
    );
  return Number(info.lastInsertRowid);
}

export function getLatestBenchmarkSnapshot(db) {
  return db.prepare("SELECT * FROM benchmark_snapshots ORDER BY id DESC LIMIT 1").get();
}

// --- CRM / webhook integrations (migration 0012) -----------------------------

export function upsertFirmIntegration(db, cfg) {
  const {
    firm_id,
    provider,
    credentials_encrypted = null,
    field_map = null,
    webhook_url = null,
    webhook_secret = null,
    enabled = 0,
  } = cfg;
  const fm =
    field_map == null ? null : typeof field_map === "string" ? field_map : JSON.stringify(field_map);
  db.prepare(
    `INSERT INTO firm_integrations
       (firm_id, provider, credentials_encrypted, field_map, webhook_url, webhook_secret, enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (firm_id, provider) DO UPDATE SET
       credentials_encrypted = excluded.credentials_encrypted,
       field_map = excluded.field_map,
       webhook_url = excluded.webhook_url,
       webhook_secret = excluded.webhook_secret,
       enabled = excluded.enabled,
       updated_at = excluded.updated_at`
  ).run(
    firm_id,
    provider,
    credentials_encrypted,
    fm,
    webhook_url,
    webhook_secret,
    enabled ? 1 : 0,
    new Date().toISOString()
  );
  return getFirmIntegration(db, firm_id, provider);
}

export function getFirmIntegration(db, firmId, provider) {
  return db
    .prepare("SELECT * FROM firm_integrations WHERE firm_id = ? AND provider = ?")
    .get(firmId, provider);
}

export function listFirmIntegrations(db, firmId) {
  return db
    .prepare("SELECT * FROM firm_integrations WHERE firm_id = ? ORDER BY provider")
    .all(firmId);
}

// ── Recovery-desk additive layer (migration 0014). All additive; no frozen-core
//    behavior depends on these. ───────────────────────────────────────────────

export function setCallStatus(db, callId, status, reason = null) {
  db.prepare("UPDATE calls SET status = ?, status_reason = ? WHERE id = ?").run(status, reason, callId);
}

export function getCallReconciliation(db, firmId) {
  const row = db.prepare("SELECT * FROM v_call_reconciliation WHERE firm_id = ?").get(firmId);
  return row ?? { firm_id: firmId, received: 0, processed: 0, excluded: 0, failed: 0 };
}

// The intake coordinator's "wins this week": counts of callback outcomes recorded
// on flag_status since `sinceIso`, scoped to the firm. Framed as credit, never a
// score — the tool's job is to make the coordinator look good, not policed.
export function getCallbackWins(db, firmId, sinceIso) {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN fs.status IN ('reached_out','back_in_touch','signed','didnt_sign') THEN 1 ELSE 0 END) AS worked,
         SUM(CASE WHEN fs.status IN ('back_in_touch','signed') THEN 1 ELSE 0 END) AS reached,
         SUM(CASE WHEN fs.status = 'signed' THEN 1 ELSE 0 END) AS signed
       FROM flag_status fs
       JOIN flags f ON f.id = fs.flag_id
      WHERE f.firm_id = ? AND fs.updated_at >= ?`
    )
    .get(firmId, sinceIso);
  return {
    worked: Number(row?.worked ?? 0),
    reached: Number(row?.reached ?? 0),
    signed: Number(row?.signed ?? 0),
  };
}

export function insertTranscriptCitation(db, c) {
  const { flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score = null, status = "needs_review" } = c;
  const info = db
    .prepare(
      `INSERT INTO transcript_citations
         (flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status);
  return Number(info.lastInsertRowid);
}

export function getTranscriptCitations(db, flagId, { status = null } = {}) {
  let sql = "SELECT * FROM transcript_citations WHERE flag_id = ?";
  const args = [flagId];
  if (status) { sql += " AND status = ?"; args.push(status); }
  return db.prepare(sql + " ORDER BY start_ms").all(...args);
}

export function setFlagConfidence(db, { flag_id, confidence_tier, rubric_version }) {
  db.prepare(
    `INSERT INTO flag_confidence (flag_id, confidence_tier, rubric_version)
     VALUES (?, ?, ?)
     ON CONFLICT (flag_id) DO UPDATE SET
       confidence_tier = excluded.confidence_tier, rubric_version = excluded.rubric_version`
  ).run(flag_id, confidence_tier, rubric_version);
}

export function getFlagConfidence(db, flagId) {
  return db.prepare("SELECT * FROM flag_confidence WHERE flag_id = ?").get(flagId);
}

export function insertAnalysisVersion(db, { flag_id, model_version, prompt_version, rubric_version }) {
  const info = db
    .prepare(
      `INSERT INTO analysis_versions (flag_id, model_version, prompt_version, rubric_version)
       VALUES (?, ?, ?, ?)`
    )
    .run(flag_id, model_version, prompt_version, rubric_version);
  return Number(info.lastInsertRowid);
}

export function logArtifactAccess(db, { firm_id, actor, artifact_type, artifact_id, action }) {
  db.prepare(
    `INSERT INTO artifact_access_log (firm_id, actor, artifact_type, artifact_id, action)
     VALUES (?, ?, ?, ?, ?)`
  ).run(firm_id, actor, artifact_type, String(artifact_id), action);
}

export function insertCitationFailure(db, { flag_id = null, snippet, nearest_text = null, score = null }) {
  const info = db
    .prepare("INSERT INTO citation_failures (flag_id, snippet, nearest_text, score) VALUES (?, ?, ?, ?)")
    .run(flag_id, snippet, nearest_text, score);
  return Number(info.lastInsertRowid);
}

// Leaked-signable flags for the queue: joins call info + confidence tier + citation
// count. Strong flags first. Additive read; no behavior change.
export function listLeakedFlags(db, firmId) {
  return db
    .prepare(
      `SELECT f.id, f.call_id, f.qualification_score, f.reason, f.case_type,
              c.caller_name, c.caller_phone, c.received_at,
              fc.confidence_tier, fs.status AS save_status,
              COALESCE(fs.attempts, 0) AS attempts, fs.last_attempt_at,
              (SELECT COUNT(*) FROM transcript_citations tc WHERE tc.flag_id = f.id) AS citation_count
         FROM flags f
         JOIN calls c ON c.id = f.call_id
         LEFT JOIN flag_confidence fc ON fc.flag_id = f.id
         LEFT JOIN flag_status fs ON fs.flag_id = f.id
        WHERE f.firm_id = ? AND f.is_leaked_signable = 1
        ORDER BY
          (CASE WHEN fs.status IN ('signed','didnt_sign','bad_number') THEN 1 ELSE 0 END),
          (CASE WHEN fc.confidence_tier = 'strong' THEN 0 ELSE 1 END),
          c.received_at DESC`
    )
    .all(firmId);
}

// Calls that did NOT reach 'analyzed' — the actionable rows on the reconciliation
// screen (excluded/failed with their reasons; null = still processing).
// Upsert the workflow status beside a flag (sibling record; flags stays frozen).
// Forward progression of the callback workflow. A guarded (emailed-digest-link)
// write may only ADVANCE a case, never move it backward or sideways — so a stale
// "We called them" link (status reached_out) can't un-sign a case OR knock an
// already-"spoke to them" (back_in_touch) case back to "left a message".
const STATUS_RANK = {
  needs_callback: 0,
  reached_out: 1,
  back_in_touch: 2,
  signed: 3,
  didnt_sign: 3,
  bad_number: 3,
};
function isRegression(current, next) {
  const cur = STATUS_RANK[current] ?? 0;
  const nxt = STATUS_RANK[next] ?? 0;
  return current != null && cur >= nxt;
}

export function setFlagStatus(db, { flag_id, status, updated_by, firm_id = null, guardTerminal = false }) {
  const owner = db.prepare("SELECT firm_id FROM flags WHERE id = ?").get(flag_id);
  if (!owner) return null;
  if (firm_id != null && String(owner.firm_id) !== String(firm_id)) {
    return { ok: false, forbidden: true, firm_id: owner.firm_id };
  }
  // guardTerminal (emailed digest link): only advance, never regress.
  if (guardTerminal) {
    const cur = db.prepare("SELECT status FROM flag_status WHERE flag_id = ?").get(flag_id);
    if (isRegression(cur?.status, status)) {
      return { ok: false, alreadyResolved: true, current: cur.status };
    }
  }
  // Attempt counter (B-011): "left a message" / "spoke to them" each log one
  // real touch on the phone, so those writes increment attempts. Terminal
  // outcomes and undo don't count — the counter only grows, and only from
  // logged touches. It powers encouragement copy, never a score.
  const attemptInc = status === "reached_out" || status === "back_in_touch" ? 1 : 0;
  db.prepare(
    `INSERT INTO flag_status (flag_id, status, updated_by, updated_at, attempts, last_attempt_at)
     VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), ?,
             CASE WHEN ? = 1 THEN strftime('%Y-%m-%dT%H:%M:%SZ','now') END)
     ON CONFLICT (flag_id) DO UPDATE
       SET status = excluded.status, updated_by = excluded.updated_by,
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
           attempts = flag_status.attempts + ?,
           last_attempt_at = COALESCE(excluded.last_attempt_at, flag_status.last_attempt_at)`
  ).run(flag_id, status, updated_by ?? null, attemptInc, attemptInc, attemptInc);
  const after = db.prepare("SELECT attempts FROM flag_status WHERE flag_id = ?").get(flag_id);
  return { ok: true, firm_id: owner.firm_id, attempts: Number(after?.attempts ?? 0) };
}

export function listNonAnalyzedCalls(db, firmId) {
  return db
    .prepare(
      `SELECT id, received_at, status, status_reason
         FROM calls
        WHERE firm_id = ? AND (status IS NULL OR status <> 'analyzed')
        ORDER BY id`
    )
    .all(firmId);
}

// Prefer the firm's own historical row; fall back to the global published row.
export function getFeeValueRange(db, caseType, firmId = null) {
  if (firmId != null) {
    const firmRow = db
      .prepare("SELECT * FROM fee_value_ranges WHERE case_type = ? AND firm_id = ? ORDER BY updated_at DESC LIMIT 1")
      .get(caseType, firmId);
    if (firmRow) return firmRow;
  }
  return db
    .prepare("SELECT * FROM fee_value_ranges WHERE case_type = ? AND firm_id IS NULL ORDER BY updated_at DESC LIMIT 1")
    .get(caseType);
}

// ── Report review gate (migration 0016). ──────────────────────────────────────
export function getReportStatus(db, sessionId) {
  return db
    .prepare("SELECT report_status, released_at, released_by FROM audit_sessions WHERE id = ?")
    .get(sessionId) ?? null;
}

export function setReportStatus(db, sessionId, status, { releasedBy = null, now = null } = {}) {
  if (status === "released") {
    db.prepare(
      "UPDATE audit_sessions SET report_status = ?, released_at = ?, released_by = ? WHERE id = ?"
    ).run(status, now ?? new Date().toISOString(), releasedBy, sessionId);
  } else {
    db.prepare("UPDATE audit_sessions SET report_status = ? WHERE id = ?").run(status, sessionId);
  }
}

// ── Report access events (migration 0017). ────────────────────────────────────
export function logReportAccess(db, { token, event_type, viewer_fingerprint = null }) {
  db.prepare(
    "INSERT INTO report_access_events (token, event_type, viewer_fingerprint) VALUES (?, ?, ?)"
  ).run(token, event_type, viewer_fingerprint);
}

export function countReportAccess(db, token) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'view')      AS views,
         COUNT(*) FILTER (WHERE event_type = 'download')  AS downloads,
         COUNT(DISTINCT viewer_fingerprint)               AS distinct_viewers
       FROM report_access_events WHERE token = ?`
    )
    .get(token);
  return row ?? { views: 0, downloads: 0, distinct_viewers: 0 };
}

// Sessions awaiting analyst review (for the internal review queue UI).
export function listReviewableSessions(db) {
  return db
    .prepare(
      "SELECT id, token, email, report_status, created_at FROM audit_sessions WHERE report_status IN ('draft','analyst_review') ORDER BY created_at DESC LIMIT 100"
    )
    .all();
}

// P0-2 — consent log. Write a ConsentEvent before any consent-relevant workflow
// (e.g. the Live Coach opening the mic). firm_id/conversation_id may be null in
// the single-tenant pilot; `basis` is required (non-empty).
export function createConsentEvent(db, { firm_id = null, conversation_id = null, basis, detail = null, actor = null }) {
  const info = db
    .prepare(
      `INSERT INTO consent_events (firm_id, conversation_id, basis, detail, actor)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(firm_id, conversation_id, basis, detail, actor);
  return Number(info.lastInsertRowid);
}

// P0-4a — Stripe webhook idempotency. Returns true if this event_id was recorded
// for the FIRST time (caller should process it), false if it was already seen
// (caller should ack without dispatching). Atomic via the PRIMARY KEY.
export function recordStripeEventProcessed(db, eventId, eventType = null) {
  const info = db
    .prepare(
      "INSERT OR IGNORE INTO processed_stripe_events (event_id, event_type) VALUES (?, ?)"
    )
    .run(eventId, eventType);
  return Number(info.changes ?? 0) > 0; // true => newly inserted (not a replay)
}

// P0-3 / CLAUDE.md §(h): purge confidential content from REAL firm data once it
// is past the retention window. Nulls `transcript` + `recording_url` on `calls`
// received before `beforeIso`, and nulls the `body` of outbound/inbound messages
// created before `beforeIso` (stamping `purged_at` so the log row survives — a
// message is NEVER hard-deleted, only its confidential body is scrubbed).
// Idempotent: rows already purged (content already null) are skipped, so the
// returned count reflects only rows actually scrubbed this run.
export function purgeExpiredCalls(db, beforeIso) {
  const calls = db
    .prepare(
      `UPDATE calls
          SET transcript = NULL, recording_url = NULL
        WHERE received_at < ?
          AND (transcript IS NOT NULL OR recording_url IS NOT NULL)`
    )
    .run(beforeIso);
  const messages = db
    .prepare(
      `UPDATE messages
          SET body = NULL, purged_at = ?
        WHERE created_at < ? AND body IS NOT NULL`
    )
    .run(beforeIso, beforeIso);
  return {
    calls: Number(calls.changes ?? 0),
    messages: Number(messages.changes ?? 0),
  };
}

// --- First-party product event log + alert state (migration 0027) ------------
//
// Confidential legal data means NO third-party analytics: product events land
// here, hold ids/counts only (never transcripts, never caller PII), and are
// read only by the founder-gated /studio/beta board and the alert sweep.
// Writes are best-effort at every call site (a failed event write must never
// break the user action that produced it) — callers .catch(() => {}).

import { isEventType } from "./event-types.mjs";

// Insert one product event. Throws on an unknown event name (the schema CHECK
// would refuse it anyway) so a typo'd name fails tests instead of silently
// logging garbage. Returns the new row id.
export function recordEvent(db, { event, firm_id = null, actor = null, context = null }) {
  if (!isEventType(event)) throw new Error(`unknown product event: ${event}`);
  const info = db
    .prepare(
      `INSERT INTO events (event, firm_id, actor, context)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      event,
      firm_id,
      actor == null ? null : String(actor),
      context == null ? null : typeof context === "string" ? context : JSON.stringify(context)
    );
  return Number(info.lastInsertRowid);
}

// Generic reader for the board + streak logic. Filters are all optional;
// newest first, capped by `limit`.
export function listEvents(db, { event = null, firm_id = null, sinceIso = null, limit = 200 } = {}) {
  const where = [];
  const params = [];
  if (event != null) { where.push("event = ?"); params.push(event); }
  if (firm_id != null) { where.push("firm_id = ?"); params.push(firm_id); }
  if (sinceIso != null) { where.push("created_at >= ?"); params.push(sinceIso); }
  const sql = `SELECT * FROM events${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
               ORDER BY id DESC LIMIT ?`;
  params.push(Math.max(1, Math.floor(limit)));
  return db.prepare(sql).all(...params);
}

export function countEvents(db, { event, firm_id = null, sinceIso = null } = {}) {
  const where = ["event = ?"];
  const params = [event];
  if (firm_id != null) { where.push("firm_id = ?"); params.push(firm_id); }
  if (sinceIso != null) { where.push("created_at >= ?"); params.push(sinceIso); }
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM events WHERE ${where.join(" AND ")}`)
    .get(...params);
  return Number(row?.n ?? 0);
}

// Earliest occurrence of an event (optionally per firm) — the activation
// clock's anchor ("first digest", "first callback marked"). Null when never.
export function firstEventAt(db, { event, firm_id = null } = {}) {
  const where = ["event = ?"];
  const params = [event];
  if (firm_id != null) { where.push("firm_id = ?"); params.push(firm_id); }
  const row = db
    .prepare(`SELECT MIN(created_at) AS t FROM events WHERE ${where.join(" AND ")}`)
    .get(...params);
  return row?.t ?? null;
}

// Latest occurrence — "last activity" on the board. Null when never.
export function lastEventAt(db, { event = null, firm_id = null } = {}) {
  const where = [];
  const params = [];
  if (event != null) { where.push("event = ?"); params.push(event); }
  if (firm_id != null) { where.push("firm_id = ?"); params.push(firm_id); }
  const row = db
    .prepare(
      `SELECT MAX(created_at) AS t FROM events${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`
    )
    .get(...params);
  return row?.t ?? null;
}

// --- Alert-state watermarks (migration 0027) ----------------------------------
// Tiny key/value store so each founder-alert trigger fires exactly once per
// window (last error id alerted, last application seen, last pulse date).

export function getAlertState(db, key) {
  const row = db.prepare(`SELECT value FROM alert_state WHERE key = ?`).get(key);
  return row ? row.value : null;
}

export function setAlertState(db, key, value) {
  db.prepare(
    `INSERT INTO alert_state (key, value, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value == null ? null : String(value));
}

// Errors newer than a watermark id — the alert sweep's cursor. Uses the id, not
// `alerted` (that flag belongs to the older sendErrorAlert path; sharing it
// would make each path swallow the other's rows).
export function getErrorsAfterId(db, afterId = 0, limit = 500) {
  return db
    .prepare(`SELECT * FROM errors WHERE id > ? ORDER BY id LIMIT ?`)
    .all(Number(afterId) || 0, Math.max(1, Math.floor(limit)));
}

// --- Founder-set funnel stage (migration 0027) --------------------------------

export function setFirmStage(db, firmId, stage) {
  const s = stage === "pilot" || stage === "paid" ? stage : null;
  db.prepare(
    `UPDATE firms SET stage = ?, stage_updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE id = ?`
  ).run(s, firmId);
}

// --- Windowed per-firm call counts for the beta board --------------------------
// received = every call that arrived since `sinceIso`; scored = reached
// 'analyzed'; failed = any 'failed_*' status. Pending/excluded are the
// remainder — the board shows the three that matter.
export function callCountsSince(db, firmId, sinceIso) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS received,
              SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) AS scored,
              SUM(CASE WHEN status LIKE 'failed%' THEN 1 ELSE 0 END) AS failed
         FROM calls WHERE firm_id = ? AND created_at >= ?`
    )
    .get(firmId, sinceIso);
  return {
    received: Number(row?.received ?? 0),
    scored: Number(row?.scored ?? 0),
    failed: Number(row?.failed ?? 0),
  };
}

// Latest call arrival for a firm (the board's "last activity" heartbeat).
export function lastCallAt(db, firmId) {
  const row = db
    .prepare(`SELECT MAX(created_at) AS t FROM calls WHERE firm_id = ?`)
    .get(firmId);
  return row?.t ?? null;
}

// --- Received-but-never-scored watchdog (Inngest-outage safety net) -------------
// Calls that arrived but still have NO flag row (the "unscored" signal — see
// getUnscoredCalls) AND are not in a terminal (failed_*/excluded_*) status,
// whose received_at is older than `cutoffIso`. Grouped per firm with the count
// and the oldest arrival. Scoring runs entirely through Inngest (the webhook
// event AND the 15-min "fallback" sweep are both Inngest crons), so an Inngest
// outage has no fallback and strands calls unscored forever — this is what the
// founder-alert stuckUnscored trigger reads to catch that.
export function stuckUnscoredCalls(db, cutoffIso) {
  const rows = db
    .prepare(
      `SELECT c.firm_id AS firm_id, COUNT(*) AS count, MIN(c.received_at) AS oldest
         FROM calls c
        WHERE NOT EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id)
          AND (c.status IS NULL
               OR (c.status NOT LIKE 'failed%' AND c.status NOT LIKE 'excluded%'))
          AND c.received_at < ?
        GROUP BY c.firm_id
        ORDER BY oldest`
    )
    .all(cutoffIso);
  return rows.map((r) => ({
    firm_id: r.firm_id,
    count: Number(r.count ?? 0),
    oldest: r.oldest ?? null,
  }));
}
