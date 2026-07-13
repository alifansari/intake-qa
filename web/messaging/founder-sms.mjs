// Founder SMS — the internal operator-alert text channel.
//
// This is the phone twin of the founder EMAIL path (founder-alerts.mjs). It
// texts the FOUNDER ONLY, on material business events, so Ali can run the beta
// without watching a dashboard. It is deliberately SEPARATE from the caller
// send chokepoint (messaging/send.mjs) and NEVER touches a firm or a caller.
//
// COMPLIANCE POSTURE (compliance-invariants §III / §VII):
//   * §III (TCPA / Rule 7.3) governs texting PROSPECTS / CLAIMANTS. The founder
//     texting their OWN phone, at their own explicit request, is an internal
//     operator alert — the same class as the founder email §VII permits — not
//     solicitation. It must never be pointed at anyone but FOUNDER_PHONE.
//   * §VII: secrets/env are Ali's to set. This channel is OFF until Ali sets
//     the Twilio creds + FOUNDER_PHONE + FOUNDER_SMS_ENABLED=true. Until then it
//     logs and transmits NOTHING (same fail-safe default as EMAIL_ENABLED).
//   * KILL_SWITCH halts it instantly, same as every other send.
//
// NOTE (honest limit): US A2P 10DLC registration is required before Twilio will
// deliver application-to-person SMS to any US number, including the founder's.
// Flipping FOUNDER_SMS_ENABLED does not bypass that carrier requirement.

import { killSwitchEngaged, truthy } from "./compliance.mjs";

// Opt-in gate. Default (unset) is FALSE — texting never starts by accident.
// Decoupled from EMAIL_ENABLED and TEST_MODE on purpose: arming email or the
// caller-SMS test mode must never silently start texting the founder.
export function isFounderSmsEnabled(env = process.env) {
  return truthy(env.FOUNDER_SMS_ENABLED);
}

// Default (production) sender: Twilio. Lazy-imported so nothing needs the
// `twilio` dependency until this channel is actually armed. Supports either a
// Messaging Service SID (preferred for A2P) or a plain E.164 from-number.
async function defaultSmsSender({ to, body, env = process.env }) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const service = env.FOUNDER_SMS_MESSAGING_SERVICE_SID ?? env.TWILIO_MESSAGING_SERVICE_SID;
  const from = env.FOUNDER_SMS_FROM;
  if (!sid || !token) {
    throw new Error("Twilio not configured (need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }
  if (!service && !from) {
    throw new Error("need FOUNDER_SMS_MESSAGING_SERVICE_SID (or TWILIO_MESSAGING_SERVICE_SID) or FOUNDER_SMS_FROM");
  }
  const { default: twilio } = await import("twilio");
  const client = twilio(sid, token);
  const payload = { to, body };
  if (service) payload.messagingServiceSid = service;
  else payload.from = from;
  const res = await client.messages.create(payload);
  return { sid: res.sid };
}

// Send one internal founder text through the gate. Returns a structured result;
// NEVER throws (a monitoring text must not crash the thing it monitors). No
// FOUNDER_PHONE → skip entirely (this sender must never fall back to any other
// recipient — same rule as the founder email never falling back off
// FOUNDER_EMAIL). SMS bodies are hard-capped so a runaway summary can't send a
// giant multi-segment message.
export async function sendFounderSms({
  body,
  env = process.env,
  sender = defaultSmsSender,
  maxLen = 600,
} = {}) {
  const to = env.FOUNDER_PHONE?.trim();
  if (!to) return { mode: "skipped", reason: "FOUNDER_PHONE not set" };
  if (!isFounderSmsEnabled(env)) return { mode: "skipped", reason: "FOUNDER_SMS_ENABLED off" };
  if (killSwitchEngaged(env)) return { mode: "skipped", reason: "kill_switch" };
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return { mode: "skipped", reason: "twilio not configured" };
  }
  const text = String(body ?? "").slice(0, maxLen);
  if (!text.trim()) return { mode: "skipped", reason: "empty body" };
  try {
    const res = await sender({ to, body: text, env });
    console.log(`Founder SMS sent to ${to} (sid ${res?.sid ?? "?"})`);
    return { mode: "live", sid: res?.sid ?? null };
  } catch (e) {
    console.error(`Founder SMS failed: ${e instanceof Error ? e.message : String(e)}`);
    return { mode: "error", error: e instanceof Error ? e.message : String(e) };
  }
}
