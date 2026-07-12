// CRM dead-lead import (the ingestion side of the rescue layer).
//
// The firm exports the leads its CRM cadence marked dead (Lead Docket Leads
// Report filtered to Lost/Rejected/Chase-exhausted, CloudLex Insights, a
// Litify report, or any CSV with roughly those columns) and uploads it here.
// Every row is normalized, deterministically triaged (rescue/triage.mjs), and
// recorded; the few live ones enter the EXISTING rescue conveyor as flags —
// human review (invariant d) -> top-3 packet -> ledger — exactly like a
// leaked-signable call flag.
//
// Header names differ per CRM and per firm (statuses are firm-configurable in
// Lead Docket), so mapping is alias-based and forgiving: unmapped columns ride
// along in the raw JSON, never lost.
//
// Split: pure parsing/normalization (no I/O) + a thin orchestrator.

import { upsertCall, insertFlag } from "../ingest/store.mjs";
import {
  createImportBatch,
  finalizeImportBatch,
  insertCrmLead,
  getCrmLeadByExternalId,
} from "../beta/store.mjs";
import { resolveFirmRuleset } from "../rulesets/index.mjs";
import { enqueueForReview } from "./review.mjs";
import { triageLead, TRIAGE_RUBRIC_VERSION } from "./triage.mjs";

export const CRM_KEYS = Object.freeze([
  "leaddocket",
  "cloudlex",
  "litify",
  "lawmatics",
  "lawruler",
  "cliogrow",
  "other",
]);

// --- CSV parsing (RFC-4180-ish: quotes, escaped quotes, CRLF) -------------------

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text ?? "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

// --- header mapping ---------------------------------------------------------------

const normHeader = (h) =>
  String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Canonical field -> accepted header aliases (normalized form).
const HEADER_ALIASES = {
  external_lead_id: ["lead id", "id", "lead", "lead number", "opportunity id", "intake id", "record id"],
  prospect_name: ["name", "full name", "client name", "contact name", "prospect name", "lead name"],
  first_name: ["first name", "first"],
  last_name: ["last name", "last"],
  prospect_phone: ["phone", "phone number", "cell phone", "mobile", "mobile phone", "primary phone", "cell", "best phone"],
  prospect_email: ["email", "email address"],
  case_type: ["case type", "matter type", "practice area", "type", "incident type", "injury type"],
  incident_date: ["incident date", "date of incident", "accident date", "date of loss", "dol", "injury date", "date of accident"],
  lead_created_at: ["created", "created date", "date created", "lead date", "intake date", "created on", "date received"],
  last_contact_at: ["last contact", "last contacted", "last contact date", "last activity", "last touch", "last updated", "modified", "date modified"],
  crm_status: ["status", "lead status", "stage", "disposition", "current status"],
  crm_substatus: ["substatus", "sub status", "status detail", "sub disposition"],
  attempts: ["attempts", "contact attempts", "call attempts", "touches", "of attempts", "attempt count"],
  language: ["language", "preferred language", "lang"],
  notes: ["notes", "description", "summary", "case summary", "comments", "details", "case description"],
  state: ["state", "st"],
  source: ["source", "marketing source", "lead source", "referral source"],
};

export function mapHeaders(headerRow) {
  const mapping = {}; // column index -> canonical field
  const seen = new Set();
  headerRow.forEach((h, idx) => {
    const n = normHeader(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!seen.has(field) && aliases.includes(n)) {
        mapping[idx] = field;
        seen.add(field);
        break;
      }
    }
  });
  return mapping;
}

// --- field normalization -------------------------------------------------------------

const CASE_TYPE_ALIASES = {
  auto_accident: ["auto accident", "auto", "car accident", "motor vehicle accident", "mva", "car crash", "rear end", "auto rear end"],
  motorcycle: ["motorcycle", "motorcycle accident"],
  pedestrian: ["pedestrian", "pedestrian accident", "hit by car"],
  slip_and_fall: ["slip and fall", "slip fall", "premises", "premises liability", "trip and fall"],
  dog_bite: ["dog bite", "animal attack", "dog attack"],
  wrongful_death: ["wrongful death"],
  medical_malpractice: ["medical malpractice", "med mal", "medmal"],
  workers_comp: ["workers comp", "workers compensation", "work comp", "work injury"],
};

export function normalizeCaseType(value) {
  const n = normHeader(value);
  if (!n) return null;
  for (const [key, aliases] of Object.entries(CASE_TYPE_ALIASES)) {
    if (aliases.includes(n) || key === n.replace(/ /g, "_")) return key;
  }
  return null; // unknown stays unknown — the raw value survives in `raw`
}

// Parse ISO or US dates to ISO 'YYYY-MM-DD'. Anything unparseable -> null
// (an honest null, never a guessed date).
export function parseDateish(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    let [, m, d, y] = us;
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const candidate = `${y}-${mm}-${dd}`;
    return Number.isNaN(new Date(`${candidate}T00:00:00Z`).getTime()) ? null : candidate;
  }
  return null;
}

function normalizeLanguage(value) {
  const n = normHeader(value);
  if (!n) return null;
  if (n.startsWith("es") || n.includes("spanish")) return "es";
  if (n.startsWith("en")) return "en";
  return n.slice(0, 12);
}

// One raw CSV row -> a normalized lead object (pure).
export function normalizeRow(headerMapping, headerRow, row) {
  const lead = { raw: {} };
  row.forEach((cell, idx) => {
    const header = headerRow[idx] ?? `col_${idx}`;
    const value = String(cell ?? "").trim();
    if (value) lead.raw[header] = value;
    const field = headerMapping[idx];
    if (!field || !value) return;
    lead[field] = value;
  });

  if (!lead.prospect_name && (lead.first_name || lead.last_name)) {
    lead.prospect_name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  }
  delete lead.first_name;
  delete lead.last_name;

  lead.case_type = normalizeCaseType(lead.case_type);
  lead.incident_date = parseDateish(lead.incident_date);
  lead.lead_created_at = parseDateish(lead.lead_created_at);
  lead.last_contact_at = parseDateish(lead.last_contact_at);
  lead.language = normalizeLanguage(lead.language);
  if (lead.attempts != null) {
    const n = Number(String(lead.attempts).replace(/[^0-9]/g, ""));
    lead.attempts = Number.isFinite(n) && String(lead.attempts).match(/\d/) ? n : null;
  }
  if (lead.prospect_phone) {
    const digits = lead.prospect_phone.replace(/[^0-9+]/g, "");
    lead.prospect_phone = digits.length >= 7 ? digits : null;
  }
  return lead;
}

// A row with no name, no phone, and no external id is unactionable junk.
export function isJunkRow(lead) {
  return !lead.prospect_name && !lead.prospect_phone && !lead.external_lead_id;
}

// --- the orchestrator -----------------------------------------------------------------

// Import one dead-lead CSV export for a firm. Idempotent per (firm, crm,
// external_lead_id): re-uploading the same export never duplicates leads.
// Returns the batch summary the UI shows ("40 imported -> 3 rescue candidates").
export async function importDeadLeads({
  db,
  firmId,
  csvText,
  crm = "other",
  filename = null,
  importedBy,
  now = new Date(),
}) {
  if (!importedBy || String(importedBy).trim().length === 0) {
    throw new Error("importDeadLeads requires a named importer");
  }
  if (!CRM_KEYS.includes(crm)) throw new Error(`unknown crm key: ${crm}`);

  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one lead row");
  const headerRow = rows[0];
  const mapping = mapHeaders(headerRow);
  if (Object.keys(mapping).length === 0) {
    throw new Error("no recognizable columns — expected headers like Name, Phone, Status, Case Type");
  }

  const { tunables } = await resolveFirmRuleset(db, firmId);

  const batchId = await createImportBatch(db, {
    firm_id: firmId,
    crm,
    filename,
    imported_by: importedBy,
    rubric_version: TRIAGE_RUBRIC_VERSION,
  });

  const counts = { rows: 0, surfaced: 0, needsInfo: 0, screenedOut: 0, skipped: 0 };
  const screenReasons = new Map();

  for (const row of rows.slice(1)) {
    counts.rows++;
    const lead = normalizeRow(mapping, headerRow, row);
    if (isJunkRow(lead)) {
      counts.skipped++;
      continue;
    }

    if (lead.external_lead_id) {
      const existing = await getCrmLeadByExternalId(db, firmId, crm, lead.external_lead_id);
      if (existing) {
        counts.skipped++;
        continue;
      }
    }

    const triage = triageLead(lead, { tunables, now });

    // Only human-reviewable rescue candidates enter the conveyor: a call row
    // (source 'manual' — it IS a manual import; crm_leads is the provenance)
    // plus a leaked-signable flag, enqueued for named review (invariant d).
    let callId = null;
    let flagId = null;
    if (triage.verdict === "rescue_candidate") {
      const call = await upsertCall(db, {
        firm_id: firmId,
        source: "manual",
        external_call_id: lead.external_lead_id ? `crmimport:${crm}:${lead.external_lead_id}` : null,
        caller_phone: lead.prospect_phone ?? null,
        caller_name: lead.prospect_name ?? null,
        received_at: toIsoTimestamp(lead.lead_created_at) ?? toIsoTimestamp(lead.last_contact_at) ?? new Date(now).toISOString(),
      });
      callId = call.id;
      flagId = await insertFlag(db, {
        call_id: callId,
        firm_id: firmId,
        qualification_score: null,
        is_leaked_signable: 1,
        reason: triage.diagnosis,
        case_type: lead.case_type,
      });
      await enqueueForReview({ db, firmId, flagId });
      counts.surfaced++;
    } else if (triage.verdict === "needs_info") {
      counts.needsInfo++;
    } else {
      counts.screenedOut++;
      const key = triage.screenReason ?? "screened out";
      screenReasons.set(key, (screenReasons.get(key) ?? 0) + 1);
    }

    await insertCrmLead(db, {
      batch_id: batchId,
      firm_id: firmId,
      crm,
      external_lead_id: lead.external_lead_id ?? null,
      prospect_name: lead.prospect_name ?? null,
      prospect_phone: lead.prospect_phone ?? null,
      prospect_email: lead.prospect_email ?? null,
      case_type: lead.case_type,
      incident_date: lead.incident_date,
      lead_created_at: toIsoTimestamp(lead.lead_created_at),
      last_contact_at: toIsoTimestamp(lead.last_contact_at),
      crm_status: lead.crm_status ?? null,
      crm_substatus: lead.crm_substatus ?? null,
      attempts: lead.attempts ?? null,
      language: lead.language ?? null,
      notes: lead.notes ?? null,
      verdict: triage.verdict,
      screen_reason: triage.screenReason,
      gap_kind: triage.gap?.kind ?? null,
      gap_basis: triage.gap?.basis ?? null,
      value_tier: triage.valueTier?.tier ?? null,
      value_tier_basis: triage.valueTier?.basis ?? null,
      sol_deadline: triage.sol?.deadlineDate ?? null,
      sol_days_remaining: triage.sol?.daysRemaining ?? null,
      sol_urgency: triage.sol?.urgency ?? null,
      recoverability: triage.recoverability?.recoverability ?? null,
      rubric_version: TRIAGE_RUBRIC_VERSION,
      call_id: callId,
      flag_id: flagId,
      raw: lead.raw,
    });
  }

  await finalizeImportBatch(db, batchId, {
    row_count: counts.rows,
    surfaced_count: counts.surfaced,
    needs_info_count: counts.needsInfo,
    screened_out_count: counts.screenedOut,
    skipped_count: counts.skipped,
  });

  return {
    batchId,
    ...counts,
    screenReasons: [...screenReasons.entries()].map(([reason, count]) => ({ reason, count })),
  };
}

function toIsoTimestamp(isoDate) {
  return isoDate ? `${isoDate}T12:00:00Z` : null;
}
