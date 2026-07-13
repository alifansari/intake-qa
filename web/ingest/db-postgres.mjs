// Postgres (Supabase) implementation of the pipeline data layer.
//
// This is the async, Postgres-dialect twin of ingest/db.mjs (SQLite). Same
// function names and return shapes, so pipeline stages can run against either
// backend via the factory in ingest/store.mjs. Differences handled here:
//   * placeholders $1..$n instead of ?
//   * INSERT ... RETURNING id (ids are UUID strings, not row numbers)
//   * real BOOLEAN values (true/false) instead of 0/1
//   * COUNT(*) comes back as a bigint string -> coerced with Number()
//
// The `db` handle is a `pg` Pool (or Client) — anything with `.query(text, params)`.
// This runs only as a TRUSTED BACKEND (the pipeline), using the service database
// connection, so it operates outside browser RLS by design; the queue UI still
// reads through the user-scoped, RLS-protected Supabase client.

import { encodeCallRailSecret } from "../integrations/crypto.mjs";

// Insert a call, or update the existing one when the same firm re-sends the same
// external_call_id. Returns { id, created }.
export async function upsertCall(db, call) {
  const {
    firm_id,
    source,
    external_call_id = null,
    recording_url = null,
    transcript = null,
    caller_phone = null,
    caller_name = null,
    received_at = null,
  } = call;

  if (external_call_id != null) {
    const existing = await db.query(
      "SELECT id FROM calls WHERE firm_id = $1 AND external_call_id = $2",
      [firm_id, external_call_id]
    );
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await db.query(
        `UPDATE calls
           SET recording_url = COALESCE($1, recording_url),
               transcript    = COALESCE($2, transcript),
               caller_phone  = COALESCE($3, caller_phone),
               caller_name   = COALESCE($4, caller_name),
               received_at   = COALESCE($5, received_at)
         WHERE id = $6`,
        [recording_url, transcript, caller_phone, caller_name, received_at, id]
      );
      return { id, created: false };
    }
  }

  const info = await db.query(
    `INSERT INTO calls
       (firm_id, source, external_call_id, recording_url, transcript, caller_phone, caller_name, received_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [firm_id, source, external_call_id, recording_url, transcript, caller_phone, caller_name, received_at]
  );
  return { id: info.rows[0].id, created: true };
}

export async function setTranscript(db, callId, transcript) {
  await db.query("UPDATE calls SET transcript = $1 WHERE id = $2", [transcript, callId]);
}

export async function getUnscoredCalls(db, firmId = null) {
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
    const r = await db.query(`${base} AND c.firm_id = $1 ORDER BY c.created_at, c.id`, [firmId]);
    return r.rows;
  }
  const r = await db.query(`${base} ORDER BY c.created_at, c.id`);
  return r.rows;
}

export async function insertFlag(db, flag) {
  const {
    call_id,
    firm_id,
    qualification_score = null,
    is_leaked_signable = false,
    reason = null,
    case_type = null,
  } = flag;
  const info = await db.query(
    `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason, case_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [call_id, firm_id, qualification_score, Boolean(is_leaked_signable), reason, case_type ?? null]
  );
  return info.rows[0].id;
}

export async function getFirm(db, firmId) {
  const r = await db.query("SELECT * FROM firms WHERE id = $1", [firmId]);
  return r.rows[0];
}

export async function createConversation(db, conv) {
  const {
    flag_id,
    firm_id,
    caller_phone,
    status = "pending_approval",
    consent_basis,
  } = conv;
  const info = await db.query(
    `INSERT INTO conversations (flag_id, firm_id, caller_phone, status, consent_basis)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [flag_id, firm_id, caller_phone, status, consent_basis]
  );
  return info.rows[0].id;
}

export async function createDraftMessage(db, msg) {
  const { conversation_id, body } = msg;
  const info = await db.query(
    `INSERT INTO messages (conversation_id, direction, body, status, approved_by, sent_at)
     VALUES ($1, 'outbound', $2, 'drafted', NULL, NULL) RETURNING id`,
    [conversation_id, body]
  );
  return info.rows[0].id;
}

// --- Send layer: approval queue + sender + inbound ---------------------------

export async function getMessage(db, id) {
  const r = await db.query("SELECT * FROM messages WHERE id = $1", [id]);
  return r.rows[0];
}

export async function getDraftedMessages(db, firmId = null) {
  const base = `
    SELECT m.*, cv.firm_id, cv.caller_phone, c.caller_name
      FROM messages m
      JOIN conversations cv ON cv.id = m.conversation_id
      LEFT JOIN flags f ON f.id = cv.flag_id
      LEFT JOIN calls c ON c.id = f.call_id
     WHERE m.direction = 'outbound' AND m.status = 'drafted'`;
  if (firmId != null) {
    const r = await db.query(`${base} AND cv.firm_id = $1 ORDER BY m.created_at, m.id`, [firmId]);
    return r.rows;
  }
  const r = await db.query(`${base} ORDER BY m.created_at, m.id`);
  return r.rows;
}

export async function getApprovedMessages(db, firmId = null) {
  const base = `
    SELECT m.* FROM messages m
      JOIN conversations cv ON cv.id = m.conversation_id
     WHERE m.direction = 'outbound' AND m.status = 'approved'`;
  if (firmId != null) {
    const r = await db.query(`${base} AND cv.firm_id = $1 ORDER BY m.created_at, m.id`, [firmId]);
    return r.rows;
  }
  const r = await db.query(`${base} ORDER BY m.created_at, m.id`);
  return r.rows;
}

export async function approveMessage(db, id, approvedBy) {
  await db.query(
    `UPDATE messages SET status = 'approved', approved_by = $1
       WHERE id = $2 AND status = 'drafted'`,
    [approvedBy ?? "operator", id]
  );
}

// Postgres has a native 'rejected' status, so use it (cleaner than 'failed').
export async function rejectMessage(db, id) {
  await db.query(
    `UPDATE messages SET status = 'rejected' WHERE id = $1 AND status = 'drafted'`,
    [id]
  );
}

export async function editDraftMessage(db, id, body) {
  await db.query(
    `UPDATE messages SET body = $1 WHERE id = $2 AND status = 'drafted'`,
    [body, id]
  );
}

export async function markMessageSent(db, id, sentAt) {
  await db.query(`UPDATE messages SET status = 'sent', sent_at = $1 WHERE id = $2`, [sentAt, id]);
}

export async function markMessageFailed(db, id) {
  await db.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [id]);
}

export async function getConversation(db, id) {
  const r = await db.query("SELECT * FROM conversations WHERE id = $1", [id]);
  return r.rows[0];
}

export async function findConversationByPhone(db, firmId, phone) {
  const r = await db.query(
    `SELECT * FROM conversations
       WHERE firm_id = $1 AND caller_phone = $2
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    [firmId, phone]
  );
  return r.rows[0];
}

export async function getConversationMessages(db, convId) {
  const r = await db.query(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at, id",
    [convId]
  );
  return r.rows;
}

export async function getCallerNameForConversation(db, convId) {
  const r = await db.query(
    `SELECT c.caller_name
       FROM conversations cv
       JOIN flags f ON f.id = cv.flag_id
       JOIN calls c ON c.id = f.call_id
      WHERE cv.id = $1`,
    [convId]
  );
  return r.rows[0]?.caller_name ?? null;
}

export async function setConversationOptedOut(db, convId, now) {
  await db.query(
    `UPDATE conversations SET status = 'opted_out', updated_at = $1 WHERE id = $2`,
    [now, convId]
  );
}

export async function addInboundMessage(db, { conversation_id, body }) {
  const info = await db.query(
    `INSERT INTO messages (conversation_id, direction, body, status, approved_by, sent_at)
     VALUES ($1, 'inbound', $2, 'received', NULL, NULL) RETURNING id`,
    [conversation_id, body]
  );
  return info.rows[0].id;
}

// Per-firm CallRail signing secret (supabase migration 0034). Pass null to
// clear (falls back to the shared env secret). Returns true when a row updated.
export async function setFirmCallRailSecret(db, firmId, secret) {
  // Encrypt at rest — the signing key can forge valid webhook signatures, so it
  // must never be stored as plaintext where a DB dump would expose it.
  const stored = encodeCallRailSecret(secret);
  const r = await db.query(
    "UPDATE firms SET callrail_webhook_secret = $1 WHERE id = $2",
    [stored, firmId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function setFirmKillSwitch(db, firmId, on) {
  if (firmId == null) {
    await db.query("UPDATE firms SET kill_switch = $1", [Boolean(on)]);
  } else {
    await db.query("UPDATE firms SET kill_switch = $1 WHERE id = $2", [Boolean(on), firmId]);
  }
}

export async function setConversationStatus(db, id, status, now) {
  await db.query(
    `UPDATE conversations SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, now ?? new Date().toISOString(), id]
  );
}

// --- E-sign / callback handoffs ----------------------------------------------

export async function createHandoff(db, handoff) {
  const {
    conversation_id,
    firm_id,
    kind,
    provider = null,
    signature_request_id = null,
    sign_url = null,
    embedded = false,
    callback_requested_at = null,
    status = "pending",
  } = handoff;
  const info = await db.query(
    `INSERT INTO handoffs
       (conversation_id, firm_id, kind, provider, signature_request_id,
        sign_url, embedded, callback_requested_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [conversation_id, firm_id, kind, provider, signature_request_id,
     sign_url, Boolean(embedded), callback_requested_at, status]
  );
  return info.rows[0].id;
}

export async function getHandoff(db, id) {
  const r = await db.query("SELECT * FROM handoffs WHERE id = $1", [id]);
  return r.rows[0];
}

export async function findHandoffBySignatureRequest(db, signatureRequestId) {
  const r = await db.query(
    "SELECT * FROM handoffs WHERE signature_request_id = $1",
    [signatureRequestId]
  );
  return r.rows[0];
}

export async function setHandoffStatus(db, id, status, now) {
  await db.query(
    `UPDATE handoffs SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, now ?? new Date().toISOString(), id]
  );
}

// --- Outcomes + recoveries (reconciliation) ----------------------------------

export async function createOutcome(db, outcome) {
  const { conversation_id, result, recovered_fee_estimate = null, noted_at } = outcome;
  const info = noted_at
    ? await db.query(
        `INSERT INTO outcomes (conversation_id, result, recovered_fee_estimate, noted_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [conversation_id, result, recovered_fee_estimate, noted_at]
      )
    : await db.query(
        `INSERT INTO outcomes (conversation_id, result, recovered_fee_estimate)
         VALUES ($1, $2, $3) RETURNING id`,
        [conversation_id, result, recovered_fee_estimate]
      );
  return info.rows[0].id;
}

export async function createRecovery(db, recovery) {
  const { firm_id, conversation_id, signed = true, fee_amount = 0, week_of } = recovery;
  const info = await db.query(
    `INSERT INTO recoveries (firm_id, conversation_id, signed, fee_amount, week_of)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [firm_id, conversation_id, Boolean(signed), fee_amount ?? 0, week_of]
  );
  return info.rows[0].id;
}

export async function getOutcomesForConversation(db, conversationId) {
  const r = await db.query(
    "SELECT * FROM outcomes WHERE conversation_id = $1 ORDER BY noted_at, id",
    [conversationId]
  );
  return r.rows;
}

export async function getRecoveriesForConversation(db, conversationId) {
  const r = await db.query(
    "SELECT * FROM recoveries WHERE conversation_id = $1 ORDER BY created_at, id",
    [conversationId]
  );
  return r.rows;
}

// --- Weekly reconciliation queries -------------------------------------------

export async function countFlaggedInWeek(db, firmId, startIso, endIso) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM flags
      WHERE firm_id = $1 AND is_leaked_signable = true
        AND created_at >= $2 AND created_at < $3`,
    [firmId, startIso, endIso]
  );
  return Number(r.rows[0].n);
}

export async function countConversationsInWeek(db, firmId, startIso, endIso) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM conversations
      WHERE firm_id = $1 AND created_at >= $2 AND created_at < $3`,
    [firmId, startIso, endIso]
  );
  return Number(r.rows[0].n);
}

export async function countRepliedInWeek(db, firmId, startIso, endIso) {
  const r = await db.query(
    `SELECT COUNT(DISTINCT m.conversation_id) AS n
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
      WHERE c.firm_id = $1 AND m.direction = 'inbound'
        AND m.created_at >= $2 AND m.created_at < $3`,
    [firmId, startIso, endIso]
  );
  return Number(r.rows[0].n);
}

export async function getSignedRecoveries(db, firmId, weekOf) {
  const r = await db.query(
    `SELECT r.conversation_id, r.fee_amount,
            cl.caller_name AS name, f.reason AS case_type
       FROM recoveries r
       LEFT JOIN conversations cv ON cv.id = r.conversation_id
       LEFT JOIN flags f ON f.id = cv.flag_id
       LEFT JOIN calls cl ON cl.id = f.call_id
      WHERE r.firm_id = $1 AND r.signed = true AND r.week_of = $2
      ORDER BY r.fee_amount DESC, r.id`,
    [firmId, weekOf]
  );
  return r.rows;
}

export async function sumRecoveredMonthToDate(db, firmId, monthStartDate, throughWeekOf) {
  const r = await db.query(
    `SELECT COALESCE(SUM(fee_amount), 0) AS total
       FROM recoveries
      WHERE firm_id = $1 AND signed = true
        AND week_of >= $2 AND week_of <= $3`,
    [firmId, monthStartDate, throughWeekOf]
  );
  return Number(r.rows[0].total);
}

// --- Demo Mode (public, no-auth, hard-isolated from the firm pipeline) --------

export async function createDemoCall(db, { client_ip = null, filename = null, public_token = null } = {}) {
  const info = await db.query(
    `INSERT INTO demo_calls (client_ip, filename, public_token) VALUES ($1, $2, $3) RETURNING id`,
    [client_ip, filename, public_token]
  );
  return { id: info.rows[0].id, token: public_token };
}

export async function getDemoCall(db, id) {
  const r = await db.query("SELECT * FROM demo_calls WHERE id = $1", [id]);
  return r.rows[0];
}

export async function getDemoCallByToken(db, token) {
  const r = await db.query("SELECT * FROM demo_calls WHERE public_token = $1", [token]);
  return r.rows[0];
}

export async function setDemoCallStatus(db, id, status, now) {
  await db.query(
    `UPDATE demo_calls SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, now ?? new Date().toISOString(), id]
  );
}

export async function setDemoCallTranscript(db, id, transcript, now) {
  await db.query(
    `UPDATE demo_calls SET transcript = $1, updated_at = $2 WHERE id = $3`,
    [transcript, now ?? new Date().toISOString(), id]
  );
}

export async function setDemoCallResult(db, id, resultJson, now) {
  await db.query(
    `UPDATE demo_calls SET result_json = $1, status = 'done', updated_at = $2 WHERE id = $3`,
    [resultJson, now ?? new Date().toISOString(), id]
  );
}

export async function setDemoCallError(db, id, error, now) {
  await db.query(
    `UPDATE demo_calls SET error = $1, status = 'error', updated_at = $2 WHERE id = $3`,
    [String(error ?? "unknown error"), now ?? new Date().toISOString(), id]
  );
}

export async function markDemoAudioDeleted(db, id, now) {
  await db.query(
    `UPDATE demo_calls SET audio_deleted = true, updated_at = $1 WHERE id = $2`,
    [now ?? new Date().toISOString(), id]
  );
}

export async function countRecentDemoUploadsByIp(db, ip, sinceIso) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM demo_calls WHERE client_ip = $1 AND created_at >= $2`,
    [ip, sinceIso]
  );
  return Number(r.rows[0].n);
}

export async function countActiveDemoUploadsByIp(db, ip) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM demo_calls
      WHERE client_ip = $1 AND status IN ('queued','transcribing','scoring')`,
    [ip]
  );
  return Number(r.rows[0].n);
}

export async function purgeExpiredDemoCalls(db, beforeIso) {
  const r = await db.query(
    `UPDATE demo_calls
        SET transcript = NULL, result_json = NULL, status = 'done'
      WHERE created_at < $1 AND (transcript IS NOT NULL OR result_json IS NOT NULL)`,
    [beforeIso]
  );
  return r.rowCount ?? 0;
}

export async function createDemoLead(db, { demo_call_id = null, email }) {
  const info = await db.query(
    `INSERT INTO demo_leads (demo_call_id, email) VALUES ($1, $2) RETURNING id`,
    [demo_call_id, email]
  );
  return info.rows[0].id;
}

// --- Firm onboarding ---------------------------------------------------------
// kill_switch defaults to true (ON): a new firm can send nothing until cleared.

export async function createFirm(db, firm) {
  const {
    name,
    avg_case_fee = 0,
    timezone = "America/Los_Angeles",
    subscription_price = null,
  } = firm;
  const info = await db.query(
    `INSERT INTO firms (name, avg_case_fee, timezone, subscription_price)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, avg_case_fee, timezone, subscription_price]
  );
  return info.rows[0].id;
}

export async function saveTemplateVersion(db, { firm_id, pack, approved_by = null }) {
  const r = await db.query(
    "SELECT MAX(version) AS v FROM template_versions WHERE firm_id = $1",
    [firm_id]
  );
  const version = (Number(r.rows[0]?.v) || 0) + 1;
  const info = await db.query(
    `INSERT INTO template_versions (firm_id, version, pack_json, approved_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [firm_id, version, JSON.stringify(pack), approved_by]
  );
  return { id: info.rows[0].id, version };
}

export async function getLatestTemplateVersion(db, firmId) {
  const r = await db.query(
    `SELECT * FROM template_versions
      WHERE firm_id = $1 ORDER BY version DESC LIMIT 1`,
    [firmId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return { ...row, pack: JSON.parse(row.pack_json) };
}

export async function listTemplateVersions(db, firmId) {
  const r = await db.query(
    `SELECT id, firm_id, version, approved_by, created_at
       FROM template_versions WHERE firm_id = $1 ORDER BY version DESC`,
    [firmId]
  );
  return r.rows;
}

// All firms, for the operator status page + per-firm kill-switch controls.
export async function listFirms(db) {
  const r = await db.query(
    `SELECT id, name, kill_switch, autonomy_level, timezone
       FROM firms ORDER BY id`
  );
  return r.rows;
}

// --- Operator error log (migration 0007) -------------------------------------

export async function logError(db, { source, message, context = null, firm_id = null }) {
  const info = await db.query(
    `INSERT INTO errors (source, message, context, firm_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      String(source ?? "unknown"),
      String(message ?? ""),
      context == null ? null : typeof context === "string" ? context : JSON.stringify(context),
      firm_id,
    ]
  );
  return info.rows[0].id;
}

export async function getRecentErrors(db, limit = 20) {
  const r = await db.query(
    `SELECT * FROM errors ORDER BY id DESC LIMIT $1`,
    [Math.max(1, Math.floor(limit))]
  );
  return r.rows;
}

export async function countRecentErrors(db, sinceIso) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM errors WHERE created_at >= $1`,
    [sinceIso]
  );
  return Number(r.rows[0].n);
}

export async function markErrorsAlerted(db, ids = []) {
  if (!ids.length) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const r = await db.query(
    `UPDATE errors SET alerted = true WHERE id IN (${placeholders})`,
    ids
  );
  return r.rowCount ?? 0;
}

export async function getUnalertedErrors(db, sinceIso) {
  const r = await db.query(
    `SELECT * FROM errors WHERE alerted = false AND created_at >= $1 ORDER BY id`,
    [sinceIso]
  );
  return r.rows;
}

// --- Per-firm feature flags (migration 0008) ---------------------------------

// All explicitly-set flags for a firm as { feature: boolean }. Absent = OFF.
export async function getFirmFeatures(db, firmId) {
  const r = await db.query(
    "SELECT feature, enabled FROM firm_features WHERE firm_id = $1",
    [firmId]
  );
  const out = {};
  for (const row of r.rows) out[row.feature] = Boolean(row.enabled);
  return out;
}

// Is one feature enabled for a firm? DEFAULT OFF when the row is absent.
export async function isFeatureEnabled(db, firmId, feature) {
  const r = await db.query(
    "SELECT enabled FROM firm_features WHERE firm_id = $1 AND feature = $2",
    [firmId, feature]
  );
  return r.rows[0] ? Boolean(r.rows[0].enabled) : false;
}

// Turn a feature on/off for a firm (idempotent upsert on (firm_id, feature)).
export async function setFirmFeature(db, firmId, feature, enabled, now) {
  await db.query(
    `INSERT INTO firm_features (firm_id, feature, enabled, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firm_id, feature)
     DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    [firmId, feature, Boolean(enabled), now ?? new Date().toISOString()]
  );
}

// --- Leak Audit sessions (migration 0009) ------------------------------------

export async function createAuditSession(
  db,
  { token, visitor_fingerprint = null, monthly_call_volume = null, expires_at }
) {
  const r = await db.query(
    `INSERT INTO audit_sessions (token, visitor_fingerprint, monthly_call_volume, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [token, visitor_fingerprint, monthly_call_volume, expires_at]
  );
  return r.rows[0].id;
}

export async function getAuditSessionByToken(db, token) {
  const r = await db.query("SELECT * FROM audit_sessions WHERE token = $1", [token]);
  return r.rows[0];
}

export async function updateAuditSession(db, id, patch = {}) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const k of ["email", "monthly_call_volume", "status"]) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = $${i++}`);
      vals.push(patch[k]);
    }
  }
  if (!sets.length) return;
  vals.push(id);
  await db.query(`UPDATE audit_sessions SET ${sets.join(", ")} WHERE id = $${i}`, vals);
}

export async function attachDemoCallToSession(db, sessionId, demoCallId) {
  await db.query(
    `INSERT INTO audit_session_calls (session_id, demo_call_id)
     VALUES ($1, $2) ON CONFLICT (session_id, demo_call_id) DO NOTHING`,
    [sessionId, demoCallId]
  );
}

export async function getAuditSessionCalls(db, sessionId) {
  const r = await db.query(
    `SELECT dc.* FROM audit_session_calls ac
       JOIN demo_calls dc ON dc.id = ac.demo_call_id
      WHERE ac.session_id = $1
      ORDER BY ac.id`,
    [sessionId]
  );
  return r.rows;
}

export async function countAuditSessionCalls(db, sessionId) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM audit_session_calls WHERE session_id = $1`,
    [sessionId]
  );
  return Number(r.rows[0].n);
}

export async function countRecentAuditSessionsByFingerprint(db, fingerprint, sinceIso) {
  const r = await db.query(
    `SELECT COUNT(*) AS n FROM audit_sessions
      WHERE visitor_fingerprint = $1 AND created_at >= $2`,
    [fingerprint, sinceIso]
  );
  return Number(r.rows[0].n);
}

export async function getRecentAuditSessionByFingerprint(db, fingerprint, nowIso) {
  const r = await db.query(
    `SELECT * FROM audit_sessions
      WHERE visitor_fingerprint = $1 AND expires_at > $2
      ORDER BY id DESC LIMIT 1`,
    [fingerprint, nowIso]
  );
  return r.rows[0];
}

export async function listRecentAuditSessions(db, limit = 50) {
  const r = await db.query(
    `SELECT s.*, (SELECT COUNT(*) FROM audit_session_calls c WHERE c.session_id = s.id) AS call_count
       FROM audit_sessions s
      ORDER BY s.created_at DESC
      LIMIT $1`,
    [Math.max(1, Math.floor(limit))]
  );
  return r.rows;
}

export async function purgeExpiredAuditSessions(db, nowIso) {
  const r = await db.query(
    `UPDATE audit_sessions SET status = 'expired'
      WHERE status <> 'expired' AND expires_at < $1`,
    [nowIso]
  );
  return r.rowCount ?? 0;
}

// --- Per-recovered-case billing (migration 0010) -----------------------------
// FLAT fee per case; NONE of these read a recovered-fee value (Rule 5.4).

export async function listBillingPlans(db) {
  const r = await db.query("SELECT * FROM billing_plans ORDER BY base_monthly_cents");
  return r.rows;
}
export async function getBillingPlan(db, id) {
  const r = await db.query("SELECT * FROM billing_plans WHERE id = $1", [id]);
  return r.rows[0];
}
export async function getBillingPlanByName(db, name) {
  const r = await db.query("SELECT * FROM billing_plans WHERE name = $1", [name]);
  return r.rows[0];
}

export async function getFirmBilling(db, firmId) {
  const r = await db.query(
    `SELECT fb.*, p.name AS plan_name, p.base_monthly_cents, p.per_case_fee_cents,
            p.per_case_fee_by_type, p.monthly_case_fee_cap_cents, p.monthly_call_cap
       FROM firm_billing fb JOIN billing_plans p ON p.id = fb.plan_id
      WHERE fb.firm_id = $1`,
    [firmId]
  );
  return r.rows[0];
}

// Count analyzed (received) calls for a firm in a 'YYYY-MM' period. Used only to
// flag "over your tier volume — consider upgrading" in the operator console; it
// is NEVER an input to any charge.
export async function countCallsInPeriod(db, firmId, period) {
  const r = await db.query(
    "SELECT COUNT(*)::int AS n FROM calls WHERE firm_id = $1 AND to_char(received_at, 'YYYY-MM') = $2",
    [firmId, period]
  );
  return Number(r.rows[0]?.n ?? 0);
}

export async function upsertFirmBilling(db, cfg) {
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
  await db.query(
    `INSERT INTO firm_billing
       (firm_id, plan_id, status, billing_anchor_day, stripe_customer_id,
        stripe_subscription_id, guarantee_type, guarantee_threshold_cents, guarantee_deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (firm_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       status = excluded.status,
       billing_anchor_day = excluded.billing_anchor_day,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       guarantee_type = excluded.guarantee_type,
       guarantee_threshold_cents = excluded.guarantee_threshold_cents,
       guarantee_deadline = excluded.guarantee_deadline`,
    [firm_id, plan_id, status, billing_anchor_day, stripe_customer_id,
     stripe_subscription_id, guarantee_type, guarantee_threshold_cents, guarantee_deadline]
  );
  return getFirmBilling(db, firm_id);
}

// Set ONLY the lifecycle status on a firm's billing row. Returns the row.
export async function setFirmBillingStatus(db, firmId, status) {
  await db.query(`UPDATE firm_billing SET status = $1 WHERE firm_id = $2`, [status, firmId]);
  return getFirmBilling(db, firmId);
}

// Find a firm's billing row by its Stripe subscription id. Returns row or undefined.
export async function getFirmBillingBySubscription(db, subscriptionId) {
  const r = await db.query(
    `SELECT fb.*, p.name AS plan_name, p.base_monthly_cents
       FROM firm_billing fb JOIN billing_plans p ON p.id = fb.plan_id
      WHERE fb.stripe_subscription_id = $1`,
    [subscriptionId]
  );
  return r.rows[0];
}

// Find a firm by exact name. Returns row or undefined.
export async function getFirmByName(db, name) {
  const r = await db.query("SELECT * FROM firms WHERE name = $1", [name]);
  return r.rows[0];
}

export async function accrueBillableEvent(db, ev) {
  const { firm_id, outcome_id, case_type = null, per_case_fee_cents_applied, period } = ev;
  const r = await db.query(
    `INSERT INTO billable_events
       (firm_id, outcome_id, case_type, per_case_fee_cents_applied, period)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (outcome_id) DO NOTHING
     RETURNING id`,
    [firm_id, outcome_id, case_type, per_case_fee_cents_applied, period]
  );
  if (r.rows[0]) return { id: r.rows[0].id, created: true };
  const existing = await db.query("SELECT id FROM billable_events WHERE outcome_id = $1", [outcome_id]);
  return { id: existing.rows[0] ? existing.rows[0].id : null, created: false };
}

export async function getBillableEvents(db, firmId, { period = null, status = null } = {}) {
  let sql = "SELECT * FROM billable_events WHERE firm_id = $1";
  const args = [firmId];
  if (period) { args.push(period); sql += ` AND period = $${args.length}`; }
  if (status) { args.push(status); sql += ` AND status = $${args.length}`; }
  sql += " ORDER BY created_at";
  const r = await db.query(sql, args);
  return r.rows;
}

export async function getAccruedBillableEvents(db, firmId, period) {
  const r = await db.query(
    "SELECT * FROM billable_events WHERE firm_id = $1 AND period = $2 AND status = 'accrued' ORDER BY created_at",
    [firmId, period]
  );
  return r.rows;
}

export async function setBillableEventStatus(db, id, status, { dispute_reason = null, invoice_id = null } = {}) {
  await db.query(
    `UPDATE billable_events
        SET status = $1, dispute_reason = $2, invoice_id = COALESCE($3, invoice_id)
      WHERE id = $4`,
    [status, dispute_reason, invoice_id, id]
  );
}

export async function markBillableEventsInvoiced(db, ids = [], invoiceId) {
  if (!ids.length) return 0;
  const ph = ids.map((_, i) => `$${i + 2}`).join(",");
  const r = await db.query(
    `UPDATE billable_events SET status = 'invoiced', invoice_id = $1
      WHERE id IN (${ph}) AND status = 'accrued'`,
    [invoiceId, ...ids]
  );
  return r.rowCount ?? 0;
}

export async function createInvoice(db, { firm_id, period, total_cents = 0, status = "open" }) {
  const r = await db.query(
    "INSERT INTO invoices (firm_id, period, total_cents, status) VALUES ($1,$2,$3,$4) RETURNING id",
    [firm_id, period, total_cents, status]
  );
  return r.rows[0].id;
}

// P0-4b twin: live (non-void) invoice for a firm+period, if any.
export async function getInvoiceByFirmPeriod(db, firmId, period) {
  const r = await db.query(
    "SELECT * FROM invoices WHERE firm_id = $1 AND period = $2 AND status <> 'void' ORDER BY created_at DESC LIMIT 1",
    [firmId, period]
  );
  return r.rows[0] ?? null;
}

export async function addInvoiceLine(db, line) {
  const { invoice_id, kind, description, amount_cents, outcome_id = null, snapshot = null } = line;
  const r = await db.query(
    `INSERT INTO invoice_lines (invoice_id, kind, description, amount_cents, outcome_id, snapshot)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [invoice_id, kind, description, amount_cents, outcome_id,
     snapshot == null ? null : typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot)]
  );
  return r.rows[0].id;
}

export async function setInvoiceTotal(db, id, totalCents, status = null) {
  if (status) {
    await db.query("UPDATE invoices SET total_cents = $1, status = $2 WHERE id = $3", [totalCents, status, id]);
  } else {
    await db.query("UPDATE invoices SET total_cents = $1 WHERE id = $2", [totalCents, id]);
  }
}

export async function voidInvoice(db, id, reason, now) {
  await db.query(
    "UPDATE invoices SET status = 'void', void_reason = $1, voided_at = $2 WHERE id = $3",
    [reason ?? null, now ?? new Date().toISOString(), id]
  );
}

export async function getInvoice(db, id) {
  const r = await db.query("SELECT * FROM invoices WHERE id = $1", [id]);
  return r.rows[0];
}
export async function getInvoiceLines(db, invoiceId) {
  const r = await db.query("SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY created_at", [invoiceId]);
  return r.rows;
}
export async function listInvoices(db, firmId) {
  const r = await db.query("SELECT * FROM invoices WHERE firm_id = $1 ORDER BY created_at DESC", [firmId]);
  return r.rows;
}

export async function appendStripeSimLog(db, { firm_id = null, action, payload = null }) {
  const r = await db.query(
    "INSERT INTO stripe_sim_log (firm_id, action, payload) VALUES ($1,$2,$3) RETURNING id",
    [firm_id, action, payload == null ? null : typeof payload === "string" ? payload : JSON.stringify(payload)]
  );
  return r.rows[0].id;
}
export async function listStripeSimLog(db, { firm_id = null, limit = 50 } = {}) {
  if (firm_id != null) {
    const r = await db.query(
      "SELECT * FROM stripe_sim_log WHERE firm_id = $1 ORDER BY created_at DESC LIMIT $2",
      [firm_id, Math.max(1, Math.floor(limit))]
    );
    return r.rows;
  }
  const r = await db.query(
    "SELECT * FROM stripe_sim_log ORDER BY created_at DESC LIMIT $1",
    [Math.max(1, Math.floor(limit))]
  );
  return r.rows;
}
export async function countStripeSimLog(db) {
  const r = await db.query("SELECT COUNT(*) AS n FROM stripe_sim_log");
  return Number(r.rows[0].n);
}

export async function countLeakedFlags(db, firmId, sinceIso = null) {
  if (sinceIso) {
    const r = await db.query(
      "SELECT COUNT(*) AS n FROM flags WHERE firm_id = $1 AND is_leaked_signable = true AND created_at >= $2",
      [firmId, sinceIso]
    );
    return Number(r.rows[0].n);
  }
  const r = await db.query(
    "SELECT COUNT(*) AS n FROM flags WHERE firm_id = $1 AND is_leaked_signable = true",
    [firmId]
  );
  return Number(r.rows[0].n);
}

// --- Peer benchmarking (migration 0011) --------------------------------------

export async function setBenchmarkConsent(db, firmId, on) {
  await db.query("UPDATE firms SET benchmark_data_sharing = $1 WHERE id = $2", [Boolean(on), firmId]);
}
export async function countConsentingFirms(db) {
  const r = await db.query("SELECT COUNT(*) AS n FROM firms WHERE benchmark_data_sharing = true");
  return Number(r.rows[0].n);
}
export async function getConsentingFirmIds(db) {
  const r = await db.query(
    "SELECT id FROM firms WHERE benchmark_data_sharing = true ORDER BY id"
  );
  return r.rows.map((row) => row.id);
}

export async function getBenchmarkRows(db, firmIds = []) {
  if (!firmIds.length) return [];
  const ph = firmIds.map((_, i) => `$${i + 1}`).join(",");
  const r = await db.query(
    `SELECT f.qualification_score AS score,
            (CASE WHEN f.is_leaked_signable THEN 1 ELSE 0 END) AS leaked,
            (CASE WHEN EXISTS (
              SELECT 1 FROM conversations c JOIN outcomes o ON o.conversation_id = c.id
               WHERE c.flag_id = f.id AND o.result = 'signed'
            ) THEN 1 ELSE 0 END) AS signed
       FROM flags f
      WHERE f.firm_id IN (${ph})`,
    firmIds
  );
  return r.rows;
}

export async function insertBenchmarkSnapshot(db, s) {
  const r = await db.query(
    `INSERT INTO benchmark_snapshots
       (contributor_count, sample_size, median_handling_score, q1_handling_score,
        q3_handling_score, leak_rate, sign_rate_by_band)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
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
          : JSON.stringify(s.sign_rate_by_band),
    ]
  );
  return r.rows[0].id;
}

export async function getLatestBenchmarkSnapshot(db) {
  const r = await db.query("SELECT * FROM benchmark_snapshots ORDER BY created_at DESC LIMIT 1");
  return r.rows[0];
}

// --- CRM / webhook integrations (migration 0012) -----------------------------

export async function upsertFirmIntegration(db, cfg) {
  const {
    firm_id,
    provider,
    credentials_encrypted = null,
    field_map = null,
    webhook_url = null,
    webhook_secret = null,
    enabled = false,
  } = cfg;
  const fm =
    field_map == null ? null : typeof field_map === "string" ? field_map : JSON.stringify(field_map);
  await db.query(
    `INSERT INTO firm_integrations
       (firm_id, provider, credentials_encrypted, field_map, webhook_url, webhook_secret, enabled, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (firm_id, provider) DO UPDATE SET
       credentials_encrypted = excluded.credentials_encrypted,
       field_map = excluded.field_map,
       webhook_url = excluded.webhook_url,
       webhook_secret = excluded.webhook_secret,
       enabled = excluded.enabled,
       updated_at = excluded.updated_at`,
    [firm_id, provider, credentials_encrypted, fm, webhook_url, webhook_secret, Boolean(enabled),
     new Date().toISOString()]
  );
  return getFirmIntegration(db, firm_id, provider);
}

export async function getFirmIntegration(db, firmId, provider) {
  const r = await db.query(
    "SELECT * FROM firm_integrations WHERE firm_id = $1 AND provider = $2",
    [firmId, provider]
  );
  return r.rows[0];
}

export async function listFirmIntegrations(db, firmId) {
  const r = await db.query(
    "SELECT * FROM firm_integrations WHERE firm_id = $1 ORDER BY provider",
    [firmId]
  );
  return r.rows;
}

// ── Recovery-desk additive layer (migration 0014) — Postgres twins. ───────────

export async function setCallStatus(db, callId, status, reason = null) {
  await db.query("UPDATE calls SET status = $1, status_reason = $2 WHERE id = $3", [status, reason, callId]);
}

export async function getCallReconciliation(db, firmId) {
  const r = await db.query("SELECT * FROM v_call_reconciliation WHERE firm_id = $1", [firmId]);
  return r.rows[0] ?? { firm_id: firmId, received: 0, processed: 0, excluded: 0, failed: 0 };
}

// Coordinator's "wins this week" — callback outcomes on flag_status since sinceIso.
export async function getCallbackWins(db, firmId, sinceIso) {
  const r = await db.query(
    `SELECT
       SUM(CASE WHEN fs.status IN ('reached_out','back_in_touch','signed','didnt_sign') THEN 1 ELSE 0 END) AS worked,
       SUM(CASE WHEN fs.status IN ('back_in_touch','signed') THEN 1 ELSE 0 END) AS reached,
       SUM(CASE WHEN fs.status = 'signed' THEN 1 ELSE 0 END) AS signed
     FROM flag_status fs
     JOIN flags f ON f.id = fs.flag_id
    WHERE f.firm_id = $1 AND fs.updated_at >= $2`,
    [firmId, sinceIso]
  );
  const row = r.rows[0] ?? {};
  return {
    worked: Number(row.worked ?? 0),
    reached: Number(row.reached ?? 0),
    signed: Number(row.signed ?? 0),
  };
}

export async function insertTranscriptCitation(db, c) {
  const { flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score = null, status = "needs_review" } = c;
  const r = await db.query(
    `INSERT INTO transcript_citations
       (flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [flag_id, fact_kind, start_ms, end_ms, verbatim_snippet, validation_score, status]
  );
  return r.rows[0].id;
}

export async function getTranscriptCitations(db, flagId, { status = null } = {}) {
  const args = [flagId];
  let sql = "SELECT * FROM transcript_citations WHERE flag_id = $1";
  if (status) { args.push(status); sql += ` AND status = $${args.length}`; }
  const r = await db.query(sql + " ORDER BY start_ms", args);
  return r.rows;
}

export async function setFlagConfidence(db, { flag_id, confidence_tier, rubric_version }) {
  await db.query(
    `INSERT INTO flag_confidence (flag_id, confidence_tier, rubric_version)
     VALUES ($1,$2,$3)
     ON CONFLICT (flag_id) DO UPDATE SET
       confidence_tier = excluded.confidence_tier, rubric_version = excluded.rubric_version`,
    [flag_id, confidence_tier, rubric_version]
  );
}

export async function getFlagConfidence(db, flagId) {
  const r = await db.query("SELECT * FROM flag_confidence WHERE flag_id = $1", [flagId]);
  return r.rows[0];
}

export async function insertAnalysisVersion(db, { flag_id, model_version, prompt_version, rubric_version }) {
  const r = await db.query(
    `INSERT INTO analysis_versions (flag_id, model_version, prompt_version, rubric_version)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [flag_id, model_version, prompt_version, rubric_version]
  );
  return r.rows[0].id;
}

export async function logArtifactAccess(db, { firm_id, actor, artifact_type, artifact_id, action }) {
  await db.query(
    `INSERT INTO artifact_access_log (firm_id, actor, artifact_type, artifact_id, action)
     VALUES ($1,$2,$3,$4,$5)`,
    [firm_id, actor, artifact_type, String(artifact_id), action]
  );
}

export async function insertCitationFailure(db, { flag_id = null, snippet, nearest_text = null, score = null }) {
  const r = await db.query(
    "INSERT INTO citation_failures (flag_id, snippet, nearest_text, score) VALUES ($1,$2,$3,$4) RETURNING id",
    [flag_id, snippet, nearest_text, score]
  );
  return r.rows[0].id;
}

export async function listLeakedFlags(db, firmId) {
  const r = await db.query(
    `SELECT f.id, f.call_id, f.qualification_score, f.reason, f.case_type,
            c.caller_name, c.caller_phone, c.received_at,
            fc.confidence_tier, fs.status AS save_status,
            COALESCE(fs.attempts, 0) AS attempts, fs.last_attempt_at,
            (SELECT COUNT(*) FROM transcript_citations tc WHERE tc.flag_id = f.id) AS citation_count,
            -- One VALIDATED verbatim line for the queue card (no citation, no claim §IV):
            -- only status='passed' snippets are confirmed against the transcript; prefer the
            -- qualifying fact, then the earliest moment. NULL when nothing passed the guard.
            (SELECT tc.verbatim_snippet FROM transcript_citations tc
               WHERE tc.flag_id = f.id AND tc.status = 'passed'
               ORDER BY (tc.fact_kind = 'qualifying_fact') DESC, tc.start_ms
               LIMIT 1) AS evidence_quote
       FROM flags f
       JOIN calls c ON c.id = f.call_id
       LEFT JOIN flag_confidence fc ON fc.flag_id = f.id
       LEFT JOIN flag_status fs ON fs.flag_id = f.id
      WHERE f.firm_id = $1 AND f.is_leaked_signable = true
      ORDER BY
        -- Resolved cards (signed / passed / bad number) sink to the bottom so the
        -- top of the queue stays "today's list," not a growing graveyard.
        (CASE WHEN fs.status IN ('signed','didnt_sign','bad_number') THEN 1 ELSE 0 END),
        (CASE WHEN fc.confidence_tier = 'strong' THEN 0 ELSE 1 END),
        c.received_at DESC`,
    [firmId]
  );
  return r.rows;
}

// Upsert the workflow status beside a flag (sibling record; flags stays frozen).
// Returns the flag's firm_id so callers can enforce firm scoping.
// Forward progression of the callback workflow. A guarded (emailed-digest-link)
// write may only ADVANCE a case, never regress it — so a stale "We called them"
// link (reached_out) can't un-sign a case OR knock an already-"spoke to them"
// (back_in_touch) case back to "left a message".
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

export async function setFlagStatus(db, { flag_id, status, updated_by, firm_id = null, guardTerminal = false }) {
  const owner = await db.query("SELECT firm_id FROM flags WHERE id = $1", [flag_id]);
  if (!owner.rows[0]) return null;
  // Firm scoping is enforced HERE, before any write: a caller passing its own
  // firm_id can never touch another firm's queue.
  if (firm_id != null && String(owner.rows[0].firm_id) !== String(firm_id)) {
    return { ok: false, forbidden: true, firm_id: owner.rows[0].firm_id };
  }
  // guardTerminal (emailed digest link): only advance, never regress.
  if (guardTerminal) {
    const cur = await db.query("SELECT status FROM flag_status WHERE flag_id = $1", [flag_id]);
    const current = cur.rows[0]?.status ?? null;
    if (isRegression(current, status)) {
      return { ok: false, alreadyResolved: true, current };
    }
  }
  // Attempt counter (B-011): "left a message" / "spoke to them" each log one
  // real touch on the phone, so those writes increment attempts. Terminal
  // outcomes and undo don't count — the counter only grows, and only from
  // logged touches. It powers encouragement copy, never a score.
  const attemptInc = status === "reached_out" || status === "back_in_touch" ? 1 : 0;
  const upsert = await db.query(
    `INSERT INTO flag_status (flag_id, status, updated_by, updated_at, attempts, last_attempt_at)
     VALUES ($1, $2, $3, now(), $4, CASE WHEN $4 = 1 THEN now() END)
     ON CONFLICT (flag_id) DO UPDATE
       SET status = excluded.status, updated_by = excluded.updated_by, updated_at = now(),
           attempts = flag_status.attempts + $4,
           last_attempt_at = COALESCE(excluded.last_attempt_at, flag_status.last_attempt_at)
     RETURNING attempts`,
    [flag_id, status, updated_by ?? null, attemptInc]
  );
  return { ok: true, firm_id: owner.rows[0].firm_id, attempts: Number(upsert.rows[0]?.attempts ?? 0) };
}

export async function listNonAnalyzedCalls(db, firmId) {
  const r = await db.query(
    `SELECT id, received_at, status, status_reason
       FROM calls
      WHERE firm_id = $1 AND (status IS NULL OR status <> 'analyzed')
      ORDER BY id`,
    [firmId]
  );
  return r.rows;
}

// --- Per-call analysis (migration 0040) --------------------------------------
// Postgres twins of the SQLite call_analyses functions. Same shapes.

export async function upsertCallAnalysis(db, a) {
  await db.query(
    `INSERT INTO call_analyses (
        call_id, firm_id, overall_score, band, case_signability, lost_signable,
        revenue_at_risk_cents, case_type, retainer_asked, next_step_specificity,
        contact_info_captured, cat_qualification, cat_conversion, cat_connection,
        cat_risk_compliance, cat_process, summary, coaching_json, score_json,
        rep, source, model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     ON CONFLICT (call_id) DO UPDATE SET
        overall_score = excluded.overall_score, band = excluded.band,
        case_signability = excluded.case_signability, lost_signable = excluded.lost_signable,
        revenue_at_risk_cents = excluded.revenue_at_risk_cents, case_type = excluded.case_type,
        retainer_asked = excluded.retainer_asked, next_step_specificity = excluded.next_step_specificity,
        contact_info_captured = excluded.contact_info_captured,
        cat_qualification = excluded.cat_qualification, cat_conversion = excluded.cat_conversion,
        cat_connection = excluded.cat_connection, cat_risk_compliance = excluded.cat_risk_compliance,
        cat_process = excluded.cat_process, summary = excluded.summary,
        coaching_json = excluded.coaching_json, score_json = excluded.score_json,
        rep = excluded.rep, source = excluded.source, model_version = excluded.model_version`,
    [
      a.call_id, a.firm_id, a.overall_score ?? null, a.band ?? null,
      a.case_signability ?? null, Boolean(a.lost_signable),
      a.revenue_at_risk_cents ?? null, a.case_type ?? null,
      a.retainer_asked == null ? null : Boolean(a.retainer_asked),
      a.next_step_specificity ?? null, a.contact_info_captured ?? null,
      a.cat_qualification ?? null, a.cat_conversion ?? null, a.cat_connection ?? null,
      a.cat_risk_compliance ?? null, a.cat_process ?? null, a.summary ?? null,
      a.coaching_json ?? null, a.score_json ?? null, a.rep ?? null, a.source ?? null,
      a.model_version ?? null,
    ]
  );
  return a.call_id;
}

export async function getCallWithAnalysis(db, firmId, callId) {
  const r = await db.query(
    `SELECT c.id AS call_id, c.firm_id, c.received_at, c.status, c.status_reason,
            c.caller_name, c.caller_phone, c.source AS call_source, c.transcript,
            a.overall_score, a.band, a.case_signability, a.lost_signable,
            a.revenue_at_risk_cents, a.case_type, a.retainer_asked,
            a.next_step_specificity, a.contact_info_captured,
            a.cat_qualification, a.cat_conversion, a.cat_connection,
            a.cat_risk_compliance, a.cat_process, a.summary, a.coaching_json,
            a.rep, a.source, a.created_at AS analyzed_at,
            f.id AS flag_id, fs.status AS save_status
       FROM calls c
       LEFT JOIN call_analyses a ON a.call_id = c.id
       LEFT JOIN flags f ON f.call_id = c.id
       LEFT JOIN flag_status fs ON fs.flag_id = f.id
      WHERE c.firm_id = $1 AND c.id = $2
      LIMIT 1`,
    [firmId, callId]
  );
  return r.rows[0];
}

export async function listCallsWithAnalysis(db, firmId) {
  const r = await db.query(
    `SELECT c.id AS call_id, c.received_at, c.status, c.status_reason,
            c.caller_name, c.source AS call_source,
            a.overall_score, a.band, a.case_signability, a.lost_signable,
            a.revenue_at_risk_cents, a.case_type, a.retainer_asked,
            a.next_step_specificity, a.contact_info_captured,
            a.cat_qualification, a.cat_conversion, a.cat_connection,
            a.cat_risk_compliance, a.cat_process, a.summary, a.coaching_json,
            a.rep,
            f.id AS flag_id, f.is_leaked_signable, fs.status AS save_status
       FROM calls c
       LEFT JOIN call_analyses a ON a.call_id = c.id
       LEFT JOIN flags f ON f.call_id = c.id
       LEFT JOIN flag_status fs ON fs.flag_id = f.id
      WHERE c.firm_id = $1
      ORDER BY c.received_at DESC, c.id DESC`,
    [firmId]
  );
  return r.rows;
}

export async function getFeeValueRange(db, caseType, firmId = null) {
  if (firmId != null) {
    const firmRow = await db.query(
      "SELECT * FROM fee_value_ranges WHERE case_type = $1 AND firm_id = $2 ORDER BY updated_at DESC LIMIT 1",
      [caseType, firmId]
    );
    if (firmRow.rows[0]) return firmRow.rows[0];
  }
  const r = await db.query(
    "SELECT * FROM fee_value_ranges WHERE case_type = $1 AND firm_id IS NULL ORDER BY updated_at DESC LIMIT 1",
    [caseType]
  );
  return r.rows[0];
}

// ── Report review gate (migration 0016) — Postgres twins. ─────────────────────
export async function getReportStatus(db, sessionId) {
  const r = await db.query(
    "SELECT report_status, released_at, released_by FROM audit_sessions WHERE id = $1",
    [sessionId]
  );
  return r.rows[0] ?? null;
}

export async function setReportStatus(db, sessionId, status, { releasedBy = null, now = null } = {}) {
  if (status === "released") {
    await db.query(
      "UPDATE audit_sessions SET report_status = $1, released_at = $2, released_by = $3 WHERE id = $4",
      [status, now ?? new Date().toISOString(), releasedBy, sessionId]
    );
  } else {
    await db.query("UPDATE audit_sessions SET report_status = $1 WHERE id = $2", [status, sessionId]);
  }
}

export async function listReviewableSessions(db) {
  const r = await db.query(
    "SELECT id, token, email, report_status, created_at FROM audit_sessions WHERE report_status IN ('draft','analyst_review') ORDER BY created_at DESC LIMIT 100"
  );
  return r.rows;
}

// ── Report access events (migration 0017) — Postgres twins. ───────────────────
export async function logReportAccess(db, { token, event_type, viewer_fingerprint = null }) {
  await db.query(
    "INSERT INTO report_access_events (token, event_type, viewer_fingerprint) VALUES ($1, $2, $3)",
    [token, event_type, viewer_fingerprint]
  );
}

export async function countReportAccess(db, token) {
  const r = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE event_type = 'view')     AS views,
       COUNT(*) FILTER (WHERE event_type = 'download') AS downloads,
       COUNT(DISTINCT viewer_fingerprint)              AS distinct_viewers
     FROM report_access_events WHERE token = $1`,
    [token]
  );
  return r.rows[0] ?? { views: 0, downloads: 0, distinct_viewers: 0 };
}

// P0-2 — consent log (twin of ingest/db.mjs#createConsentEvent).
export async function createConsentEvent(db, { firm_id = null, conversation_id = null, basis, detail = null, actor = null }) {
  const r = await db.query(
    `INSERT INTO consent_events (firm_id, conversation_id, basis, detail, actor)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [firm_id, conversation_id, basis, detail, actor]
  );
  return r.rows[0]?.id ?? null;
}

// P0-4a — Stripe webhook idempotency (twin). Returns true when first seen.
export async function recordStripeEventProcessed(db, eventId, eventType = null) {
  const r = await db.query(
    `INSERT INTO processed_stripe_events (event_id, event_type)
     VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, eventType]
  );
  return (r.rowCount ?? 0) > 0;
}

// P0-3 / CLAUDE.md §(h): purge confidential content from REAL firm data past the
// retention window. Twin of ingest/db.mjs#purgeExpiredCalls. `purged_at` is added
// to messages by migration 0021. Idempotent (already-scrubbed rows skipped).
export async function purgeExpiredCalls(db, beforeIso) {
  const calls = await db.query(
    `UPDATE calls
        SET transcript = NULL, recording_url = NULL
      WHERE received_at < $1
        AND (transcript IS NOT NULL OR recording_url IS NOT NULL)`,
    [beforeIso]
  );
  const messages = await db.query(
    `UPDATE messages
        SET body = NULL, purged_at = $1
      WHERE created_at < $2 AND body IS NOT NULL`,
    [beforeIso, beforeIso]
  );
  return {
    calls: calls.rowCount ?? 0,
    messages: messages.rowCount ?? 0,
  };
}

// --- First-party product event log + alert state (migration 0035) ------------
// Twins of ingest/db.mjs (SQLite migration 0027). Same contract, $n params.

import { isEventType } from "./event-types.mjs";

export async function recordEvent(db, { event, firm_id = null, actor = null, context = null }) {
  if (!isEventType(event)) throw new Error(`unknown product event: ${event}`);
  const r = await db.query(
    `INSERT INTO events (event, firm_id, actor, context)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      event,
      firm_id,
      actor == null ? null : String(actor),
      context == null ? null : typeof context === "string" ? context : JSON.stringify(context),
    ]
  );
  return r.rows[0].id;
}

export async function listEvents(db, { event = null, firm_id = null, sinceIso = null, limit = 200 } = {}) {
  const where = [];
  const params = [];
  if (event != null) { params.push(event); where.push(`event = $${params.length}`); }
  if (firm_id != null) { params.push(firm_id); where.push(`firm_id = $${params.length}`); }
  if (sinceIso != null) { params.push(sinceIso); where.push(`created_at >= $${params.length}`); }
  params.push(Math.max(1, Math.floor(limit)));
  const r = await db.query(
    `SELECT * FROM events${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
      ORDER BY id DESC LIMIT $${params.length}`,
    params
  );
  return r.rows;
}

export async function countEvents(db, { event, firm_id = null, sinceIso = null } = {}) {
  const where = ["event = $1"];
  const params = [event];
  if (firm_id != null) { params.push(firm_id); where.push(`firm_id = $${params.length}`); }
  if (sinceIso != null) { params.push(sinceIso); where.push(`created_at >= $${params.length}`); }
  const r = await db.query(
    `SELECT COUNT(*)::int AS n FROM events WHERE ${where.join(" AND ")}`,
    params
  );
  return Number(r.rows[0]?.n ?? 0);
}

export async function firstEventAt(db, { event, firm_id = null } = {}) {
  const where = ["event = $1"];
  const params = [event];
  if (firm_id != null) { params.push(firm_id); where.push(`firm_id = $${params.length}`); }
  const r = await db.query(
    `SELECT MIN(created_at) AS t FROM events WHERE ${where.join(" AND ")}`,
    params
  );
  const t = r.rows[0]?.t ?? null;
  return t == null ? null : new Date(t).toISOString();
}

export async function lastEventAt(db, { event = null, firm_id = null } = {}) {
  const where = [];
  const params = [];
  if (event != null) { params.push(event); where.push(`event = $${params.length}`); }
  if (firm_id != null) { params.push(firm_id); where.push(`firm_id = $${params.length}`); }
  const r = await db.query(
    `SELECT MAX(created_at) AS t FROM events${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  );
  const t = r.rows[0]?.t ?? null;
  return t == null ? null : new Date(t).toISOString();
}

export async function getAlertState(db, key) {
  const r = await db.query(`SELECT value FROM alert_state WHERE key = $1`, [key]);
  return r.rows[0] ? r.rows[0].value : null;
}

export async function setAlertState(db, key, value) {
  await db.query(
    `INSERT INTO alert_state (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value == null ? null : String(value)]
  );
}

export async function getErrorsAfterId(db, afterId = 0, limit = 500) {
  const r = await db.query(
    `SELECT * FROM errors WHERE id > $1 ORDER BY id LIMIT $2`,
    [Number(afterId) || 0, Math.max(1, Math.floor(limit))]
  );
  return r.rows;
}

// Product events newer than a watermark id — the founder-activity digest's
// cursor (twin of getErrorsAfterId). Ascending by id so the sweep advances the
// watermark to the newest row it examined.
export async function getEventsAfterId(db, afterId = 0, limit = 1000) {
  const r = await db.query(
    `SELECT * FROM events WHERE id > $1 ORDER BY id LIMIT $2`,
    [Number(afterId) || 0, Math.max(1, Math.floor(limit))]
  );
  return r.rows;
}

export async function setFirmStage(db, firmId, stage) {
  const s = stage === "pilot" || stage === "paid" ? stage : null;
  await db.query(
    `UPDATE firms SET stage = $1, stage_updated_at = now() WHERE id = $2`,
    [s, firmId]
  );
}

export async function callCountsSince(db, firmId, sinceIso) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS received,
            COALESCE(SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END), 0)::int AS scored,
            COALESCE(SUM(CASE WHEN status LIKE 'failed%' THEN 1 ELSE 0 END), 0)::int AS failed
       FROM calls WHERE firm_id = $1 AND created_at >= $2`,
    [firmId, sinceIso]
  );
  const row = r.rows[0];
  return {
    received: Number(row?.received ?? 0),
    scored: Number(row?.scored ?? 0),
    failed: Number(row?.failed ?? 0),
  };
}

export async function lastCallAt(db, firmId) {
  const r = await db.query(
    `SELECT MAX(created_at) AS t FROM calls WHERE firm_id = $1`,
    [firmId]
  );
  const t = r.rows[0]?.t ?? null;
  return t == null ? null : new Date(t).toISOString();
}

// Received-but-never-scored watchdog (twin of db.mjs). Per-firm counts of calls
// with no flag row, not terminal, received before `cutoffIso`. See db.mjs for
// the why (Inngest-outage safety net feeding the founder stuckUnscored alert).
export async function stuckUnscoredCalls(db, cutoffIso) {
  const r = await db.query(
    `SELECT c.firm_id AS firm_id, COUNT(*)::int AS count, MIN(c.received_at) AS oldest
       FROM calls c
      WHERE NOT EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id)
        AND (c.status IS NULL
             OR (c.status NOT LIKE 'failed%' AND c.status NOT LIKE 'excluded%'))
        AND c.received_at < $1
      GROUP BY c.firm_id
      ORDER BY oldest`,
    [cutoffIso]
  );
  return r.rows.map((row) => ({
    firm_id: row.firm_id,
    count: Number(row.count ?? 0),
    oldest: row.oldest == null ? null : new Date(row.oldest).toISOString(),
  }));
}
