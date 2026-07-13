// Bridge: turn a firm’s leaked-signable flags for a billing period into the
// DocData shape the Statement PDF consumes — the SUBSCRIPTION-phase artifact.
//
// Unlike the audit (anonymous, single-point benchmark fee), this is the firm’s
// OWN desk data: it uses the case type the desk already stores on each flag and
// the SAME vetted fee source the desk shows (fee_value_ranges × contingency),
// so the monthly statement and the live desk never contradict each other on a
// dollar figure (backlog B-014). Pure + unit-testable: the caller fetches the
// flags, their citations, and provides a `feeRangeFor(caseType)` resolver and a
// period reconciliation; this module does no I/O.

import { feeDerivationLine, citeFromTiming } from "../../pdf/doc-helpers.mjs";
import { normalize } from "../../../analysis/citation-guard.mjs";
import { DEFAULT_CONTINGENCY } from "../../../analysis/fee-value.mjs";

// Desk save_status (flag_status) → the human label the statement prints.
const SAVE_STATUS_LABEL = {
  needs_callback: "Needs a callback",
  reached_out: "Left a message",
  back_in_touch: "Spoke to them",
  signed: "Signed",
  didnt_sign: "Passed",
  bad_number: "Bad number",
};

// Turn stored transcript citations into up-to-3 CITED qualifying facts. Same
// §IV rule as the audit path: a snippet with no timing is dropped, never shipped
// with an empty cite.
function citedFacts(citations = []) {
  const out = [];
  for (const c of Array.isArray(citations) ? citations : []) {
    const text = String(c?.verbatim_snippet ?? c?.snippet ?? "").trim();
    if (!text) continue;
    const cite = citeFromTiming(c);
    if (!cite) continue;
    out.push({ text, cite });
    if (out.length === 3) break;
  }
  return out;
}

function initialsOf(name) {
  if (!name) return "—";
  const parts = String(name).replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean);
  return letters.length ? letters.join(".") + "." : "—";
}

/**
 * @param {{
 *   firm: { id?: unknown, name?: string, code?: string },
 *   flags: Array<Record<string, unknown>>,     // leaked flags for the period (+ .citations attached)
 *   feeRangeFor: (caseType: string|null) => ({ lowCents: number, highCents: number } | null),
 *   reconciliation?: { received: number, processed: number, excluded: number, failed: number },
 *   period: { label: string, start?: string, end?: string, year: number, seq?: number },
 *   issuedDate: string,
 *   contingency?: number,
 *   contingencyLabel?: string,
 * }} input
 * @returns DocData
 */
export function composeMonthlyStatement({
  firm,
  flags,
  feeRangeFor,
  reconciliation = null,
  period,
  issuedDate,
  contingency = DEFAULT_CONTINGENCY,
  contingencyLabel = "33⅓% contingency",
}) {
  const TERMINAL = new Set(["signed", "didnt_sign", "bad_number"]);
  const list = Array.isArray(flags) ? flags : [];

  const leaks = list.map((f, i) => {
    const caseType = f.case_type ? String(f.case_type) : "Signable case";
    const fee = feeRangeFor(caseType); // vetted case-value range × contingency, or null
    const feeLowCents = fee ? fee.lowCents : 0;
    const feeHighCents = fee ? fee.highCents : 0;
    // Reconstruct the pre-contingency case-value band for the derivation line
    // (only when a fee is actually known — never fabricate a band from $0).
    const caseLowCents = fee && contingency > 0 ? Math.round(feeLowCents / contingency) : undefined;
    const caseHighCents = fee && contingency > 0 ? Math.round(feeHighCents / contingency) : undefined;
    const status = f.save_status ?? "needs_callback";
    const tier = f.confidence_tier === "strong" ? "strong" : "moderate";
    return {
      callerInitials: initialsOf(f.caller_name),
      callerId: `#A-${String(f.id ?? i + 1).replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`,
      callDate: f.received_at ? String(f.received_at) : "",
      caseType,
      qualifyingFacts: citedFacts(f.citations),
      feeLowCents,
      feeHighCents,
      ...(caseLowCents != null ? { caseLowCents, caseHighCents } : {}),
      feeDerivation:
        fee && caseLowCents != null
          ? feeDerivationLine({
              feeLowCents,
              feeHighCents,
              caseLowCents,
              caseHighCents,
              contingencyLabel,
              basis: "published case-value range for this case type",
            })
          : null,
      // The per-flag statute clock isn’t captured yet (backlog); the analyst
      // confirms deadlines during review, so we don’t invent one here.
      statuteDays: 9999,
      saveStatus: SAVE_STATUS_LABEL[status] ?? "Needs a callback",
      confidence: tier,
      channel: "Intake call",
      severity: tier === "strong" ? "significant" : "awareness",
      tag: "qualification-incomplete",
      excerpt: f.reason ? String(f.reason) : null,
    };
  });

  // Headline = arithmetic sum of the per-leak fee bands (a range, never a point).
  const missedLowCents = leaks.reduce((a, l) => a + l.feeLowCents, 0);
  const missedHighCents = leaks.reduce((a, l) => a + l.feeHighCents, 0);
  const savesInProgress = list.filter((f) => {
    const s = f.save_status ?? "";
    return s === "reached_out" || s === "back_in_touch";
  }).length;

  const recon = reconciliation ?? {
    received: list.length,
    processed: list.length,
    excluded: 0,
    failed: 0,
  };

  return {
    firmName: firm?.name || "Your firm",
    firmCode: firm?.code || "FIRM",
    periodLabel: period.label,
    periodStart: period.start || "",
    periodEnd: period.end || "",
    analystName: undefined, // compose/PDF default to ANALYST.name
    issuedDate: issuedDate || "",
    seq: period.seq ?? 1,
    year: period.year,
    missedLowCents,
    missedHighCents,
    leaksFlagged: leaks.length,
    savesInProgress,
    leaks,
    metrics: [],
    channels: [],
    reconciliation: recon,
    analystNote: "", // authored by the analyst during review
    couldNotDetermine: [],
    // Passthrough count so the caller can note terminal (already-handled) cases.
    resolvedCount: list.filter((f) => TERMINAL.has(f.save_status ?? "")).length,
  };
}
