#!/usr/bin/env node
// callrail-selftest — the end-of-setup-call green check.
//
// POSTs a synthetic, CORRECTLY-SIGNED CallRail payload at the firm's real
// webhook endpoint (/webhooks/callrail/<firm-id>) and confirms the full loop:
//   1. correctly signed POST  → 200 + a call row created (returns call_id)
//   2. the SAME payload again → 200 + created:false (idempotent upsert — a
//      CallRail retry can never duplicate a call)
//   3. a WRONGLY signed POST  → 401 (verification is actually on, and the
//      failure lands in error_log for /admin/status)
//
// Signs with CallRail's documented format — HMAC-SHA1 of the raw body,
// Base64, `Signature` header (https://apidocs.callrail.com/ → Security →
// Validating Payloads).
//
// The synthetic payload is unmistakably a test: caller "Intake QA Self-Test",
// Twilio's reserved test number, and a transcript that says it's a connection
// check — so if it ever gets scored it can't read as a real lead, and nothing
// downstream can send (pilot mode + kill switch + human approval still apply).
//
// Usage:
//   node scripts/callrail-selftest.mjs <firm-id> [options]
//     --base-url <url>   default http://localhost:3000 (use the prod origin on
//                        a real setup call, e.g. https://plaintiffops.com)
//     --secret <key>     the signing key the SERVER will verify with — the
//                        firm's own CallRail signing key if one was saved in
//                        the studio, else $CALLRAIL_WEBHOOK_SECRET
//
// Exit 0 = all three checks green. Non-zero = the printed check failed.

import { createHmac } from "node:crypto";

function parseArgs(argv) {
  const args = { firmId: null, baseUrl: "http://localhost:3000", secret: process.env.CALLRAIL_WEBHOOK_SECRET ?? null };
  const rest = [...argv];
  while (rest.length) {
    const a = rest.shift();
    if (a === "--base-url") args.baseUrl = rest.shift();
    else if (a === "--secret") args.secret = rest.shift();
    else if (!args.firmId) args.firmId = a;
  }
  return args;
}

function sign(rawBody, secret) {
  // Documented format: HMAC-SHA1 over the raw body, Base64.
  return createHmac("sha1", secret).update(rawBody, "utf8").digest("base64");
}

function syntheticPayload() {
  const now = new Date().toISOString();
  return JSON.stringify({
    id: `selftest-${Date.now()}`,
    call_type: "inbound",
    customer_name: "Intake QA Self-Test",
    // Twilio's reserved "valid" test number — never a real person's phone.
    customer_phone_number: "+15005550006",
    start_time: now,
    duration: "1",
    answered: true,
    transcription:
      "[Intake QA webhook self-test] This is a synthetic connection check fired " +
      "during firm setup. It is not a real caller and requires no follow-up.",
  });
}

async function post(url, body, signature) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", Signature: signature },
    body,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON reply */
  }
  return { status: res.status, json };
}

function green(msg) {
  console.log(`  ✓ ${msg}`);
}
function red(msg) {
  console.error(`  ✗ ${msg}`);
}

async function main() {
  const { firmId, baseUrl, secret } = parseArgs(process.argv.slice(2));
  if (!firmId || !secret) {
    console.error(
      "Usage: node scripts/callrail-selftest.mjs <firm-id> [--base-url <url>] [--secret <signing-key>]\n" +
        "       (secret falls back to $CALLRAIL_WEBHOOK_SECRET; pass the FIRM'S saved\n" +
        "        signing key when one was stored in the studio)",
    );
    process.exit(2);
  }

  const url = `${baseUrl.replace(/\/$/, "")}/webhooks/callrail/${firmId}`;
  const body = syntheticPayload();
  console.log(`Self-testing ${url}`);

  // 1) Correctly signed → 200 + call row created.
  const ok = await post(url, body, sign(body, secret));
  if (ok.status !== 200 || !ok.json?.ok || !ok.json?.call_id) {
    red(`signed POST expected 200 + call_id, got ${ok.status} ${JSON.stringify(ok.json)}`);
    if (ok.status === 401) {
      console.error(
        "\n  The server rejected a correctly-signed payload. The signing key you\n" +
        "  passed does not match what the server verifies with. Check:\n" +
        "    * was the firm's key saved in /studio/onboard-firm? (GET /api/studio/callrail-secret)\n" +
        "    * are you passing the same key here?\n" +
        "  The failed attempt was logged to error_log (visible in /admin/status).",
      );
    }
    process.exit(1);
  }
  green(`signed POST accepted: 200, call_id=${ok.json.call_id}, created=${ok.json.created}`);

  // 2) Replay of the same payload → 200 + created:false (idempotent upsert).
  const replay = await post(url, body, sign(body, secret));
  if (replay.status !== 200 || replay.json?.created !== false) {
    red(`replay expected 200 + created:false, got ${replay.status} ${JSON.stringify(replay.json)}`);
    process.exit(1);
  }
  green("replay deduplicated: created=false (a CallRail retry can't duplicate calls)");

  // 3) Bad signature → 401 (and an error_log row the status page can show).
  const bad = await post(url, body, sign(body, `not-${secret}`));
  if (bad.status !== 401) {
    red(`bad-signature POST expected 401, got ${bad.status} — VERIFICATION MAY BE OFF`);
    process.exit(1);
  }
  green("bad signature rejected: 401 (verification is on; failure logged for /admin/status)");

  console.log(
    `\nALL GREEN. Firm ${firmId}'s webhook is live and verified.\n` +
      `The self-test call (caller "Intake QA Self-Test", id ${ok.json.call_id}) is synthetic — ignore it in the desk.`,
  );
}

main().catch((e) => {
  red(`self-test crashed: ${e.message}`);
  console.error(
    "  Is the server running and reachable at the --base-url you passed?",
  );
  process.exit(1);
});
