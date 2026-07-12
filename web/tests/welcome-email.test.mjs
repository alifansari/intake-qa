// The Day-0 welcome email: pure composition (every field a stranded firm would
// need must be present) and the founder-clicked send gates (KILL_SWITCH halts,
// EMAIL_ENABLED off transmits nothing, live path goes through the injected
// mailer). No network, no DB.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  composeWelcomeEmail,
  sendWelcomeEmail,
  PASSWORD_REDACTION,
} from "../messaging/welcome-email.mjs";

const BASE = {
  firmName: "Alvarez Injury Law",
  email: "jordan@alvarezlaw.com",
  password: "Temp1234Secret",
  existingAccount: false,
  signinUrl: "https://plaintiffops.com/login",
  webhookUrl: "https://plaintiffops.com/webhooks/callrail/f-123",
  uploadUrl: "https://plaintiffops.com/desk/upload",
  founderName: "Ali",
  founderEmail: "ali@plaintiffops.com",
  founderPhone: "+1 (555) 010-0000",
};

// ── composition ───────────────────────────────────────────────────────────

test("welcome email carries every field a firm needs to not get stranded", () => {
  const { subject, body } = composeWelcomeEmail(BASE);
  assert.ok(subject.includes("Alvarez Injury Law"));
  // sign-in link + credentials
  assert.ok(body.includes(BASE.signinUrl));
  assert.ok(body.includes(BASE.email));
  assert.ok(body.includes(BASE.password));
  // magic-link fallback so a lost password never strands anyone
  assert.ok(body.includes("email me a sign-in link"));
  // CallRail webhook + the forwarding instruction
  assert.ok(body.includes(BASE.webhookUrl));
  assert.ok(/forward this email to whoever runs your phones/i.test(body));
  // upload fallback (the no-CallRail path)
  assert.ok(body.includes(BASE.uploadUrl));
  // first-48-hours expectations incl. digest timing
  assert.ok(/48 hours/i.test(body));
  assert.ok(/8am pacific/i.test(body));
  assert.ok(/first digest arrives the morning after/i.test(body));
  // support line: reply OR call/text the founder — from inputs, not hardcoded
  assert.ok(body.includes(BASE.founderPhone));
  assert.ok(/call or text Ali/i.test(body));
  assert.ok(body.includes(BASE.founderEmail));
});

test("existing account: no password line, no password leakage", () => {
  const { body } = composeWelcomeEmail({ ...BASE, password: null, existingAccount: true });
  assert.ok(!body.includes("Temporary password"));
  assert.ok(body.includes("account you already have"));
  assert.ok(body.includes(BASE.signinUrl));
});

test("no founder phone configured: support line degrades to reply-only", () => {
  const { body } = composeWelcomeEmail({ ...BASE, founderPhone: "" });
  assert.ok(!/call or text/i.test(body));
  assert.ok(/reply to this email/i.test(body));
});

test("redacted body masks the temp password and is otherwise the same email", () => {
  const { body, redactedBody } = composeWelcomeEmail(BASE);
  assert.ok(body.includes(BASE.password));
  assert.ok(!redactedBody.includes(BASE.password));
  assert.ok(redactedBody.includes(PASSWORD_REDACTION));
  // everything else survives redaction
  assert.ok(redactedBody.includes(BASE.webhookUrl));
  assert.ok(redactedBody.includes(BASE.signinUrl));
});

// ── send gates ────────────────────────────────────────────────────────────

function mailerSpy() {
  const calls = [];
  return {
    calls,
    mailer: async (opts) => {
      calls.push(opts);
      return { id: "msg-1" };
    },
  };
}

test("EMAIL_ENABLED off (default): transmit NOTHING, say so honestly", async () => {
  const { calls, mailer } = mailerSpy();
  const res = await sendWelcomeEmail({
    to: "jordan@alvarezlaw.com",
    subject: "s",
    text: "welcome text long enough",
    mailer,
    env: { RESEND_API_KEY: "re_x", RESEND_FROM: "desk@plaintiffops.com" },
  });
  assert.equal(res.mode, "test");
  assert.equal(calls.length, 0);
});

test("KILL_SWITCH halts the welcome email even with email fully enabled", async () => {
  const { calls, mailer } = mailerSpy();
  const res = await sendWelcomeEmail({
    to: "jordan@alvarezlaw.com",
    subject: "s",
    text: "welcome text long enough",
    mailer,
    env: {
      KILL_SWITCH: "true",
      EMAIL_ENABLED: "true",
      RESEND_API_KEY: "re_x",
      RESEND_FROM: "desk@plaintiffops.com",
    },
  });
  assert.equal(res.mode, "halted");
  assert.equal(calls.length, 0);
});

test("no Resend key: gated to test mode, nothing transmitted", async () => {
  const { calls, mailer } = mailerSpy();
  const res = await sendWelcomeEmail({
    to: "jordan@alvarezlaw.com",
    subject: "s",
    text: "welcome text long enough",
    mailer,
    env: { EMAIL_ENABLED: "true" },
  });
  assert.equal(res.mode, "test");
  assert.equal(calls.length, 0);
});

test("all gates open: sends once through the mailer with from/to/subject", async () => {
  const { calls, mailer } = mailerSpy();
  const res = await sendWelcomeEmail({
    to: "jordan@alvarezlaw.com",
    subject: "Welcome to Intake QA",
    text: "welcome text long enough",
    mailer,
    env: {
      EMAIL_ENABLED: "true",
      RESEND_API_KEY: "re_x",
      RESEND_FROM: "desk@plaintiffops.com",
    },
  });
  assert.equal(res.mode, "live");
  assert.equal(res.id, "msg-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "jordan@alvarezlaw.com");
  assert.equal(calls[0].from, "desk@plaintiffops.com");
});
