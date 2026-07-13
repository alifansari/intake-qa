// Pure view helpers for the live-triage desk surface. No I/O. Shared by the
// server page and the client console so their labels and colors never drift.

export const TRIAGE_STATUSES = ["new", "callback", "contacted", "signed", "declined", "referred"];
export const OPEN_STATUSES = ["new", "callback", "contacted"];

export const STATUS_LABEL = {
  new: "New",
  callback: "Needs callback",
  contacted: "Contacted",
  signed: "Signed",
  declined: "Declined",
  referred: "Referred out",
};

// Next-step choices per status (drives the disposition buttons on a queue card).
export const STATUS_NEXT = {
  new: [
    { label: "Mark callback", to: "callback" },
    { label: "Contacted", to: "contacted" },
    { label: "Signed", to: "signed" },
  ],
  callback: [
    { label: "Contacted", to: "contacted" },
    { label: "Signed", to: "signed" },
    { label: "Referred out", to: "referred" },
  ],
  contacted: [
    { label: "Signed", to: "signed" },
    { label: "Didn't sign", to: "declined" },
    { label: "Referred out", to: "referred" },
  ],
  signed: [],
  declined: [],
  referred: [],
};

export const TERMINAL_STATUSES = ["signed", "declined", "referred"];
export function isTerminalStatus(s) {
  return TERMINAL_STATUSES.includes(s);
}

// Grade color -> a small semantic token set the UI maps to CSS.
export function gradeTone(color) {
  if (color === "green") return "good";
  if (color === "amber") return "warn";
  if (color === "red") return "bad";
  return "neutral";
}

// SOL urgency -> tone + a short human phrase.
export function solTone(urgency) {
  switch (urgency) {
    case "expired":
      return { tone: "bad", label: "Deadline passed" };
    case "critical":
      return { tone: "bad", label: "Deadline within 30 days" };
    case "soon":
      return { tone: "warn", label: "Deadline within 90 days" };
    case "ok":
      return { tone: "good", label: "Deadline not near" };
    default:
      return { tone: "neutral", label: "Deadline unknown" };
  }
}

// Queue ordering: attorney-review and urgent SOL first, then newest. This is
// the "call these first" order the intake team works top-down.
export function triageQueueSort(rows) {
  const rank = (r) => {
    if (r.attorney_review) return 0;
    if (r.sol_urgency === "expired" || r.sol_urgency === "critical") return 1;
    if (r.grade_letter === "A") return 2;
    if (r.sol_urgency === "soon") return 3;
    return 4;
  };
  return [...rows].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return String(b.created_at).localeCompare(String(a.created_at));
  });
}

// A one-line "why call now" for a queue card.
export function urgencyReason(row) {
  if (row.attorney_review) return "Attorney review flagged";
  if (row.sol_urgency === "expired") return "Filing deadline appears passed";
  if (row.sol_urgency === "critical") return "Filing deadline within 30 days";
  if (row.grade_letter === "A") return "Strong file - sign candidate";
  if (row.sol_urgency === "soon") return "Filing deadline within 90 days";
  return null;
}
