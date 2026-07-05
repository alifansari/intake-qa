// Pure helpers + verbatim fixed text for the recovery-desk PDF documents.
// Kept as plain JS (with a sibling .d.ts) so it is unit-testable under node:test
// AND importable from the .tsx templates. No React, no I/O here.
//
// Formatting conventions (from the design system): en-dash ranges, no cents
// unless needed, dates as "Mon D, YYYY", sentence case, no exclamation marks.

const EN_DASH = "–";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtMoney(cents) {
  const dollars = Math.round(Number(cents) / 100);
  return "$" + dollars.toLocaleString("en-US");
}

// "$12,000–$28,000" — range only, never a point estimate.
export function fmtMoneyRange(lowCents, highCents) {
  return `${fmtMoney(lowCents)}${EN_DASH}${fmtMoney(highCents)}`;
}

// "Jul 5, 2026" from an ISO date/string.
export function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Statute-clock phrasing (verbatim rules). Under 90 days → days + time-sensitive.
export function statuteClock(daysRemaining) {
  const d = Math.max(0, Math.round(Number(daysRemaining)));
  if (d < 90) return `Statute: ~${d} days remaining (est.) ${EN_DASH} time-sensitive`;
  const months = Math.round(d / 30);
  return `Statute: ~${months} months remaining (est.)`;
}

// Statute urgency band for coloring in the app (gray/amber/red).
export function statuteBand(daysRemaining) {
  const d = Number(daysRemaining);
  if (d < 90) return "red";
  if (d <= 182) return "amber";
  return "neutral";
}

// Reconciliation invariant: received = processed + excluded + failed.
export function reconciles({ received, processed, excluded, failed }) {
  return Number(received) === Number(processed) + Number(excluded) + Number(failed);
}

// One-word period comparison verdict.
export function trendVerdict(current, prior) {
  if (prior == null) return "held";
  if (current > prior) return "improved";
  if (current < prior) return "declined";
  return "held";
}

// Document IDs: [FIRM-CODE]-[YYYY]-[NN] and [FIRM-CODE]-LA-[YYYY]-[NN].
export function statementId(firmCode, year, nn) {
  return `${firmCode}-${year}-${String(nn).padStart(2, "0")}`;
}
export function readoutId(firmCode, year, nn) {
  return `${firmCode}-LA-${year}-${String(nn).padStart(2, "0")}`;
}

// Finalized save-status vocabulary (used identically app + statement + machine).
export const SAVE_STATUSES = [
  "Draft ready",
  "Sent by staff",
  "Contact resumed",
  "Signed",
  "Declined",
  "Statute lapsed",
];

// Severity tiers for the Leak Audit readout (findings-first).
export const SEVERITY_TIERS = {
  critical: "Critical — recoverable and time-sensitive",
  significant: "Significant — recoverable",
  awareness: "For awareness — pattern or process",
};

// ── Verbatim fixed blocks (ship exactly; avoid reserved accountancy terms) ──

export const ATTESTATION = `Analyst's attestation
I personally reviewed the calls, flags, and figures in this statement before it was issued. Each qualifying fact cited here is tied to a specific point in the call recording, and each estimated fee value is presented as a range under the methodology in Appendix A — not as a guarantee of outcome or recovery. This is an independent business analysis of intake performance. It is not an audit, an accounting engagement, a financial statement, or legal advice, and it should not be relied on as any of those.`;

export const FOOTNOTES = {
  fee: `¹ Estimated fee value. Ranges are estimates under the methodology in Appendix A. They use your firm's own historical outcomes first where available, and named published sources otherwise. Ranges exclude case-specific facts we cannot see (for example, policy limits, comparative fault, and prior injuries). They are not guarantees.`,
  confidence: `² Confidence tier. "Strong flag" and "Moderate flag" reflect how completely the qualifying facts were captured on the call and how clearly the PNC went unsigned. They are not predictions of case value or of winning.`,
  reconciliation: `³ Reconciliation. Every call we received is accounted for in the Calls & Reconciliation table: received = processed + excluded + failed, with a stated reason for each exclusion or failure.`,
};

export const AGENCY_INTRO = `Where your calls came from
For each intake channel (your staff, your answering service, your AI receptionist), this section shows call volume, qualification completeness, and flagged leaks. It is meant to show which channels deliver signable PNCs — not to assign blame.`;

export const COACHING_XREF = `Coaching clips for this period are in Appendix B. Each clip is a short excerpt with one teaching point, chosen to help — not to single anyone out.`;

export const READOUT_LIMITS_INTRO = `What we could not determine
We are deliberate about the limits of this review. The items below are things we could not confirm from the call recordings alone — for example, whether a PNC later called back on another line, signed elsewhere, or had a policy-limits problem we can't see. We list them so you know exactly what this readout does and does not establish.`;

export const READOUT_NEXT_STEPS = `If this is useful
If you'd like, we can run this every month as your independent recovery desk. The first 30 days are free, with no obligation and no card. If it isn't earning its keep, we'll say so ourselves.`;

// Intake-performance metric definitions (verbatim names).
export const INTAKE_METRICS = [
  { key: "answer_rate", name: "Answer rate", def: "Share of inbound intake calls answered live (not voicemail/abandoned)." },
  { key: "qualification", name: "Qualification completeness", def: "Share of answered PNC calls where the core qualifying facts were gathered." },
  { key: "followup", name: "Follow-up rate", def: "Share of qualified-but-unsigned PNCs who received a timely follow-up." },
  { key: "speed", name: "Speed-to-callback", def: "Median time from missed/again-needed contact to the firm's callback." },
];
