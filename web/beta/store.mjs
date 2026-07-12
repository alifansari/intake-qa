// Data-access layer for the beta program + rescue desk tables (migration 0021 /
// Supabase 0023). Same backend-selection rule as ingest/store.mjs — a node:sqlite
// handle (has .prepare) or a pg Pool — but implemented once over a tiny dialect
// adapter instead of full SQLite/Postgres twin files: every query here is simple
// enough that the only differences are placeholders ($n vs ?), booleans, and
// json parsing. Pipeline/service code imports from HERE, never raw SQL.
//
// Connections come from ingest/store.mjs (openPipelineDb / closePipelineDb).

const isSqlite = (db) => db && typeof db.prepare === "function";

// '?' placeholders -> '$1..$n' for pg. Only used on our own literals (never on
// user input), so a simple replace is safe.
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// SQLite has no boolean type; normalize params so callers can pass real booleans.
function normParams(db, params) {
  if (!isSqlite(db)) return params;
  return params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
}

async function all(db, sql, params = []) {
  if (isSqlite(db)) return db.prepare(sql).all(...normParams(db, params));
  const res = await db.query(toPg(sql), params);
  return res.rows;
}

async function get(db, sql, params = []) {
  if (isSqlite(db)) return db.prepare(sql).get(...normParams(db, params)) ?? null;
  const res = await db.query(toPg(sql), params);
  return res.rows[0] ?? null;
}

async function run(db, sql, params = []) {
  if (isSqlite(db)) {
    db.prepare(sql).run(...normParams(db, params));
    return;
  }
  await db.query(toPg(sql), params);
}

// INSERT that returns the new row id on both backends (SQLite >= 3.35 supports
// RETURNING; pg ids are uuid strings, sqlite ids are integers).
async function insert(db, sql, params = []) {
  const withReturning = `${sql} RETURNING id`;
  const row = await get(db, withReturning, params);
  return row?.id;
}

// jsonb comes back as an object from pg but as a TEXT string from sqlite.
export function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const asJson = (v) => (v == null ? null : JSON.stringify(v));

// --- 0a. Beta applicants + waitlist ------------------------------------------

export async function createBetaApplicant(db, a) {
  return insert(
    db,
    `INSERT INTO beta_applicants
       (email, name, firm_name, role, bar_number, practice_area, state,
        monthly_call_volume, phone_system, crm_system, records_calls,
        spanish_call_pct, status, qualification)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      a.email,
      a.name,
      a.firm_name,
      a.role ?? null,
      a.bar_number ?? null,
      a.practice_area,
      a.state,
      a.monthly_call_volume ?? null,
      a.phone_system ?? null,
      a.crm_system ?? null,
      Boolean(a.records_calls),
      a.spanish_call_pct ?? null,
      a.status ?? "applied",
      asJson(a.qualification),
    ]
  );
}

export async function getBetaApplicant(db, id) {
  return get(db, "SELECT * FROM beta_applicants WHERE id = ?", [id]);
}

export async function getBetaApplicantByEmail(db, email) {
  return get(
    db,
    "SELECT * FROM beta_applicants WHERE email = ? ORDER BY created_at DESC LIMIT 1",
    [email]
  );
}

export async function listBetaApplicants(db, status = null) {
  if (status != null) {
    return all(db, "SELECT * FROM beta_applicants WHERE status = ? ORDER BY created_at", [status]);
  }
  return all(db, "SELECT * FROM beta_applicants ORDER BY created_at");
}

export async function setBetaApplicantStatus(db, id, status, now = new Date()) {
  await run(db, "UPDATE beta_applicants SET status = ?, updated_at = ? WHERE id = ?", [
    status,
    now.toISOString(),
    id,
  ]);
}

export async function setBetaApplicantFirm(db, id, firmId, now = new Date()) {
  await run(db, "UPDATE beta_applicants SET firm_id = ?, updated_at = ? WHERE id = ?", [
    firmId,
    now.toISOString(),
    id,
  ]);
}

export async function createWaitlistEntry(db, e) {
  return insert(
    db,
    `INSERT INTO waitlist_entries (applicant_id, practice_area, state, reason)
     VALUES (?, ?, ?, ?)`,
    [e.applicant_id, e.practice_area, e.state ?? null, e.reason ?? null]
  );
}

export async function listWaitlist(db, practiceArea = null) {
  if (practiceArea != null) {
    return all(db, "SELECT * FROM waitlist_entries WHERE practice_area = ? ORDER BY created_at", [
      practiceArea,
    ]);
  }
  return all(db, "SELECT * FROM waitlist_entries ORDER BY created_at");
}

// --- 0b. NDA records ----------------------------------------------------------

export async function createNdaRecord(db, r) {
  return insert(
    db,
    `INSERT INTO nda_records (applicant_id, provider, signature_request_id, status)
     VALUES (?, ?, ?, ?)`,
    [r.applicant_id, r.provider ?? "dropbox_sign", r.signature_request_id ?? null, r.status ?? "sent"]
  );
}

export async function getLatestNdaForApplicant(db, applicantId) {
  return get(
    db,
    "SELECT * FROM nda_records WHERE applicant_id = ? ORDER BY sent_at DESC LIMIT 1",
    [applicantId]
  );
}

export async function findNdaBySignatureRequest(db, signatureRequestId) {
  return get(db, "SELECT * FROM nda_records WHERE signature_request_id = ?", [signatureRequestId]);
}

export async function setNdaStatus(db, id, status, { signedAt = null, documentRef = null } = {}) {
  await run(
    db,
    `UPDATE nda_records
        SET status = ?,
            signed_at = COALESCE(?, signed_at),
            document_ref = COALESCE(?, document_ref)
      WHERE id = ?`,
    [status, signedAt, documentRef, id]
  );
}

// --- 0c. Structured feedback --------------------------------------------------

export async function createBetaFeedback(db, f) {
  return insert(
    db,
    `INSERT INTO beta_feedback
       (applicant_id, firm_id, subject_type, subject_id,
        ux_setup_ease, ux_report_clarity, ux_delivery,
        utility_flags_signable, utility_would_have_recovered,
        utility_diagnosis_accurate, utility_script_usable,
        trust_score, trust_false_positives,
        wtp_would_pay, wtp_monthly_max_cents, wtp_must_have, open_feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.applicant_id ?? null,
      f.firm_id ?? null,
      f.subject_type,
      f.subject_id ?? null,
      f.ux_setup_ease ?? null,
      f.ux_report_clarity ?? null,
      f.ux_delivery ?? null,
      f.utility_flags_signable ?? null,
      f.utility_would_have_recovered ?? null,
      f.utility_diagnosis_accurate ?? null,
      f.utility_script_usable ?? null,
      f.trust_score ?? null,
      f.trust_false_positives ?? null,
      f.wtp_would_pay ?? null,
      f.wtp_monthly_max_cents ?? null,
      f.wtp_must_have ?? null,
      f.open_feedback ?? null,
    ]
  );
}

export async function listBetaFeedback(db, { firmId = null, subjectType = null, subjectId = null } = {}) {
  const where = [];
  const params = [];
  if (firmId != null) {
    where.push("firm_id = ?");
    params.push(firmId);
  }
  if (subjectType != null) {
    where.push("subject_type = ?");
    params.push(subjectType);
  }
  if (subjectId != null) {
    where.push("subject_id = ?");
    params.push(subjectId);
  }
  const clause = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
  return all(db, `SELECT * FROM beta_feedback${clause} ORDER BY created_at`, params);
}

// --- 2. Rulesets + firm overrides ---------------------------------------------

export async function getRulesetRow(db, key) {
  return get(db, "SELECT * FROM practice_area_rulesets WHERE key = ?", [key]);
}

export async function listRulesetRows(db) {
  return all(db, "SELECT * FROM practice_area_rulesets ORDER BY key");
}

export async function getFirmRulesetOverrides(db, firmId) {
  return get(db, "SELECT * FROM firm_ruleset_overrides WHERE firm_id = ?", [firmId]);
}

export async function upsertFirmRulesetOverrides(db, firmId, rulesetKey, overrides, now = new Date()) {
  const existing = await getFirmRulesetOverrides(db, firmId);
  if (existing) {
    await run(
      db,
      "UPDATE firm_ruleset_overrides SET ruleset_key = ?, overrides = ?, updated_at = ? WHERE firm_id = ?",
      [rulesetKey, asJson(overrides), now.toISOString(), firmId]
    );
    return existing.id;
  }
  return insert(
    db,
    "INSERT INTO firm_ruleset_overrides (firm_id, ruleset_key, overrides) VALUES (?, ?, ?)",
    [firmId, rulesetKey, asJson(overrides)]
  );
}

// --- 2b. Handling scores --------------------------------------------------------

export async function insertHandlingScore(db, s) {
  return insert(
    db,
    `INSERT INTO handling_scores
       (flag_id, speed_to_lead_seconds, screening_completeness, next_step_secured,
        objection_handling, rubric_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      s.flag_id,
      s.speed_to_lead_seconds ?? null,
      s.screening_completeness ?? null,
      Boolean(s.next_step_secured),
      s.objection_handling ?? null,
      s.rubric_version ?? null,
    ]
  );
}

export async function getHandlingScore(db, flagId) {
  return get(db, "SELECT * FROM handling_scores WHERE flag_id = ?", [flagId]);
}

// --- 3. Review queue ------------------------------------------------------------

export async function enqueueReviewItem(db, { firm_id, flag_id, confidence_tier = null }) {
  return insert(
    db,
    "INSERT INTO review_queue_items (firm_id, flag_id, confidence_tier) VALUES (?, ?, ?)",
    [firm_id, flag_id, confidence_tier]
  );
}

export async function getReviewItemByFlag(db, flagId) {
  return get(db, "SELECT * FROM review_queue_items WHERE flag_id = ?", [flagId]);
}

export async function listReviewItems(db, firmId, state = null) {
  if (state != null) {
    return all(
      db,
      "SELECT * FROM review_queue_items WHERE firm_id = ? AND state = ? ORDER BY created_at",
      [firmId, state]
    );
  }
  return all(db, "SELECT * FROM review_queue_items WHERE firm_id = ? ORDER BY created_at", [firmId]);
}

export async function setReviewItemState(
  db,
  id,
  state,
  { reviewer, reviewedAt = new Date(), rejectReason = null, criteriaFeedback = null } = {}
) {
  await run(
    db,
    `UPDATE review_queue_items
        SET state = ?, reviewer = ?, reviewed_at = ?, reject_reason = ?, criteria_feedback = ?
      WHERE id = ?`,
    [state, reviewer ?? null, new Date(reviewedAt).toISOString(), rejectReason, asJson(criteriaFeedback), id]
  );
}

// Confirmed, human-signed-off flags that are not yet in any rescue packet —
// joined with their flag + call so the packet builder has prospect details.
// This query is the ONLY road into a rescue packet, so invariant (d) (no flag
// surfaces without human sign-off) holds by construction.
//
// The crm_leads LEFT JOIN carries the deterministic triage read (SOL days,
// recoverability, value tier, gap) for flags that came in via a CRM dead-lead
// import; call-flow flags get NULLs there and keep their existing defaults.
export async function listRescueCandidates(db, firmId) {
  return all(
    db,
    `SELECT r.flag_id, r.confidence_tier, r.firm_id,
            f.qualification_score, f.reason, f.case_type,
            c.caller_name, c.caller_phone, c.received_at, c.id AS call_id,
            cl.sol_deadline, cl.sol_days_remaining, cl.recoverability,
            cl.value_tier, cl.value_tier_basis, cl.gap_kind, cl.crm AS import_crm,
            cl.external_lead_id
       FROM review_queue_items r
       JOIN flags f ON f.id = r.flag_id
       JOIN calls c ON c.id = f.call_id
       LEFT JOIN crm_leads cl ON cl.flag_id = r.flag_id
      WHERE r.firm_id = ?
        AND r.state = 'confirmed'
        AND NOT EXISTS (SELECT 1 FROM rescue_packet_items pi WHERE pi.flag_id = r.flag_id)
      ORDER BY r.reviewed_at`,
    [firmId]
  );
}

// --- 4. Rescue packets ------------------------------------------------------------

export async function createRescuePacket(db, { firm_id, packet_date }) {
  return insert(db, "INSERT INTO rescue_packets (firm_id, packet_date) VALUES (?, ?)", [
    firm_id,
    packet_date,
  ]);
}

export async function addRescuePacketItem(db, item) {
  return insert(
    db,
    `INSERT INTO rescue_packet_items
       (packet_id, flag_id, rank, prospect_name, prospect_phone, diagnosis,
        callback_script, est_value_cents, recoverability, sol_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.packet_id,
      item.flag_id,
      item.rank,
      item.prospect_name ?? null,
      item.prospect_phone ?? null,
      item.diagnosis ?? null,
      item.callback_script ?? null,
      item.est_value_cents ?? null,
      item.recoverability ?? null,
      item.sol_deadline ?? null,
    ]
  );
}

export async function getRescuePacket(db, firmId, packetDate) {
  const packet = await get(
    db,
    "SELECT * FROM rescue_packets WHERE firm_id = ? AND packet_date = ?",
    [firmId, packetDate]
  );
  if (!packet) return null;
  const items = await all(
    db,
    "SELECT * FROM rescue_packet_items WHERE packet_id = ? ORDER BY rank",
    [packet.id]
  );
  return { ...packet, items };
}

export async function markPacketDelivered(db, packetId, deliveredVia, now = new Date()) {
  await run(
    db,
    "UPDATE rescue_packets SET status = 'delivered', delivered_via = ?, delivered_at = ? WHERE id = ?",
    [asJson(deliveredVia), now.toISOString(), packetId]
  );
}

// --- 5. Recovered-case ledger -------------------------------------------------------

export async function createLedgerEntry(db, e) {
  return insert(
    db,
    `INSERT INTO rescue_ledger_entries
       (firm_id, flag_id, rescue_tag, stage, stage_history, would_have_lost,
        would_have_lost_basis, control_holdout, fee_value_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.firm_id,
      e.flag_id,
      e.rescue_tag,
      e.stage ?? "flagged",
      asJson(e.stage_history ?? [{ stage: e.stage ?? "flagged", at: new Date().toISOString() }]),
      Boolean(e.would_have_lost),
      e.would_have_lost_basis ?? null,
      Boolean(e.control_holdout),
      e.fee_value_cents ?? null,
    ]
  );
}

export async function getLedgerEntryByFlag(db, flagId) {
  return get(db, "SELECT * FROM rescue_ledger_entries WHERE flag_id = ?", [flagId]);
}

export async function getLedgerEntry(db, id) {
  return get(db, "SELECT * FROM rescue_ledger_entries WHERE id = ?", [id]);
}

export async function listLedgerEntries(db, firmId, stage = null) {
  if (stage != null) {
    return all(
      db,
      "SELECT * FROM rescue_ledger_entries WHERE firm_id = ? AND stage = ? ORDER BY created_at",
      [firmId, stage]
    );
  }
  return all(db, "SELECT * FROM rescue_ledger_entries WHERE firm_id = ? ORDER BY created_at", [firmId]);
}

export async function updateLedgerEntry(db, id, fields) {
  const { stage, stage_history, fee_value_cents, contacted_at, signed_at, settled_at } = fields;
  await run(
    db,
    `UPDATE rescue_ledger_entries
        SET stage           = COALESCE(?, stage),
            stage_history   = COALESCE(?, stage_history),
            fee_value_cents = COALESCE(?, fee_value_cents),
            contacted_at    = COALESCE(?, contacted_at),
            signed_at       = COALESCE(?, signed_at),
            settled_at      = COALESCE(?, settled_at),
            updated_at      = ?
      WHERE id = ?`,
    [
      stage ?? null,
      asJson(stage_history) ?? null,
      fee_value_cents ?? null,
      contacted_at ?? null,
      signed_at ?? null,
      settled_at ?? null,
      new Date().toISOString(),
      id,
    ]
  );
}

// Review queue rows joined with their flag + call + (when imported) crm_leads
// provenance — what the analyst console renders. Same joins as
// listRescueCandidates but for ANY state and without the packet exclusion.
export async function listReviewQueueDetailed(db, firmId, state = "pending") {
  return all(
    db,
    `SELECT r.id AS review_item_id, r.state, r.reviewer, r.reviewed_at, r.confidence_tier,
            r.flag_id, f.reason, f.case_type,
            c.caller_name, c.caller_phone, c.received_at,
            cl.crm AS import_crm, cl.external_lead_id, cl.crm_status, cl.crm_substatus,
            cl.gap_kind, cl.value_tier, cl.value_tier_basis,
            cl.sol_deadline, cl.sol_days_remaining, cl.sol_urgency, cl.language
       FROM review_queue_items r
       JOIN flags f ON f.id = r.flag_id
       JOIN calls c ON c.id = f.call_id
       LEFT JOIN crm_leads cl ON cl.flag_id = r.flag_id
      WHERE r.firm_id = ? AND r.state = ?
      ORDER BY r.created_at`,
    [firmId, state]
  );
}

// --- 9. CRM dead-lead import (migration 0027 / supabase 0035) --------------------------

export async function createImportBatch(db, b) {
  return insert(
    db,
    `INSERT INTO crm_import_batches (firm_id, crm, filename, imported_by, rubric_version)
     VALUES (?, ?, ?, ?, ?)`,
    [b.firm_id, b.crm, b.filename ?? null, b.imported_by, b.rubric_version ?? null]
  );
}

export async function finalizeImportBatch(db, batchId, counts) {
  await run(
    db,
    `UPDATE crm_import_batches
        SET row_count = ?, surfaced_count = ?, needs_info_count = ?,
            screened_out_count = ?, skipped_count = ?
      WHERE id = ?`,
    [
      counts.row_count ?? 0,
      counts.surfaced_count ?? 0,
      counts.needs_info_count ?? 0,
      counts.screened_out_count ?? 0,
      counts.skipped_count ?? 0,
      batchId,
    ]
  );
}

export async function listImportBatches(db, firmId) {
  return all(db, "SELECT * FROM crm_import_batches WHERE firm_id = ? ORDER BY created_at DESC", [firmId]);
}

export async function insertCrmLead(db, l) {
  return insert(
    db,
    `INSERT INTO crm_leads
       (batch_id, firm_id, crm, external_lead_id, prospect_name, prospect_phone,
        prospect_email, case_type, incident_date, lead_created_at, last_contact_at,
        crm_status, crm_substatus, attempts, language, notes, verdict, screen_reason,
        gap_kind, gap_basis, value_tier, value_tier_basis, sol_deadline,
        sol_days_remaining, sol_urgency, recoverability, rubric_version,
        call_id, flag_id, raw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      l.batch_id,
      l.firm_id,
      l.crm,
      l.external_lead_id ?? null,
      l.prospect_name ?? null,
      l.prospect_phone ?? null,
      l.prospect_email ?? null,
      l.case_type ?? null,
      l.incident_date ?? null,
      l.lead_created_at ?? null,
      l.last_contact_at ?? null,
      l.crm_status ?? null,
      l.crm_substatus ?? null,
      l.attempts ?? null,
      l.language ?? null,
      l.notes ?? null,
      l.verdict,
      l.screen_reason ?? null,
      l.gap_kind ?? null,
      l.gap_basis ?? null,
      l.value_tier ?? null,
      l.value_tier_basis ?? null,
      l.sol_deadline ?? null,
      l.sol_days_remaining ?? null,
      l.sol_urgency ?? null,
      l.recoverability ?? null,
      l.rubric_version,
      l.call_id ?? null,
      l.flag_id ?? null,
      asJson(l.raw),
    ]
  );
}

export async function getCrmLeadByExternalId(db, firmId, crm, externalLeadId) {
  return get(
    db,
    "SELECT * FROM crm_leads WHERE firm_id = ? AND crm = ? AND external_lead_id = ?",
    [firmId, crm, externalLeadId]
  );
}

export async function getCrmLeadByFlag(db, flagId) {
  return get(db, "SELECT * FROM crm_leads WHERE flag_id = ?", [flagId]);
}

export async function listCrmLeads(db, firmId, { batchId = null, verdict = null } = {}) {
  const where = ["firm_id = ?"];
  const params = [firmId];
  if (batchId != null) {
    where.push("batch_id = ?");
    params.push(batchId);
  }
  if (verdict != null) {
    where.push("verdict = ?");
    params.push(verdict);
  }
  return all(db, `SELECT * FROM crm_leads WHERE ${where.join(" AND ")} ORDER BY created_at`, params);
}

// --- 8. Callback audit + compliance config -------------------------------------------

export async function insertCallbackAudit(db, entry) {
  return insert(
    db,
    `INSERT INTO callback_audit_entries
       (firm_id, flag_id, actor_type, employee_name, occurred_at, outcome, note)
     VALUES (?, ?, 'firm_employee', ?, ?, ?, ?)`,
    [
      entry.firm_id,
      entry.flag_id ?? null,
      entry.employee_name,
      entry.occurred_at,
      entry.outcome ?? null,
      entry.note ?? null,
    ]
  );
}

export async function listCallbackAudits(db, firmId) {
  return all(
    db,
    "SELECT * FROM callback_audit_entries WHERE firm_id = ? ORDER BY occurred_at",
    [firmId]
  );
}

export async function getComplianceConfig(db, firmId) {
  return get(db, "SELECT * FROM compliance_config WHERE firm_id = ?", [firmId]);
}

export async function upsertComplianceConfig(db, firmId, cfg, now = new Date()) {
  const existing = await getComplianceConfig(db, firmId);
  if (existing) {
    await run(
      db,
      `UPDATE compliance_config
          SET consent_greeting_version = COALESCE(?, consent_greeting_version),
              consent_attested         = COALESCE(?, consent_attested),
              consent_attested_by      = COALESCE(?, consent_attested_by),
              consent_attested_at      = COALESCE(?, consent_attested_at),
              recording_checklist      = COALESCE(?, recording_checklist),
              baa_reference            = COALESCE(?, baa_reference),
              baa_signed_at            = COALESCE(?, baa_signed_at),
              updated_at               = ?
        WHERE firm_id = ?`,
      [
        cfg.consent_greeting_version ?? null,
        typeof cfg.consent_attested === "boolean" ? cfg.consent_attested : null,
        cfg.consent_attested_by ?? null,
        cfg.consent_attested_at ?? null,
        asJson(cfg.recording_checklist) ?? null,
        cfg.baa_reference ?? null,
        cfg.baa_signed_at ?? null,
        now.toISOString(),
        firmId,
      ]
    );
    return existing.id;
  }
  return insert(
    db,
    `INSERT INTO compliance_config
       (firm_id, consent_greeting_version, consent_attested, consent_attested_by,
        consent_attested_at, recording_checklist, baa_reference, baa_signed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      firmId,
      cfg.consent_greeting_version ?? null,
      Boolean(cfg.consent_attested),
      cfg.consent_attested_by ?? null,
      cfg.consent_attested_at ?? null,
      asJson(cfg.recording_checklist),
      cfg.baa_reference ?? null,
      cfg.baa_signed_at ?? null,
    ]
  );
}

export async function setCallConsentStatus(db, callId, consentStatus) {
  await run(db, "UPDATE calls SET consent_status = ? WHERE id = ?", [consentStatus, callId]);
}

// Firm self-serve uploads (/desk/upload): the firm's uploaded calls with the
// pipeline facts their status derives from (deriveUploadStatus in
// ingest/uploads.mjs). Uploads are `source='manual'` rows whose
// external_call_id carries the 'upload:' marker; firm-scoped by the WHERE.
export async function listFirmUploads(db, firmId, limit = 30) {
  return all(
    db,
    `SELECT c.id, c.external_call_id, c.received_at, c.created_at,
            c.status, c.status_reason,
            (c.transcript IS NOT NULL) AS has_transcript,
            EXISTS (SELECT 1 FROM flags f WHERE f.call_id = c.id) AS scored
       FROM calls c
      WHERE c.firm_id = ?
        AND c.source = 'manual'
        AND c.external_call_id LIKE 'upload:%'
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ?`,
    [firmId, limit]
  );
}
