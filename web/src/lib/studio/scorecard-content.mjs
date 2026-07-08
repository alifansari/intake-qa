// Pure, testable scorecard-content helpers (no rubric/LLM dependency): the four
// NON-DELETABLE disclosures with a DYNAMIC call count, the signature string,
// ref_code generation, and the single-excerpt exhibit picker. Authored as .mjs so
// node --test imports them directly (the repo's dual pattern); scorecard.ts
// re-exports them with types.

// The four NON-DELETABLE disclosures. The scope/method statement is DYNAMIC on the
// actual number of calls analyzed — never hardcode "n=1". (compliance §V.)
export function disclosures(callsAnalyzed) {
  const n = Math.max(0, Math.floor(Number(callsAnalyzed) || 0));
  const callWord = n === 1 ? "call" : "calls";
  // NOTE (hard rule #1): the AUDIT OUTPUT never uses "recording"/"recorded call"
  // language. Say "the intake call" / "the intake interaction". The consent
  // attestation on the UPLOAD step (lib/studio/consent.ts) is the legal gate and
  // is deliberately unchanged — it is not part of the audit output.
  const scope =
    n === 1
      ? "Scope & method: This is a spot check based on a single intake call the firm " +
        "supplied. One call is not a representative, firm-wide measurement of intake " +
        "performance; it is an illustrative sample."
      : `Scope & method: This is a spot check based on ${n} intake ${callWord} the firm ` +
        "supplied. A spot check of this size is not a representative, firm-wide " +
        "measurement of intake performance; it is an illustrative sample.";

  return {
    scope,
    independence:
      "Independence: This analysis was prepared by an independent scorer. Intake QA " +
      "is not a participant in the firm's fees and has no stake in any case outcome.",
    flatFee:
      "Fee: Intake QA is engaged on a flat monthly fee. Nothing here is priced as a " +
      "percentage of recovery, per case, or tied to any case outcome.",
    limitation:
      "Limitation: I was not engaged to and did not conduct a comprehensive examination; " +
      "had additional procedures been performed, other matters might have come to my attention.",
  };
}

export const SIGNATURE_ANALYST = "Ali Ansari, Analyst of Record";

// ref_code: SC-YYYYMMDD-XXXX (XXXX = base36). Short, human-readable, unique-enough.
export function generateRefCode(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `SC-${y}${m}${d}-${rand}`;
}

// Pick the ONE key cited transcript excerpt for the exhibit. Prefers a
// critical-fail quote, then a revenue-at-risk evidence quote, then signability
// evidence. Returns null if none — we never fabricate a quote (no citation, no claim).
export function pickKeyExcerpt(scoring) {
  const s = scoring && typeof scoring === "object" ? scoring : {};
  const asStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const fails = Array.isArray(s.critical_fails) ? s.critical_fails : [];
  for (const f of fails) {
    const q = asStr(f?.quote);
    if (q) return q;
  }

  const alerts = s.alerts && typeof s.alerts === "object" ? s.alerts : {};
  const rar =
    alerts.revenue_at_risk && typeof alerts.revenue_at_risk === "object"
      ? alerts.revenue_at_risk
      : {};
  const eq = rar.evidence_quotes;
  if (Array.isArray(eq)) {
    for (const q of eq) {
      const v = asStr(typeof q === "string" ? q : q?.quote);
      if (v) return v;
    }
  }

  for (const key of ["signability_evidence", "case_signability_evidence"]) {
    const v = s[key];
    if (Array.isArray(v)) {
      for (const q of v) {
        const got = asStr(typeof q === "string" ? q : q?.quote);
        if (got) return got;
      }
    } else {
      const got = asStr(v);
      if (got) return got;
    }
  }
  return null;
}
