// Bridge: turn a live AuditReport (ingest/audit.mjs buildAuditReport, built from
// REAL processed calls) into the DocData shape the PDF templates consume. This is
// what lets the Readout and Leak Report routes render real firm data instead of the
// demo fixture.
//
// The per-call audit result is intentionally thin (score, signability, leaked,
// feeAtRisk, evidence quotes, SOL). Fields the rich document model wants but the
// audit result does NOT carry — case type, taxonomy tag, intake-channel, per-firm
// intake metrics — get honest, conservative DEFAULTS here. We never invent specific
// facts: callers are anonymized, case type is the generic "Personal injury", and the
// analyst authors the narrative during review. Pure + unit-testable (no I/O).

import { urgencyBand } from "../../../analysis/sol.mjs";
import { citeFromTiming, feeDerivationLine } from "../../pdf/doc-helpers.mjs";
import { feeBandFromPoint, DEFAULT_CONTINGENCY } from "../../../analysis/fee-value.mjs";
import { normalize } from "../../../analysis/citation-guard.mjs";

function severityFromStatute(days) {
  const band = urgencyBand(days); // expired | critical | soon | ok | unknown
  if (band === "critical" || band === "expired") return "critical";
  if (band === "soon") return "significant";
  return "awareness";
}

// Turn a call's evidence quotes into CITED qualifying facts. Each quote is matched
// to a transcript citation ({verbatim_snippet, start_ms}) by verbatim overlap; the
// cite is formatted "[mm:ss]" from start_ms. Compliance §IV — "no citation, no
// claim": a quote with NO matching citation is DROPPED, never shipped with cite:"".
// If a quote is itself an object already carrying timing ({quote, start_ms} or
// {quote, timestamp}), that timing is used directly.
function citedFacts(quotes, citations = []) {
  const cites = Array.isArray(citations) ? citations : [];
  const out = [];
  for (const raw of quotes) {
    const text = typeof raw === "string" ? raw : String(raw?.quote ?? raw?.text ?? "");
    if (!text.trim()) continue;
    // 1) timing carried on the quote object itself.
    let cite = typeof raw === "object" ? citeFromTiming(raw) : "";
    // 2) otherwise, match against the stored transcript citations by verbatim text.
    if (!cite) {
      const nt = normalize(text);
      const hit = cites.find((c) => {
        const snip = normalize(c?.verbatim_snippet ?? c?.snippet ?? "");
        return snip && (snip.includes(nt) || nt.includes(snip));
      });
      if (hit) cite = citeFromTiming(hit);
    }
    if (!cite) continue; // no citation -> drop the fact
    out.push({ text: text.trim(), cite });
  }
  return out;
}

// report: AuditReport ({ calls, summary }). opts: firm labels + issued date/seq.
export function auditReportToDocData(report, opts = {}) {
  const calls = Array.isArray(report?.calls) ? report.calls : [];
  const summary = report?.summary ?? {};
  const done = calls.filter((c) => c && c.status === "done");
  const leakedCalls = done.filter((c) => c.leaked === true);

  const contingency = typeof opts.contingency === "number" ? opts.contingency : DEFAULT_CONTINGENCY;
  const contingencyLabel = opts.contingencyLabel || "33⅓% contingency";
  // Basis for the case-value band. Firm historicals when provided at onboarding,
  // else the honest default label. Never invented specifics.
  const caseValueBasis = opts.caseValueBasis || "single-point audit estimate widened to a conservative band";

  const leaks = leakedCalls.map((c, i) => {
    const days = c?.sol?.daysRemaining;
    const pointFeeCents = Math.round((Number(c.feeAtRisk) || 0) * 100);
    // Range, never a point estimate (methodology): treat the engine's point as the
    // conservative LOW anchor and derive the band from fee-value.mjs.
    const band = feeBandFromPoint(pointFeeCents, { contingency });
    const quotes = Array.isArray(c.evidenceQuotes) ? c.evidenceQuotes : [];
    const citations = Array.isArray(c.citations) ? c.citations : [];
    return {
      callerInitials: "—", // audit sessions are anonymized; never fabricate a name
      callerId: `#${String(i + 1).padStart(3, "0")}`,
      callDate: "",
      caseType: "Personal injury",
      // Cited facts only; uncited quotes are dropped (compliance §IV).
      qualifyingFacts: citedFacts(quotes, citations).slice(0, 3),
      feeLowCents: band.feeLowCents,
      feeHighCents: band.feeHighCents,
      caseLowCents: band.caseLowCents,
      caseHighCents: band.caseHighCents,
      feeDerivation:
        pointFeeCents > 0
          ? feeDerivationLine({
              feeLowCents: band.feeLowCents,
              feeHighCents: band.feeHighCents,
              caseLowCents: band.caseLowCents,
              caseHighCents: band.caseHighCents,
              contingencyLabel,
              basis: caseValueBasis,
            })
          : null,
      statuteDays: typeof days === "number" ? days : 9999,
      statuteExpired: c?.sol?.urgency === "expired",
      deadlineDate: c?.sol?.deadlineDate ?? null,
      saveStatus: "Draft ready",
      confidence: (c.signabilityScore ?? 0) >= 75 ? "strong" : "moderate",
      channel: "Uploaded call",
      severity: severityFromStatute(days),
      tag: "qualification-incomplete",
      excerpt: c.summary ? String(c.summary) : null,
    };
  });

  // Statement headline = arithmetic sum of the derived per-leak fee bands (a range,
  // never a point), consistent with the Leak Report's compose rule.
  const missedLowCents = leaks.reduce((a, l) => a + l.feeLowCents, 0);
  const missedHighCents = leaks.reduce((a, l) => a + l.feeHighCents, 0);
  const received = summary.callsReviewed ?? calls.length;
  const processed = done.length;
  const failed = calls.filter((c) => c && c.status === "error").length;
  const excluded = Math.max(0, received - processed - failed);

  return {
    firmName: opts.firmName || "Your intake calls",
    firmCode: opts.firmCode || "AUDIT",
    periodLabel: opts.periodLabel || "Leak Audit",
    periodStart: opts.periodStart || "",
    periodEnd: opts.periodEnd || "",
    analystName: opts.analystName, // undefined -> compose/PDF default to ANALYST.name
    issuedDate: opts.issuedDate || "",
    seq: opts.seq ?? 1,
    year: opts.year ?? (Number(String(opts.issuedDate || "").slice(0, 4)) || 0),
    missedLowCents,
    missedHighCents,
    leaksFlagged: leaks.length,
    savesInProgress: 0,
    leaks,
    metrics: [], // the audit result carries no per-firm intake metrics
    channels: [],
    reconciliation: { received, processed, excluded, failed },
    analystNote: "", // authored by the analyst during review
    couldNotDetermine: [],
  };
}
