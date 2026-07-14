// AssemblyAI transcription webhook — the RECEIVING end of the non-blocking
// scale path (see lib/transcribe.js `submitForWebhook` + transcribe-config.js).
//
// STATUS: SCAFFOLD. Gated behind ASSEMBLYAI_WEBHOOK_ENABLED (default off). Until
// the two-phase transcription worker is built, this endpoint is inert — it
// acknowledges pings so a misconfigured job can't hammer a 500 loop, but it does
// NOT yet resume scoring.
//
// TODO(webhook-transcription) to make this live:
//   1. Verify the request (optional ASSEMBLYAI_WEBHOOK_AUTH_HEADER/VALUE that
//      submitForWebhook attached — reject anything without the shared secret).
//   2. Look up the call for `transcript_id` via a transcript_id -> call_id map
//      persisted at submit time (new sidecar; no change to the frozen scorer).
//   3. Fetch the finished transcript, run the same diarization/role assignment
//      as transcribeFile, persist it via setTranscript(db, callId, text).
//   4. Re-emit `intakeqa/call.received` so scorePipeline scores the call on the
//      now-cheap path (transcript already present, no AssemblyAI round-trip).
//
// Env is read directly here (rather than importing lib/transcribe-config.js)
// because lib/ lives OUTSIDE the deployed web/ bundle; the flag/secret names
// MUST stay in sync with webhookConfig() there.

export const runtime = "nodejs";

// Mirror of transcribe-config.js webhookConfig() — keep the env var names aligned.
function webhookCfg(env = process.env) {
  return {
    enabled: String(env.ASSEMBLYAI_WEBHOOK_ENABLED ?? "false").toLowerCase() === "true",
    authHeaderName: env.ASSEMBLYAI_WEBHOOK_AUTH_HEADER || null,
    authHeaderValue: env.ASSEMBLYAI_WEBHOOK_AUTH_VALUE || null,
  };
}

export async function POST(req: Request) {
  const cfg = webhookCfg();
  if (!cfg.enabled) {
    // Feature not turned on — acknowledge so AssemblyAI won't retry-storm, but
    // do nothing. (Nothing should be submitting webhook jobs while the flag is
    // off, so reaching here means a stray/misconfigured job.)
    return Response.json(
      { ok: false, reason: "webhook_transcription_disabled" },
      { status: 202 },
    );
  }

  // Optional shared-secret check (submitForWebhook attaches this header pair).
  if (cfg.authHeaderName && cfg.authHeaderValue) {
    const got = req.headers.get(cfg.authHeaderName);
    if (got !== cfg.authHeaderValue) {
      return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
  }

  // TODO(webhook-transcription): steps 2-4 above. Until then, accept + no-op so
  // the flag can be flipped for wiring/testing without breaking senders.
  return Response.json(
    { ok: false, reason: "not_implemented", detail: "two-phase worker pending" },
    { status: 501 },
  );
}
