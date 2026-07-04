// THE SINGLE SEND CHOKEPOINT. Every outbound SMS passes through sendMessage —
// no code path may transmit around it. This is where the non-negotiable
// compliance guardrails from CLAUDE.md are enforced, IN ORDER:
//
//   1. PILOT MODE      — only 'approved' (human-approved) messages may send.
//   2. Opt-out         — never send to an opted_out conversation.
//   3. Global kill      — env.KILL_SWITCH halts ALL sends instantly.
//   4. Per-firm kill    — firm.kill_switch halts that firm's sends.
//   5. Quiet hours      — no sends 8pm–8am in the recipient's local time.
//   6. TEST_MODE        — sends are SIMULATED (logged, never transmitted).
//
// The first failing gate stops the send, LEAVES the status as-is (so it can be
// retried later once conditions change), logs a reason, and returns it. Only a
// message that clears every gate is transmitted (or, in TEST_MODE, mocked).
//
// The Twilio call is injectable (`sender`) so tests never touch the network,
// and `env` is injectable so tests set flags without mutating process.env —
// the same fake-dependency pattern as the scorer/drafter in score-worker.mjs.

import {
  getMessage,
  getConversation,
  getFirm,
  markMessageSent,
  markMessageFailed,
} from "../ingest/store.mjs";
import {
  killSwitchEngaged,
  isTestMode,
  isQuietHours,
  quietHoursFromEnv,
} from "./compliance.mjs";

// Default (production) sender: real Twilio Messaging Service. Lazy-imported so
// the pilot and tests need no `twilio` dependency — this path is only reached
// when TEST_MODE is OFF. Run `npm i twilio` before turning TEST_MODE off.
async function defaultSender({ to, body, messagingServiceSid, env = process.env }) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const service = messagingServiceSid ?? env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !service) {
    throw new Error(
      "Twilio not configured (need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)"
    );
  }
  const { default: twilio } = await import("twilio");
  const client = twilio(sid, token);
  const res = await client.messages.create({
    to,
    body,
    messagingServiceSid: service,
  });
  return { sid: res.sid };
}

function skip(reason, extra = {}) {
  return { sent: false, skipped: true, reason, ...extra };
}

// Attempt to send one message through the chokepoint. Returns a structured
// result; NEVER throws for a compliance block (only logs + returns a reason).
export async function sendMessage({
  db,
  messageId,
  sender = defaultSender,
  env = process.env,
  now = new Date(),
} = {}) {
  const message = await getMessage(db, messageId);
  if (!message) return skip("message_not_found");

  // 1. PILOT MODE — only human-approved messages may send.
  if (message.status !== "approved") {
    return logAndReturn(messageId, skip("not_approved", { status: message.status }));
  }

  const conversation = await getConversation(db, message.conversation_id);
  if (!conversation) return logAndReturn(messageId, skip("conversation_not_found"));

  // 2. Opt-out — never text an opted-out conversation.
  if (conversation.status === "opted_out") {
    return logAndReturn(messageId, skip("opted_out"));
  }

  // 3. Global master kill switch (env).
  if (killSwitchEngaged(env)) {
    return logAndReturn(messageId, skip("kill_switch_global"));
  }

  const firm = await getFirm(db, conversation.firm_id);

  // 4. Per-firm kill switch (persistent operator halt). SQLite stores 0/1,
  // Postgres stores a real boolean — treat either truthy form as engaged.
  if (firm?.kill_switch === 1 || firm?.kill_switch === true) {
    return logAndReturn(messageId, skip("kill_switch_firm"));
  }

  // 5. Quiet hours in the recipient's local time.
  const { startHour, endHour } = quietHoursFromEnv(env);
  if (isQuietHours(now, firm?.timezone, startHour, endHour)) {
    return logAndReturn(messageId, skip("quiet_hours"));
  }

  // 6. TEST_MODE — simulate the send (log only), never transmit.
  if (isTestMode(env)) {
    const sentAt = now.toISOString();
    await markMessageSent(db, messageId, sentAt);
    console.log(
      `[TEST_MODE] simulated send msg #${messageId} -> ${conversation.caller_phone} (not transmitted)`
    );
    return { sent: true, skipped: false, reason: "test_mode_simulated", mode: "test" };
  }

  // LIVE send — cleared every gate.
  try {
    const res = await sender({
      to: conversation.caller_phone,
      body: message.body,
      messagingServiceSid: firm?.messaging_service_sid,
      env,
    });
    await markMessageSent(db, messageId, now.toISOString());
    return { sent: true, skipped: false, reason: "sent", mode: "live", provider: res };
  } catch (err) {
    await markMessageFailed(db, messageId);
    console.error(`Send failed for msg #${messageId}: ${err.message}`);
    return { sent: false, skipped: false, reason: "send_error", error: err.message };
  }
}

function logAndReturn(messageId, result) {
  console.log(`Send blocked for msg #${messageId}: ${result.reason}`);
  return result;
}
