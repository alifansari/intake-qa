// POST /api/voice/incoming — inbound PHONE CALL webhook (Twilio Voice).
//
// Returns TwiML that connects the call to Twilio ConversationRelay, which
// streams low-latency STT/TTS (with barge-in, bilingual voices) over a WebSocket
// to our Intake Orchestrator (web/src/lib/voice/orchestrator.ts). See
// INTAKE_CLOSER_DESIGN.md §2–§3.
//
// SAFETY: this route is behind TWO flags and defaults OFF.
//   - VOICE_ENABLED must be "true" to connect a real call.
//   - While TEST_MODE is not "false", we NEVER connect a live agent: we play a
//     short notice and hang up. This mirrors the SMS product's TEST_MODE rule —
//     no real caller reaches the agent until we're explicitly cleared to go live.
// No business logic here; the orchestrator owns the conversation.

export const runtime = "nodejs";

const FIRM_ID = process.env.CALLRAIL_FIRM_ID ?? "1";

function xml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const voiceEnabled = process.env.VOICE_ENABLED === "true";
  const testMode = process.env.TEST_MODE !== "false"; // default: TEST_MODE ON
  const killed = process.env.KILL_SWITCH === "true";

  // Kill switch or feature disabled → do not connect the agent.
  if (killed || !voiceEnabled) {
    return xml(
      `<Response><Say>Thank you for calling. Please hold and a member of our team ` +
        `will be with you shortly.</Say><Hangup/></Response>`,
    );
  }

  // TEST_MODE → prove the wiring without exposing a real caller to the agent.
  if (testMode) {
    return xml(
      `<Response><Say>Intake Closer is in test mode. No live agent is connected.</Say>` +
        `<Hangup/></Response>`,
    );
  }

  // Live path: hand the call to ConversationRelay → our relay WebSocket.
  // The wss host is derived from the public app URL; the relay handler runs the
  // orchestrator. Bilingual: language is auto-detected and switched in-session.
  const host = (process.env.PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
  const relayUrl = `wss://${host}/api/voice/relay`;

  const welcome =
    "Thank you for calling. I'm the intake assistant and I can help you right now.";

  return xml(
    `<Response>` +
      `<Connect>` +
      `<ConversationRelay url="${relayUrl}" ` +
      `welcomeGreeting="${welcome}" ` +
      `language="en-US" ttsLanguage="en-US" transcriptionLanguage="en-US" ` +
      `intelligenceService="" ` +
      `parameter name="firmId" value="${FIRM_ID}"` +
      `/>` +
      `</Connect>` +
      `</Response>`,
  );
}
