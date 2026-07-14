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
// When a `webhook` config is supplied (the scale path), webhook_url + optional
// auth header are attached so AssemblyAI POSTs back on completion instead of the
// caller blocking-polling. Attaching them is a no-op for the current polling
// path (submit-with-webhook is a separate call), so this stays backward-safe.
export function buildTranscribeParams(
  audioPath,
  { redact = true, policies = DEFAULT_PII_POLICIES, webhook = null } = {},
) {
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
  if (webhook && webhook.url) {
    params.webhook_url = webhook.url;
    if (webhook.authHeaderName && webhook.authHeaderValue) {
      params.webhook_auth_header_name = webhook.authHeaderName;
      params.webhook_auth_header_value = webhook.authHeaderValue;
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Transcription delivery mode: POLLING (today) vs WEBHOOK (the scale path).
//
// Today lib/transcribe.js uses the SDK's transcribe() = submit + BLOCKING poll.
// At 1,000+ calls/day that pins a worker/Inngest step for the entire
// transcription (tens of seconds per call), and the step budget
// (route maxDuration=300) caps how many transcriptions can ride one invocation.
//
// The scale fix is AssemblyAI WEBHOOKS: `submitForWebhook()` submits the job
// with webhook_url and returns immediately; when the transcript is ready
// AssemblyAI POSTs to /api/transcribe/webhook, which persists the transcript and
// re-emits `intakeqa/call.received` so scoring resumes. That is a genuine
// pipeline change (a transcript_id -> call_id map, a new completion event, a
// two-phase worker), so it is SCAFFOLDED here + a route stub, gated behind
// ASSEMBLYAI_WEBHOOK_ENABLED, and NOT yet wired into ensureTranscript.
// TODO(webhook-transcription): build the id->call map + two-phase worker, then
// flip the flag and call submitForWebhook() from ensureTranscript.
// ---------------------------------------------------------------------------

export function webhookConfig(env = process.env) {
  const enabled = String(env.ASSEMBLYAI_WEBHOOK_ENABLED ?? "false").toLowerCase() === "true";
  return {
    enabled,
    url: env.ASSEMBLYAI_WEBHOOK_URL || null,
    authHeaderName: env.ASSEMBLYAI_WEBHOOK_AUTH_HEADER || null,
    authHeaderValue: env.ASSEMBLYAI_WEBHOOK_AUTH_VALUE || null,
  };
}

// Poll cadence (ms) for the blocking path. The SDK default is ~3s; a slightly
// longer interval trims API chatter when many transcripts are in flight at once.
// Clamped to a sane [1s, 30s] range; a bad value falls back to 3s.
export function pollingIntervalMs(env = process.env) {
  const n = Number(env.ASSEMBLYAI_POLL_INTERVAL_MS);
  if (!Number.isFinite(n)) return 3000;
  return Math.min(30000, Math.max(1000, Math.floor(n)));
}
