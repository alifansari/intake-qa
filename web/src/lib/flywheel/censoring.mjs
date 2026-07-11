// ---------------------------------------------------------------------------
// Increment 0 flywheel — PURE censoring + audit logic. No I/O, no fs, no SQL:
// identical behavior over JSON today and Supabase later, and directly
// unit-testable with `node --test` (same pattern as escalation/engine.mjs).
//
// The three censoring rules (ops/drafts/engine-v2-conveyor-MVP.md §6):
//   1. Blank means UNKNOWN, never zero. A money field left empty on the
//      firm's export is censored (null). An explicit "0" the firm typed is a
//      real reported value and stays 0.
//   2. Open cases are RIGHT-CENSORED. While end_state is "open", realized
//      resolution figures (gross, fees, liens, time-to-resolution) are not
//      yet knowable — they are forced to null even if a partial number
//      sneaks into the import. Demand milestones (demand_sent_at,
//      demand_amount, first_offer) CAN exist on an open case and are kept.
//   3. Banded values stay BANDS. "$10k–$25k" is stored as
//      { kind: "band", low, high, raw } — collapsing a band to a midpoint
//      would manufacture precision the firm never reported.
//
// Declines are censored, never "worth $0" — that inference is circular
// (you'd be training the scorer on its own rejections).
// ---------------------------------------------------------------------------

export const END_STATES = [
  "settled",
  "tried",
  "dropped",
  "withdrew",
  "referred_resolved",
  "open",
];

export const DISPOSITION_CODES = [
  "signed",
  "developing",
  "referred_out",
  "declined",
  "no_action",
];

// Fields that are unknowable until the case resolves (right-censored while open).
export const RESOLUTION_FIELDS = [
  "gross",
  "costs_advanced",
  "lien_load",
  "net_to_client",
  "net_fee_to_firm",
  "referral_fee",
];

// Demand milestones may legitimately exist while the case is still open.
export const DEMAND_MONEY_FIELDS = ["demand_amount", "first_offer"];

const BLANK_TOKENS = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "null",
  "unknown",
  "unk",
  "tbd",
  "pending",
  "?",
]);

/** Parse one money token ("$12,500", "10k", "1.2m") to a number, or null. */
function parseMoneyToken(token) {
  const cleaned = String(token)
    .trim()
    .replace(/^\$/, "")
    .replace(/,/g, "")
    .toLowerCase();
  if (cleaned === "") return null;
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*(k|m)?$/);
  if (!m) return null;
  let value = Number(m[1]);
  if (m[2] === "k") value *= 1_000;
  if (m[2] === "m") value *= 1_000_000;
  return Number.isFinite(value) ? value : null;
}

/**
 * Normalize one imported money value to a CensoredNumber:
 *   null                          — blank / unparseable → censored (rule 1)
 *   number                        — a point value (explicit 0 stays 0)
 *   { kind:"band", low, high, raw } — a reported range, kept as a band (rule 3)
 */
export function normalizeMoney(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "object") {
    // Already a band (e.g. re-imported from our own export) — keep it.
    if (raw.kind === "band" && Number.isFinite(raw.low) && Number.isFinite(raw.high)) {
      return { kind: "band", low: raw.low, high: raw.high, raw: String(raw.raw ?? `${raw.low}-${raw.high}`) };
    }
    return null;
  }
  const text = String(raw).trim();
  if (BLANK_TOKENS.has(text.toLowerCase())) return null;

  // Band forms: "$10k-$25k", "10,000 – 25,000", "10k to 25k".
  const bandMatch = text.match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
  if (bandMatch) {
    const low = parseMoneyToken(bandMatch[1]);
    const high = parseMoneyToken(bandMatch[2]);
    if (low !== null && high !== null && high >= low) {
      return { kind: "band", low, high, raw: text };
    }
    // Looked like a range but didn't parse — unknown, never a guess.
    return parseMoneyToken(text);
  }
  return parseMoneyToken(text);
}

/** Normalize an end_state string; blank/unrecognized → "open" (right-censored). */
export function normalizeEndState(raw) {
  const text = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return END_STATES.includes(text) ? text : "open";
}

/** Non-money numeric (days): blank → null, never 0. */
function normalizeDays(raw) {
  const v = normalizeMoney(raw);
  return typeof v === "number" ? v : null; // a "band" of days makes no sense; censor it
}

/** ISO date-ish string or null. Never invents a date. */
function normalizeDate(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (BLANK_TOKENS.has(text.toLowerCase())) return null;
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Normalize one imported reconciliation row (CSV/CMS export or guided form)
 * into a censoring-correct case_outcome patch. Pure: no clock, no I/O.
 * Unknown end_state → "open"; open → resolution fields right-censored.
 */
export function normalizeImportedRow(row) {
  const end_state = normalizeEndState(row.end_state);
  const open = end_state === "open";
  const patch = { end_state };

  for (const field of RESOLUTION_FIELDS) {
    patch[field] = open ? null : normalizeMoney(row[field]); // rule 2
  }
  patch.time_to_resolution_days = open ? null : normalizeDays(row.time_to_resolution_days);

  // Demand milestones survive right-censoring — they happen before resolution.
  patch.demand_sent_at = normalizeDate(row.demand_sent_at);
  for (const field of DEMAND_MONEY_FIELDS) {
    patch[field] = normalizeMoney(row[field]);
  }
  return patch;
}

// ---------------------------------------------------------------------------
// Version / audit increment (same discipline as the existing Outcome record):
// every write bumps outcome_version and appends the PRIOR snapshot to edits.
// ---------------------------------------------------------------------------

const OUTCOME_FIELDS = [
  "end_state",
  ...RESOLUTION_FIELDS,
  "time_to_resolution_days",
  "demand_sent_at",
  ...DEMAND_MONEY_FIELDS,
];

/** The audit snapshot of a record's current values (what edits[] stores). */
function snapshotOf(record) {
  const snap = {};
  for (const field of OUTCOME_FIELDS) snap[field] = record[field];
  snap.entered_by = record.entered_by;
  snap.entered_at = record.entered_at;
  snap.outcome_version = record.outcome_version;
  return snap;
}

/**
 * Apply a normalized patch to a prior case_outcome (or null for first write).
 * Returns the next record. Pure — caller supplies `now` and `enteredBy`.
 * Patch semantics: a field ABSENT from the patch keeps its prior value; a
 * field present (even as null) is an explicit statement, including "still
 * unknown". Version increments on every write; prior snapshot is appended.
 */
export function applyCaseOutcomePatch(prev, patch, { callId, firmId, enteredBy, now }) {
  const base = prev ?? {
    call_id: callId,
    firm_id: firmId,
    end_state: "open",
    gross: null,
    costs_advanced: null,
    lien_load: null,
    net_to_client: null,
    net_fee_to_firm: null,
    referral_fee: null,
    time_to_resolution_days: null,
    demand_sent_at: null,
    demand_amount: null,
    first_offer: null,
    entered_by: enteredBy,
    entered_at: now,
    outcome_version: 0,
    edits: [],
    created_at: now,
    updated_at: now,
  };

  const next = { ...base };
  for (const field of OUTCOME_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) next[field] = patch[field];
  }
  // Right-censoring holds after merging too: an open case never carries
  // realized resolution figures, whatever order patches arrived in.
  if (next.end_state === "open") {
    for (const field of RESOLUTION_FIELDS) next[field] = null;
    next.time_to_resolution_days = null;
  }

  next.entered_by = enteredBy;
  next.entered_at = now;
  next.updated_at = now;
  next.outcome_version = base.outcome_version + 1;
  next.edits = prev ? [...(prev.edits ?? []), snapshotOf(prev)] : [];
  return next;
}

/**
 * Apply a disposition write. The intake_feature_snapshot is IMMUTABLE: it is
 * written on first insert and NEVER overwritten afterward — you validate
 * against what was known at decision time, not what was learned later.
 */
export function applyCaseDisposition(prev, patch, { callId, firmId, now }) {
  const disposition = DISPOSITION_CODES.includes(patch.disposition)
    ? patch.disposition
    : "no_action";
  return {
    call_id: callId,
    firm_id: firmId,
    flag_id: patch.flag_id ?? prev?.flag_id ?? null,
    disposition,
    decided_by: patch.decided_by ?? prev?.decided_by ?? "unknown_role",
    decided_at: patch.decided_at ?? prev?.decided_at ?? now,
    // Immutability: prev's snapshot wins whenever one exists.
    intake_feature_snapshot:
      prev && Object.keys(prev.intake_feature_snapshot ?? {}).length > 0
        ? prev.intake_feature_snapshot
        : patch.intake_feature_snapshot ?? {},
    external_case_ref: patch.external_case_ref ?? prev?.external_case_ref ?? null,
    created_at: prev?.created_at ?? now,
  };
}
