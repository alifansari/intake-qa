// Spanish English-window module — routing rules (module 6, Phase 2 feature,
// Phase 1 interface).
//
// The promise: a monolingual English-speaking owner gets English scorecards,
// coaching notes, and rescue lists FROM Spanish-language intake calls. The
// HARD rule shipping now: any Spanish or code-switched call MUST route through
// human-in-the-loop review — automated accuracy degrades on Spanglish + poor
// phone audio, and a mis-scored Spanish call is exactly the false positive
// that burns tester trust.
//
// Toggleable per firm via the existing firm_features flag 'spanish_module' so
// English-only firms get full value with the module off.

export const SPANISH_MODULE_FEATURE = "spanish_module";

// Language routing decision for one call. `language` comes from the
// transcription layer (AssemblyAI language detection).
// TODO(integration): surface AssemblyAI's language_code + code-switch signal
// through ingest/transcribe.mjs so this stops defaulting to 'unknown'.
export function routeByLanguage({ language = "unknown", moduleEnabled = false }) {
  const lang = String(language).toLowerCase();
  const isSpanish = lang.startsWith("es") || lang === "spanglish" || lang === "code_switched";

  if (!isSpanish) {
    return { analyze: true, humanReviewRequired: false, reason: "english_or_other" };
  }
  if (!moduleEnabled) {
    // Module off: the call is NOT silently dropped — it is held for the firm to
    // see ("Spanish call received; Spanish module is off"), never auto-scored.
    return { analyze: false, humanReviewRequired: false, reason: "spanish_module_disabled" };
  }
  // Module on: analyze, but the flag can only surface through human review —
  // which is already the global rule (invariant d); this marks it MANDATORY
  // even for future high-confidence automation.
  return { analyze: true, humanReviewRequired: true, reason: "spanish_requires_human_review" };
}

// Spanish-specific scoring additions (Phase 2). Kept as ruleset-style config so
// the scoring layer reads them the same way it reads california-pi signals.
// TODO(phase2): wire into the scoring pass + English-language scorecard output.
export const SPANISH_HANDLING_SIGNALS = Object.freeze([
  { key: "language_match", label: "Language match", description: "Was the caller served in their language or left to struggle" },
  { key: "cultural_rapport", label: "Cultural rapport", description: "Formal-usted register, family context handled respectfully" },
  { key: "code_switch_handling", label: "Code-switch handling", description: "Did intake follow the caller across English/Spanish switches" },
]);
