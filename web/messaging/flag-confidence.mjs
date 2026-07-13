// Confidence tier + evidence-candidate logic for a leaked-signable flag (pure,
// no I/O — testable and storage-agnostic, same posture as flag-logic.mjs).
//
// This closes the gap that left every REAL scored call showing "Unrated" with
// no verbatim quote: the scoring engine emits a confidence and evidence quotes,
// but nothing mapped them into flag_confidence / transcript_citations, so the
// desk card's two most evidentiary fields were structurally always empty.
//
// COMPLIANCE §IV ("no citation, no claim"): a quote may only be SHOWN once it is
// confirmed against THIS call's transcript. The engine's evidence_quotes can
// paraphrase or lightly reword; we treat them as CANDIDATES and hand them to the
// existing citation guard (analysis/citation-guard.mjs) which drops anything that
// doesn't match the transcript. This module does NOT re-implement that check — it
// only extracts the candidates and maps confidence to a tier.

// Strip surrounding quotes / ellipses / whitespace so the stored snippet reads
// clean inside the card's own quotation marks.
export function cleanSnippet(s) {
  return String(s == null ? "" : s)
    .trim()
    .replace(/^["'“”‘’….\s]+/, "")
    .replace(/["'“”‘’….\s]+$/, "")
    .trim();
}

// Pull the engine's candidate qualifying-fact quotes for a leaked call. These
// live under alerts.revenue_at_risk.evidence_quotes (per scoring/system-prompt.md
// "the three strongest evidence quotes: the qualifying facts and the moment the
// conversion died"). Returns cleaned, de-duplicated non-empty strings; validation
// against the transcript is the citation guard's job, not this function's.
export function candidateQuotes(score) {
  const raw = score?.alerts?.revenue_at_risk?.evidence_quotes;
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const q of raw) {
    if (typeof q !== "string") continue;
    const t = cleanSnippet(q);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

// Map a leaked flag to its displayed confidence tier. Leaked flags are already
// likely_signable (they cleared the signability gate in flag-logic), so the tier
// records HOW FIRMLY, never whether. "strong" requires BOTH the engine's own
// high classification confidence AND at least one verbatim qualifying quote that
// passed the citation guard against the transcript — evidence-tied, never
// certainty asserted from inference (§IV). Everything else is "moderate — worth a
// human look". Returns one of 'strong' | 'moderate' (the flag_confidence CHECK
// constraint's only legal values); a leaked flag is never left "Unrated".
export function confidenceTier({ score, hasValidatedCitation }) {
  const conf =
    score?.classification_confidence ?? score?.scores?.confidence ?? "medium";
  if (conf === "high" && hasValidatedCitation) return "strong";
  return "moderate";
}

// The engine's rubric/version stamp, for the flag_confidence.rubric_version audit
// column. Best-effort from the score payload; falls back to "v1".
export function rubricVersion(score) {
  return String(score?.rubric_version ?? score?.version ?? "v1");
}
