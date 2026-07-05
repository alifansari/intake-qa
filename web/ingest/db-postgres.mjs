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
  const base = `
    SELECT c.* FROM calls c
    WHERE NOT EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id)`;
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
  } = flag;
  const info = await db.query(
    `INSERT INTO flags (call_id, firm_id, qualification_score, is_leaked_signable, reason)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [call_id, firm_id, qualification_score, Boolean(is_leaked_signable), reason]
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

export async function createDemoCall(db, { client_ip = null, filename = null } = {}) {
  const info = await db.query(
    `INSERT INTO demo_calls (client_ip, filename) VALUES ($1, $2) RETURNING id`,
    [client_ip, filename]
  );
  return info.rows[0].id;
}

export async function getDemoCall(db, id) {
  const r = await db.query("SELECT * FROM demo_calls WHERE id = $1", [id]);
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
            p.per_case_fee_by_type, p.monthly_case_fee_cap_cents
       FROM firm_billing fb JOIN billing_plans p ON p.id = fb.plan_id
      WHERE fb.firm_id = $1`,
    [firmId]
  );
  return r.rows[0];
}

export async function upsertFirmBilling(db, cfg) {
  const {
    firm_id,
    plan_id,
    status = "trialing",
    billing_anchor_day = 1,
    stripe_customer_id = null,
    guarantee_type = "none",
    guarantee_threshold_cents = null,
    guarantee_deadline = null,
  } = cfg;
  await db.query(
    `INSERT INTO firm_billing
       (firm_id, plan_id, status, billing_anchor_day, stripe_customer_id,
        guarantee_type, guarantee_threshold_cents, guarantee_deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (firm_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       status = excluded.status,
       billing_anchor_day = excluded.billing_anchor_day,
       stripe_customer_id = excluded.stripe_customer_id,
       guarantee_type = excluded.guarantee_type,
       guarantee_threshold_cents = excluded.guarantee_threshold_cents,
       guarantee_deadline = excluded.guarantee_deadline`,
    [firm_id, plan_id, status, billing_anchor_day, stripe_customer_id,
     guarantee_type, guarantee_threshold_cents, guarantee_deadline]
  );
  return getFirmBilling(db, firm_id);
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
