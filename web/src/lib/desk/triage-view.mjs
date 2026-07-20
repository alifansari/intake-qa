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

// Plain-language labels for the live verdict. Intake staff are not lawyers, so
// the console must never render a raw enum ("decline_with_grace", "indeterminate").
export const DISPOSITION_PLAIN = {
  sign_now: "Sign now",
  develop: "Worth developing",
  refer_out: "Refer out",
  decline_with_grace: "Decline",
};
// value_tier speaks to money potential, without inventing a dollar figure at
// intake (compliance §IV: no invented valuation before the facts are in).
export const VALUE_TIER_PLAIN = {
  high: "High value",
  standard: "Standard value",
  low: "Low value",
  indeterminate: "Value unclear",
};
export function dispositionPlain(d) {
  return DISPOSITION_PLAIN[d] || String(d || "").replaceAll("_", " ");
}
export function valueTierPlain(v) {
  return VALUE_TIER_PLAIN[v] || String(v || "").replaceAll("_", " ");
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

// B-029 — the ASYMMETRIC OVERRIDE (cockpit-spec). A deterministic engine is only
// trustworthy if a human can overrule it — but overruling toward a NO is where
// accountability matters. Escalating toward caution (keep a marginal case alive,
// send to attorney) is FREE; DECLINING/REFERRING a case the engine graded VIABLE
// (sign_now / develop) is an OVERRIDE that must carry a logged reason. That
// reason is both the accountability record and the "which of your no's went
// against the engine" dataset (the decline-capture moat). Returns true when the
// move needs the reason gate.
export function isEngineOverride(disposition, toStatus) {
  const viable = disposition === "sign_now" || disposition === "develop";
  const declineDirection = toStatus === "declined" || toStatus === "referred";
  return viable && declineDirection;
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

// B-026 — aggregate the OPEN queue into a filing-deadline WATCH for the safety-net
// panel: how many open cases carry a computed clock, how many are pressing
// (expired / within 30d / within 90d), and how many have NO clock yet (no incident
// date captured → sol_urgency "unknown"). Pure; terminal cases (signed/declined/
// referred) never count — a closed case can't have a deadline slip.
// B-026 slice 3 — the persisted sol_urgency is a SNAPSHOT from score/entry time;
// as days pass a "soon" case silently becomes "critical" (an under-warning that,
// for a filing deadline, is the dangerous direction). The deadline DATE is
// stable, so recompute urgency from it at render. Bands mirror analysis/sol.mjs
// urgencyBand — kept inline so this file stays client-safe (TriageConsole, a
// client component, imports from here).
export function liveUrgency(solDeadline, now = new Date()) {
  if (!solDeadline) return "unknown";
  const s = String(solDeadline);
  const dl = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(dl.getTime())) return "unknown";
  const days = Math.floor((dl.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "soon";
  return "ok";
}

// Return a copy of a triage row with sol_urgency refreshed from its deadline.
// Render-time ONLY — never writes the DB. When there's no deadline, the stored
// value (usually "unknown") stands. Overlaying here means deadlineWatch,
// triageQueueSort, and the card display all read a current value with no change.
export function withLiveUrgency(row, now = new Date()) {
  if (!row || typeof row !== "object") return row;
  const u = row.sol_deadline ? liveUrgency(row.sol_deadline, now) : (row.sol_urgency ?? "unknown");
  return { ...row, sol_urgency: u };
}

const SOL_CLOCK_URGENCIES = new Set(["ok", "soon", "critical", "expired"]);
export function deadlineWatch(rows) {
  const out = { openTotal: 0, withClock: 0, expired: 0, critical: 0, soon: 0, noClock: 0 };
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!OPEN_STATUSES.includes(String(r?.status ?? "new"))) continue;
    out.openTotal += 1;
    const u = String(r?.sol_urgency ?? "unknown");
    if (SOL_CLOCK_URGENCIES.has(u)) {
      out.withClock += 1;
      if (u === "expired") out.expired += 1;
      else if (u === "critical") out.critical += 1;
      else if (u === "soon") out.soon += 1;
    } else {
      out.noClock += 1;
    }
  }
  return out;
}
