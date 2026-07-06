// Pure, dependency-free helpers for assembling the AssemblyAI transcription
// request. Kept SEPARATE from transcribe.js on purpose so it can be unit-tested
// without the assemblyai SDK, a network call, or an API key.

// PII entities that are pure identity / financial / government-ID risk and are
// NOT scoring signal for a personal-injury intake call. Redacting them is safe
// with ZERO effect on the calibrated scorer, because they do not appear in the
// gold examples or the scoring rubric — so when (as is almost always the case) a
// call contains none of them, the transcript text is byte-identical to the
// un-redacted transcript and scoring is unchanged.
//
// We deliberately DO NOT redact:
//   - person names / phone numbers — the recovery workflow needs them to
//     re-contact the caller (that is the entire product); and
//   - injuries, medical conditions, locations, dates — these ARE the case signal
//     the FROZEN scorer reads; redacting them would change scoring behavior.
// See CLAUDE.md (frozen scoring pipeline) + the COMPLIANCE GUARDRAILS.
export const DEFAULT_PII_POLICIES = [
  "us_social_security_number",
  "credit_card_number",
  "credit_card_expiration",
  "credit_card_cvv",
  "banking_information",
  "drivers_license",
  "passport_number",
];

// Redaction on/off switch from the environment. Defaults ON — redaction is the
// safe default for confidential recordings. Set ASSEMBLYAI_REDACT_PII=false to
// disable (e.g. to reproduce a pre-redaction transcript while debugging).
export function redactionEnabled(env = process.env) {
  return String(env.ASSEMBLYAI_REDACT_PII ?? "true").toLowerCase() !== "false";
}

// Assemble the AssemblyAI transcribe() params. speaker_labels + language_detection
// are ALWAYS on (diarization + automatic English/Spanish detection, which also
// covers English/Spanish code-switching via the multilingual model). Redaction is
// additive: when on, only the conservative DEFAULT_PII_POLICIES are redacted, and
// matches are substituted with a readable [entity_name] label rather than "####".
export function buildTranscribeParams(audioPath, { redact = true, policies = DEFAULT_PII_POLICIES } = {}) {
  const params = {
    audio: audioPath,
    speaker_labels: true,
    language_detection: true,
  };
  if (redact && policies.length > 0) {
    params.redact_pii = true;
    params.redact_pii_policies = [...policies];
    params.redact_pii_sub = "entity_name";
  }
  return params;
}
