// Pure helpers + verbatim fixed text for the recovery-desk PDF documents.
// Kept as plain JS (with a sibling .d.ts) so it is unit-testable under node:test
// AND importable from the .tsx templates. No React, no I/O here.
//
// Formatting conventions (from the design system): en-dash ranges, no cents
// unless needed, dates as "Mon D, YYYY", sentence case, no exclamation marks.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtMoney(cents) {
  const dollars = Math.round(Number(cents) / 100);
  return "$" + dollars.toLocaleString("en-US");
}

// "$12,000 to $28,000", range only, never a point estimate.
export function fmtMoneyRange(lowCents, highCents) {
  return `${fmtMoney(lowCents)} to ${fmtMoney(highCents)}`;
}

// Citation timestamp: milliseconds -> "[mm:ss]" (bracketed, mm:ss like the
// transcript). Used to turn a transcript_citations start_ms into a printable
// cite. Returns "" for a null/NaN input so callers can DROP an uncited fact.
export function msToTimestamp(ms) {
  if (ms == null) return ""; // null/undefined is "no timing", not 0
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "";
  const total = Math.floor(n / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`;
}

// Normalize a citation into a printable "[mm:ss]" cite string, from whatever the
// upstream carries: a start_ms (transcript_citations), or an already-formatted
// "mm:ss" / "[mm:ss]" / "mm:ss-mm:ss" timestamp string (scoring output). Returns
// "" when there is no usable time source — the signal to DROP the fact rather
// than ship it uncited (compliance §IV: no citation, no claim).
/** @param {{ start_ms?: number | null, startMs?: number | null, timestamp?: string | null }} [c] */
export function citeFromTiming({ start_ms, startMs, timestamp } = {}) {
  const ms = start_ms ?? startMs;
  if (ms != null) {
    const t = msToTimestamp(ms);
    if (t) return t;
  }
  if (typeof timestamp === "string") {
    // Accept "04:12", "[04:12]", or a range "00:38-01:10" -> take the first.
    const m = timestamp.match(/(\d{1,2}):(\d{2})/);
    if (m) return `[${m[1].padStart(2, "0")}:${m[2]}]`;
  }
  return "";
}

// Per-exhibit one-line fee derivation (item P0-C). Shows the arithmetic so a
// partner can check it: fee range = case-value range × contingency, with the
// stated basis. Ranges only; never a point estimate. e.g.
// "Est. fee value: $18,000 to $45,000 = case value $54,000 to $135,000 × 33⅓%
//  contingency (your 2025 auto average)."
/** @param {{ feeLowCents: number, feeHighCents: number, caseLowCents: number, caseHighCents: number, contingencyLabel?: string, basis?: string | null }} a */
export function feeDerivationLine({ feeLowCents, feeHighCents, caseLowCents, caseHighCents, contingencyLabel = "33⅓% contingency", basis }) {
  const fee = fmtMoneyRange(feeLowCents, feeHighCents);
  const cas = fmtMoneyRange(caseLowCents, caseHighCents);
  const basisSuffix = basis ? ` (${basis})` : "";
  return `Est. fee value: ${fee} = case value ${cas} × ${contingencyLabel}${basisSuffix}`;
}

// Published false-alarm-rate footer (item P0-D). Rides on EVERY deliverable.
// `ratePct` is a number 0..100 (already rounded) or null. `updatedDate` is a
// "Mon D, YYYY" string or null. When the rate is null we still point to the
// published source rather than assert a number we cannot back.
/** @param {{ ratePct?: number | null, updatedDate?: string | null }} [a] */
export function falseAlarmFooter({ ratePct = null, updatedDate = null } = {}) {
  if (ratePct == null) {
    return "Our current false-alarm rate is published at plaintiffops.com/calibration.";
  }
  const when = updatedDate ? `, updated ${updatedDate}` : "";
  return `Our current published false-alarm rate is ${ratePct}% (plaintiffops.com/calibration${when}).`;
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
  if (d < 90) return `Statute: ~${d} days remaining (est.), time-sensitive`;
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

// Derive a short, stable FIRM-CODE from a firm name when one isn't assigned by
// hand. Confirmed scheme (Ali, July 2026): [FIRM-CODE]-[YYYY]-[NN]. Takes the
// first two significant words (drops "law", "firm", "&", "the", etc.), keeps
// letters only, uppercases, and caps at 6 chars. Deterministic — same name always
// yields the same code. e.g. "Sunset & Vine Injury Law" -> "SUNVIN".
const CODE_STOPWORDS = new Set(["the", "and", "of", "law", "firm", "group", "llp", "llc", "pc", "apc", "injury", "attorneys", "attorney", "office", "offices"]);
export function deriveFirmCode(firmName) {
  const words = String(firmName || "")
    .replace(/\(DEMO\)|\(TEST\)/gi, "")
    .split(/[^A-Za-z]+/)
    .filter((w) => w && !CODE_STOPWORDS.has(w.toLowerCase()));
  const base = (words.length ? words : String(firmName || "").split(/[^A-Za-z]+/).filter(Boolean))
    .slice(0, 2)
    .map((w) => w.toUpperCase())
    .join("");
  return (base || "FIRM").slice(0, 6);
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
  critical: "Critical: recoverable and time-sensitive",
  significant: "Significant: recoverable",
  awareness: "For awareness: pattern or process",
};

// ── Verbatim fixed blocks (ship exactly; avoid reserved accountancy terms) ──

export const ATTESTATION = `Analyst's attestation
I personally reviewed the calls, flags, and figures in this statement before it was issued. Each qualifying fact cited here is tied to a specific point in the call recording, and each estimated fee value is presented as a range under the methodology in Appendix A, not as a guarantee of outcome or recovery. This is an independent business analysis of intake performance. It is not an audit, an accounting engagement, a financial statement, or legal advice, and it should not be relied on as any of those.`;

export const FOOTNOTES = {
  fee: `¹ Estimated fee value. Ranges are estimates under the methodology in Appendix A. They use your firm's own historical outcomes first where available, and named published sources otherwise. Ranges exclude case-specific facts we cannot see (for example, policy limits, comparative fault, and prior injuries). They are not guarantees.`,
  confidence: `² Confidence tier. "Strong flag" and "Moderate flag" reflect how completely the qualifying facts were captured on the call and how clearly the PNC went unsigned. They are not predictions of case value or of winning.`,
  reconciliation: `³ Reconciliation. Every call we received is accounted for in the Calls & Reconciliation table: received = processed + excluded + failed, with a stated reason for each exclusion or failure.`,
};

export const AGENCY_INTRO = `Where your calls came from
For each intake channel (your staff, your answering service, your AI receptionist), this section shows call volume, qualification completeness, and flagged leaks. It is meant to show which channels deliver signable PNCs, not to assign blame.`;

export const COACHING_XREF = `Coaching clips for this period are in Appendix B. Each clip is a short excerpt with one teaching point, chosen to help, not to single anyone out.`;

export const READOUT_LIMITS_INTRO = `What we could not determine
We are deliberate about the limits of this review. The items below are things we could not confirm from the call recordings alone. For example, whether a PNC later called back on another line, signed elsewhere, or had a policy-limits problem we can't see. We list them so you know exactly what this readout does and does not establish.`;

export const READOUT_NEXT_STEPS = `If this is useful
If you'd like, we can run this every month as your independent recovery desk. The first 30 days are free, with no obligation and no card. If it isn't earning its keep, we'll say so ourselves.`;

// Intake-performance metric definitions (verbatim names).
export const INTAKE_METRICS = [
  { key: "answer_rate", name: "Answer rate", def: "Share of inbound intake calls answered live (not voicemail/abandoned)." },
  { key: "qualification", name: "Qualification completeness", def: "Share of answered PNC calls where the core qualifying facts were gathered." },
  { key: "followup", name: "Follow-up rate", def: "Share of qualified-but-unsigned PNCs who received a timely follow-up." },
  { key: "speed", name: "Speed-to-callback", def: "Median time from missed/again-needed contact to the firm's callback." },
];
