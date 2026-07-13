// Operator test tool — send ONE rendered missed-cases digest to your own inbox
// so you can see how it looks in a real email client. This is NOT the product
// send path: it does not touch the guarded chokepoint, it sends only to the
// address you pass, and it marks the subject [TEST]. It exists so the founder
// can preview the template without flipping EMAIL_ENABLED / KILL_SWITCH on the
// live firm loop.
//
// Secrets come from the environment ONLY (never hard-coded). Run it one of two ways:
//
//   1) inline env:
//      RESEND_API_KEY=re_xxx RESEND_FROM='ali <ali@plaintiffops.com>' \
//        node web/scripts/send-test-digest.mjs --to ali@plaintiffops.com
//
//   2) from a git-ignored .env.local that has RESEND_API_KEY + RESEND_FROM set:
//      node --env-file=web/.env.local web/scripts/send-test-digest.mjs --to ali@plaintiffops.com
//
// Add --clear to preview the all-clear (zero-miss) variant instead of the
// 3-missed-caller sample.

import { buildMissedDigest, renderMissedDigest, digestSubject } from "../messaging/missed-digest.mjs";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const to = arg("--to", "ali@plaintiffops.com");
const clear = process.argv.includes("--clear");

const key = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;
if (!key) {
  console.error("RESEND_API_KEY is not set. Provide it inline or via --env-file. Nothing sent.");
  process.exit(1);
}
if (!from) {
  console.error("RESEND_FROM is not set (e.g. 'ali <ali@plaintiffops.com>'). Nothing sent.");
  process.exit(1);
}

const now = new Date("2026-07-12T15:00:00Z");
const firm = { id: "firm_demo", name: "My Law Firm" };
const flags = clear
  ? []
  : [
      { id: "f1", caller_name: "Erika", caller_phone: "(626) 555-0143", case_type: "Auto accident", confidence_tier: "High", reason: "Rear-ended at a red light, treated at ER, asked about representation. No callback logged.", save_status: "open", received_at: now.toISOString() },
      { id: "f2", caller_name: "Marcus", caller_phone: "(213) 555-0199", case_type: "Slip and fall", confidence_tier: "Medium", reason: "Fell on an unmarked wet floor at a grocery store, has photos. Left a voicemail only.", save_status: "left_message", received_at: now.toISOString() },
      { id: "f3", caller_name: "Luis", caller_phone: null, case_type: "Dog bite", confidence_tier: "High", reason: "Bitten by a neighbor's dog, needed stitches. Line dropped before intake finished.", save_status: "open", received_at: now.toISOString() },
    ];

// Full env so it picks up DIGEST_LINK_SECRET (=> real "We called them" buttons)
// and APP_URL if you have them set; otherwise the buttons degrade to desk links.
const env = { ...process.env, APP_URL: process.env.APP_URL || "https://plaintiffops.com" };
const data = buildMissedDigest({ firm, flags, callsReceived: 12, now });
const html = renderMissedDigest(data, { env });
const subject = `[TEST] ${digestSubject(data)}`;

const { Resend } = await import("resend");
const resend = new Resend(key);
const res = await resend.emails.send({ from, to, subject, html });
if (res?.error) {
  console.error("Resend rejected the send:", res.error);
  process.exit(1);
}
console.log(`Sent to ${to} (id: ${res?.data?.id ?? "?"}). Subject: ${subject}`);
