// Rescue list -> the firm's CRM, as tagged prioritized records (module: the
// "hands back on their tool" leg of the rescue layer).
//
// v1 is a CSV the firm re-imports (or works from) plus the existing mock CRM
// dispatch in rescue/delivery.mjs — LIVE CRM writes stay behind the
// per-integration sign-off gate (ROADMAP.md). The CSV's new_status column uses
// a dedicated status so the write-back can never collide with an active Chase
// sequence: the firm creates "Rescued — Review" once in their CRM and every
// rescued lead lands there, out of the drip, flagged for a human callback.
//
// Value is a TIER with its cited basis — never a dollar figure (invariant IV /
// engine-v2 P0-1). Pure module: no I/O.

export const RESCUE_STATUS_LABEL = "Rescued — Review";

const HEADER = [
  "external_lead_id",
  "prospect_name",
  "prospect_phone",
  "new_status",
  "priority",
  "rescue_tag",
  "value_tier",
  "value_tier_basis",
  "triage_gap",
  "sol_deadline_estimate",
  "callback_note",
];

const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// items: rescue packet items joined with their crm_leads provenance + ledger
// tag (see the rescue API route). Works for call-flow flags too — the CRM
// columns are simply blank and the firm matches by name/phone.
export function rescueListToCrmCsv(items) {
  const rows = (items ?? []).map((item) =>
    [
      item.external_lead_id ?? "",
      item.prospect_name ?? "",
      item.prospect_phone ?? "",
      RESCUE_STATUS_LABEL,
      item.rank ?? "",
      item.rescue_tag ?? "",
      item.value_tier ?? "standard",
      item.value_tier_basis ?? "",
      item.gap_kind ? String(item.gap_kind).replace(/_/g, " ") : "",
      item.sol_deadline ?? "",
      item.diagnosis ?? "",
    ]
      .map(esc)
      .join(",")
  );
  return [HEADER.join(","), ...rows].join("\n");
}
