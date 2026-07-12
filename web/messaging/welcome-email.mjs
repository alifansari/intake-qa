// The Day-0 welcome email — composed by the server at onboarding so the founder
// never hand-assembles sign-in details again (one forgotten field strands a firm
// at the sign-in page).
//
// Two exports, same discipline as every sender in this directory:
//   * composeWelcomeEmail — PURE. Renders subject + plain-text body from the
//     onboarding result. Also returns a REDACTED body (temp password masked)
//     which is the only variant that may ever be persisted: the password is
//     shown once at provisioning and never stored readable (matching
//     /api/studio/onboard-firm's contract).
//   * sendWelcomeEmail — GATED. Transmits only when the kill switch is off AND
//     EMAIL_ENABLED=true AND a Resend key exists. Otherwise it returns an
//     honest { mode: "test" | "halted" } and transmits NOTHING. It is only ever
//     called from the founder-clicked Send button (§VII: no autonomous sends);
//     no cron, webhook, or onboarding path calls it.
//
// Founder contact is injected by the caller (from site-constants + env) —
// nothing personal is hardcoded here.

import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";

export const PASSWORD_REDACTION =
  "(temporary password — shown once at onboarding, never stored)";

// Pure render. All copy is plain English for non-technical law-firm staff.
export function composeWelcomeEmail({
  firmName,
  email,
  password = null,
  existingAccount = false,
  signinUrl,
  webhookUrl,
  uploadUrl,
  founderName = "Ali",
  founderEmail = "",
  founderPhone = "",
}) {
  const subject = `Welcome to Intake QA — your desk is ready, ${firmName}`;

  const signinBlock = existingAccount || !password
    ? `Sign in with the account you already have:
   ${signinUrl}
   Email: ${email}
   (Forgot the password? On the sign-in page choose "email me a sign-in link" —
   it always works.)`
    : `Sign in here:
   ${signinUrl}
   Email: ${email}
   Temporary password: ${password}
   (Prefer no password? On the sign-in page choose "email me a sign-in link" —
   it always works. You can set your own password anytime under Settings.)`;

  const supportLine = founderPhone
    ? `Reply to this email, or call or text ${founderName} directly at ${founderPhone}.`
    : `Reply to this email — it reaches ${founderName} directly.`;

  const body = `Hi — welcome aboard. Your Intake QA desk is live, and this one email has
everything you need. Keep it.

1. SIGN IN
   ${signinBlock}

2. CONNECT YOUR CALLS (the one thing to forward)
   If you use CallRail, this is your firm's private webhook address:
   ${webhookUrl}
   Forward this email to whoever runs your phones — on our 15-minute setup
   call we paste it in together. It takes about two minutes, and nothing
   about how your team answers the phone changes.
   No CallRail, or want a head start? Upload recordings directly from your
   desk: ${uploadUrl}

3. YOUR FIRST 48 HOURS
   - Today: sign in and look around. You'll land on "Missed cases" — the
     only screen that needs your team's attention.
   - As soon as calls flow in (webhook or upload), we read every one.
   - Every morning around 8am Pacific you get one short email: your
     missed-cases digest. Your first digest arrives the morning after your
     first calls come in. On a clean day it says "calls read, all handled" —
     so a quiet inbox never means something is broken.

QUESTIONS, ANY TIME
   ${supportLine}
   You get ${founderName}, not a ticket queue.

— ${founderName}
${founderEmail}`;

  // The persisted variant: identical email, temp password masked. This is the
  // ONLY variant a caller may write to storage.
  const redactedBody = password ? body.split(password).join(PASSWORD_REDACTION) : body;

  return { subject, body, redactedBody };
}

// Default (production) mailer: Resend, plain-text. Lazy-imported; only reached
// with EMAIL_ENABLED on AND a key present AND the kill switch off.
async function defaultMailer({ to, from, subject, text, env = process.env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!from) throw new Error("RESEND_FROM is not set");
  if (!to) throw new Error("no recipient");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, text });
  return { id: res?.data?.id ?? null };
}

// Founder-clicked send. Gates, in order:
//   KILL_SWITCH        → { mode: "halted" }  (halts ALL sends, email included)
//   EMAIL_ENABLED off  → { mode: "test" }    (default posture: transmit nothing)
//   no RESEND_API_KEY  → { mode: "test" }
// Only then does the mailer run. The caller shows the mode to the founder
// honestly — a gated non-send must never be presented as a send.
export async function sendWelcomeEmail({
  to,
  subject,
  text,
  mailer = defaultMailer,
  env = process.env,
}) {
  if (killSwitchEngaged(env)) {
    return { mode: "halted", reason: "KILL_SWITCH engaged — no email leaves the system." };
  }
  if (!isEmailEnabled(env)) {
    return {
      mode: "test",
      reason: "EMAIL_ENABLED is not true — copy the email and send it yourself.",
    };
  }
  if (!env.RESEND_API_KEY) {
    return { mode: "test", reason: "RESEND_API_KEY is not set — nothing was sent." };
  }
  const res = await mailer({ to, from: env.RESEND_FROM, subject, text, env });
  return { mode: "live", id: res.id };
}
