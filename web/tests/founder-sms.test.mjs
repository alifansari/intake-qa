// Tests for the internal founder SMS channel: the opt-in gate, the kill switch,
// the no-FOUNDER_PHONE hard skip (never a fallback recipient), the missing-
// Twilio skip, the body cap, and a live send through an injected sender. No
// network, no keys — the Twilio sender is injectable and only reached when the
// channel is fully armed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { sendFounderSms, isFounderSmsEnabled } from "../messaging/founder-sms.mjs";

const ARMED = {
  FOUNDER_PHONE: "+15551234567",
  FOUNDER_SMS_ENABLED: "true",
  TWILIO_ACCOUNT_SID: "AC_test",
  TWILIO_AUTH_TOKEN: "tok_test",
  FOUNDER_SMS_FROM: "+15559876543",
};

test("isFounderSmsEnabled defaults OFF and honors the flag", () => {
  assert.equal(isFounderSmsEnabled({}), false);
  assert.equal(isFounderSmsEnabled({ FOUNDER_SMS_ENABLED: "true" }), true);
  assert.equal(isFounderSmsEnabled({ FOUNDER_SMS_ENABLED: "1" }), true);
  assert.equal(isFounderSmsEnabled({ FOUNDER_SMS_ENABLED: "false" }), false);
});

test("no FOUNDER_PHONE → skip entirely (never another recipient)", async () => {
  let sent = 0;
  const res = await sendFounderSms({ body: "x", env: { ...ARMED, FOUNDER_PHONE: "" }, sender: async () => { sent++; return { sid: "s" }; } });
  assert.equal(res.mode, "skipped");
  assert.equal(sent, 0);
});

test("channel disabled → skip even with phone + Twilio set", async () => {
  let sent = 0;
  const res = await sendFounderSms({ body: "x", env: { ...ARMED, FOUNDER_SMS_ENABLED: "false" }, sender: async () => { sent++; return { sid: "s" }; } });
  assert.equal(res.mode, "skipped");
  assert.equal(res.reason, "FOUNDER_SMS_ENABLED off");
  assert.equal(sent, 0);
});

test("KILL_SWITCH halts the founder text even fully armed", async () => {
  let sent = 0;
  const res = await sendFounderSms({ body: "x", env: { ...ARMED, KILL_SWITCH: "true" }, sender: async () => { sent++; return { sid: "s" }; } });
  assert.equal(res.mode, "skipped");
  assert.equal(res.reason, "kill_switch");
  assert.equal(sent, 0);
});

test("armed but Twilio creds missing → skip (no throw)", async () => {
  let sent = 0;
  const res = await sendFounderSms({ body: "x", env: { FOUNDER_PHONE: "+15551234567", FOUNDER_SMS_ENABLED: "true" }, sender: async () => { sent++; return { sid: "s" }; } });
  assert.equal(res.mode, "skipped");
  assert.equal(res.reason, "twilio not configured");
  assert.equal(sent, 0);
});

test("fully armed → sends once through the injected sender, to FOUNDER_PHONE, capped", async () => {
  const sent = [];
  const longBody = "A".repeat(2000);
  const res = await sendFounderSms({ body: longBody, env: ARMED, sender: async (m) => { sent.push(m); return { sid: "SM_1" }; }, maxLen: 600 });
  assert.equal(res.mode, "live");
  assert.equal(res.sid, "SM_1");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "+15551234567");
  assert.equal(sent[0].body.length, 600);
});

test("a sender error is caught and reported, never thrown", async () => {
  const res = await sendFounderSms({ body: "x", env: ARMED, sender: async () => { throw new Error("twilio 500"); } });
  assert.equal(res.mode, "error");
  assert.match(res.error, /twilio 500/);
});
