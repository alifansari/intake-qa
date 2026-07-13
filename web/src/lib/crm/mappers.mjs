// ============================================================================
// CRM field mappers — canonical record → per-CRM payload. Pure (Phase 7).
//
// Contract (see migration 0029 header):
//   * NATIVE FIELDS OVER NOTES-BLOBS: everything with a native home gets one;
//     whatever has none degrades gracefully into ONE clearly-labeled notes
//     block — never silently dropped, never a second dumping ground.
//   * ENUM NORMALIZATION per CRM (matter types differ by product).
//   * LEAST DATA NECESSARY: the mapper output contains mapped fields + the
//     labeled notes block. Raw event trails, transcripts, and provenance
//     internals never leave the canonical store.
//   * THE CONSENT FLAG TRAVELS: consent_version/consent_at are mapped into
//     every payload unconditionally.
//   * AI-CAPTURED IS VISIBLE: every payload carries source='intake_agent' and
//     a review flag so the CRM side renders it distinctly until verified.
//
// A firm’s firm_integrations.field_map (0012) overrides DEFAULT_FIELD_MAPS
// key-by-key; unknown target fields are allowed (the CRM validates).
// ============================================================================

export const PROVIDERS = ["leaddocket", "filevine", "litify", "clio", "mock"];

// Canonical → provider-native case-type enums.
const MATTER_ENUMS = {
  leaddocket: { mva: "Auto Accident", premises: "Premises Liability", dog_bite: "Animal Bite", other: "Other", unknown: "Unknown" },
  filevine: { mva: "Motor Vehicle Collision", premises: "Slip and Fall", dog_bite: "Dog Bite", other: "Other Injury", unknown: "Intake" },
  litify: { mva: "litify_pm__Auto", premises: "litify_pm__Premises", dog_bite: "litify_pm__AnimalBite", other: "litify_pm__Other", unknown: "litify_pm__Intake" },
  clio: { mva: "Personal Injury - Auto", premises: "Personal Injury - Premises", dog_bite: "Personal Injury - Dog Bite", other: "Personal Injury - Other", unknown: "Personal Injury" },
  mock: { mva: "MVA", premises: "PREMISES", dog_bite: "DOG_BITE", other: "OTHER", unknown: "UNKNOWN" },
};

// Default canonical-path → provider-field maps. Firm field_map overrides.
export const DEFAULT_FIELD_MAPS = {
  leaddocket: {
    "contact.first_name": "FirstName",
    "contact.phone": "Phone",
    "matter_type": "CaseType",
    "incident.date": "IncidentDate",
    "incident.narrative": "Summary",
    "bucket": "IntakeDisposition",
    "confidence": "IntakeScore",
  },
  filevine: {
    "contact.first_name": "clientFirstName",
    "contact.phone": "clientPhone",
    "matter_type": "projectTypeName",
    "incident.date": "incidentDate",
    "incident.narrative": "description",
    "bucket": "intakeOutcome",
    "confidence": "intakeConfidence",
  },
  litify: {
    "contact.first_name": "litify_pm__First_Name__c",
    "contact.phone": "litify_pm__Phone__c",
    "matter_type": "litify_pm__Case_Type__c",
    "incident.date": "litify_pm__Incident_Date__c",
    "incident.narrative": "litify_pm__Description__c",
    "bucket": "Intake_Disposition__c",
    "confidence": "Intake_Confidence__c",
  },
  clio: {
    "contact.first_name": "first_name",
    "contact.phone": "phone_number",
    "matter_type": "practice_area",
    "incident.date": "matter_stage_date",
    "incident.narrative": "description",
    "bucket": "custom_intake_disposition",
    "confidence": "custom_intake_confidence",
  },
  mock: {
    "contact.first_name": "first_name",
    "contact.phone": "phone",
    "matter_type": "case_type",
    "incident.date": "incident_date",
    "incident.narrative": "narrative",
    "bucket": "disposition",
    "confidence": "confidence",
  },
};

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Map a canonical record to a provider payload.
 * @returns {{ provider, fields:object, notes:string, consent:object, source:string,
 *             review_required:boolean, unmapped_keys:string[] }}
 */
export function mapRecord(record, provider, firmFieldMap = {}) {
  if (!PROVIDERS.includes(provider)) throw new Error(`unknown provider: ${provider}`);
  const map = { ...DEFAULT_FIELD_MAPS[provider], ...(firmFieldMap ?? {}) };
  const enums = MATTER_ENUMS[provider];

  const fields = {};
  for (const [path, target] of Object.entries(map)) {
    let value = getPath(record, path);
    if (value === undefined || value === null || value === "") continue;
    if (path === "matter_type") value = enums[value] ?? enums.unknown;
    fields[target] = value;
  }

  // Graceful degradation: path_data facts without a native field land in ONE
  // labeled notes block (structured, readable, clearly AI-captured).
  const unmapped = [];
  const noteLines = [];
  for (const [k, v] of Object.entries(record.path_data ?? {})) {
    if (k === "photos") {
      if (Array.isArray(v) && v.length) noteLines.push(`photos attached: ${v.length}`);
      continue;
    }
    if (v === null || v === undefined || v === "") continue;
    unmapped.push(k);
    noteLines.push(`${k}: ${String(v)}`);
  }
  if (Array.isArray(record.routing?.reasons) && record.routing.reasons.length) {
    noteLines.push(`routing reasons: ${record.routing.reasons.join(", ")}`);
  }
  const notes = noteLines.length
    ? `[AI-captured intake — unverified until reviewed]\n${noteLines.join("\n")}`
    : "[AI-captured intake — unverified until reviewed]";

  return {
    provider,
    fields,
    notes,
    // The consent flag TRAVELS WITH THE RECORD, always.
    consent: { version: record.consent_version ?? null, at: record.consent_at ?? null },
    source: "intake_agent",
    review_required: true, // AI-captured data is visually distinct until verified
    unmapped_keys: unmapped,
  };
}
