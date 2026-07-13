// Small presentational helpers shared by the Calls ledger and the per-call
// readout. Pure — no I/O. Keeps the two pages consistent.

// Anonymized initials for a caller name (falls back to "PNC" = prospective new
// client) — the ledger never prints a full name in the list view.
export function initialsOf(name) {
  if (!name) return "PNC";
  const parts = String(name).replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean);
  return letters.length ? letters.join(".") + "." : "PNC";
}

// A stable, human-friendly call id. Sample rows carry display_id; real rows get
// a short #A-XXXX derived from the primary key.
export function displayIdOf(row) {
  if (row?.display_id) return row.display_id;
  const raw = String(row?.call_id ?? "").replace(/[^a-zA-Z0-9]/g, "");
  return `#A-${raw.slice(-4).toUpperCase() || "0000"}`;
}

// The ledger "Status" cell — plain language, no jargon.
export function ledgerStatus(row) {
  const s = row?.status;
  if (s && s !== "analyzed") {
    if (String(s).startsWith("failed")) return "Could not read";
    if (String(s).startsWith("excluded")) return "Not an intake call";
    return "Being read";
  }
  if (row?.overall_score == null) return "Being read";
  if (row?.lost_signable && row?.save_status === "signed") return "Won back";
  if (row?.lost_signable && row?.save_status !== "signed") return "On the table";
  return "Read ✓";
}

// The ledger "What to do" cell — the one next action, or nothing.
export function whatToDo(row) {
  const s = row?.status;
  if (s && String(s).startsWith("failed")) return "Nothing — we re-request it";
  if (s && String(s).startsWith("excluded")) return "Nothing — set aside";
  if (row?.overall_score == null) return "Nothing yet — being read";
  if (row?.lost_signable && row?.save_status !== "signed") return "Call this caller back";
  return "Nothing — accounted for";
}
