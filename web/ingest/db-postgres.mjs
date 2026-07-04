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
