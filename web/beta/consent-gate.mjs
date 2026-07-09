// Recording-consent gate (module 8 / invariant c): no un-consented call is ever
// analyzed. CIPA (Penal Code §632/§632.7) makes California all-party consent;
// the firm captures consent with a recorded greeting, and this gate decides
// per call whether analysis may proceed.
//
// Pure decision function + a small helper to filter a call list. The scoring
// worker calls isAnalyzable() before transcription; a 'no' here means the call
// is marked excluded (calls.status/status_reason) and NEVER reaches AssemblyAI
// or Claude.
//
// Consent semantics:
//   'consented'  -> analyzable.
//   'no_consent' -> hard exclusion, no override.
//   'unknown'    -> analyzable ONLY when the firm has attested (compliance_config.
//                   consent_attested) that every recorded line plays the
//                   versioned consent greeting. No attestation, no analysis.

export function isAnalyzable({ call, complianceConfig }) {
  const status = call?.consent_status ?? "unknown";
  if (status === "no_consent") return { analyzable: false, reason: "caller_did_not_consent" };
  if (status === "consented") return { analyzable: true, reason: "per_call_consent" };
  // status === 'unknown'
  const attested = Boolean(
    complianceConfig?.consent_attested === true || complianceConfig?.consent_attested === 1
  );
  if (attested) return { analyzable: true, reason: "firm_greeting_attestation" };
  return { analyzable: false, reason: "no_consent_basis" };
}

export function filterAnalyzable({ calls, complianceConfig }) {
  const analyzable = [];
  const excluded = [];
  for (const call of calls ?? []) {
    const verdict = isAnalyzable({ call, complianceConfig });
    (verdict.analyzable ? analyzable : excluded).push({ call, ...verdict });
  }
  return { analyzable, excluded };
}

// Bilingual (EN/ES) consent-capture greeting scripts, versioned like
// studio/consent.ts. These are the scripts the firm attests to playing on
// recorded lines; the version string is stored in compliance_config.
//
// TODO(Ali/Yang): legal review of the exact wording before any firm relies on
// it (compliance §II / §VII — consent workflows are a gated area).
export const CONSENT_GREETING_VERSION = "greeting-v1-draft";
export const CONSENT_GREETINGS = Object.freeze({
  en: "This call may be recorded for quality purposes. By continuing, you consent to the recording.",
  es: "Esta llamada puede ser grabada con fines de calidad. Al continuar, usted da su consentimiento a la grabación.",
});

// Recording-readiness onboarding checklist (stored per firm in
// compliance_config.recording_checklist). Each item flips to true during
// onboarding; the consent attestation is only offered once all are true.
export const RECORDING_READINESS_CHECKLIST = Object.freeze([
  { key: "greeting_installed", label: "Consent greeting plays on every recorded intake line" },
  { key: "greeting_bilingual", label: "Spanish-language callers hear the Spanish greeting" },
  { key: "staff_briefed", label: "Intake staff know calls are recorded and why" },
  { key: "recording_storage_confirmed", label: "Recordings are stored where the connected phone system can export them" },
]);
