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

function severityFromStatute(days) {
  const band = urgencyBand(days); // expired | critical | soon | ok | unknown
  if (band === "critical" || band === "expired") return "critical";
  if (band === "soon") return "significant";
  return "awareness";
}

// report: AuditReport ({ calls, summary }). opts: firm labels + issued date/seq.
export function auditReportToDocData(report, opts = {}) {
  const calls = Array.isArray(report?.calls) ? report.calls : [];
  const summary = report?.summary ?? {};
  const done = calls.filter((c) => c && c.status === "done");
  const leakedCalls = done.filter((c) => c.leaked === true);

  const leaks = leakedCalls.map((c, i) => {
    const days = c?.sol?.daysRemaining;
    const feeCents = Math.round((Number(c.feeAtRisk) || 0) * 100);
    const quotes = Array.isArray(c.evidenceQuotes) ? c.evidenceQuotes.map(String) : [];
    return {
      callerInitials: "—", // audit sessions are anonymized; never fabricate a name
      callerId: `#${String(i + 1).padStart(3, "0")}`,
      callDate: "",
      caseType: "Personal injury",
      qualifyingFacts: quotes.slice(0, 3).map((q) => ({ text: q, cite: "" })),
      feeLowCents: feeCents,
      feeHighCents: feeCents, // point estimate from the audit; shown as-is
      statuteDays: typeof days === "number" ? days : 9999,
      statuteExpired: c?.sol?.urgency === "expired",
      deadlineDate: c?.sol?.deadlineDate ?? null,
      saveStatus: "Draft ready",
      confidence: (c.signabilityScore ?? 0) >= 75 ? "strong" : "moderate",
      channel: "Uploaded call",
      severity: severityFromStatute(days),
      tag: "qualification-incomplete",
      excerpt: quotes[0] ?? (c.summary ? String(c.summary) : ""),
    };
  });

  const totalCents = Math.round((Number(summary.totalFeeAtRisk) || 0) * 100);
  const received = summary.callsReviewed ?? calls.length;
  const processed = done.length;
  const failed = calls.filter((c) => c && c.status === "error").length;
  const excluded = Math.max(0, received - processed - failed);

  return {
    firmName: opts.firmName || "Your intake calls",
    firmCode: opts.firmCode || "AUDIT",
    periodLabel: opts.periodLabel || "Intake Quality Audit",
    periodStart: opts.periodStart || "",
    periodEnd: opts.periodEnd || "",
    analystName: opts.analystName, // undefined -> compose/PDF default to ANALYST.name
    issuedDate: opts.issuedDate || "",
    seq: opts.seq ?? 1,
    year: opts.year ?? (Number(String(opts.issuedDate || "").slice(0, 4)) || 0),
    missedLowCents: totalCents,
    missedHighCents: totalCents,
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
