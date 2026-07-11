#!/usr/bin/env node
// callrail-verify — the setup-call signature diagnostic.
//
// Given a CAPTURED real CallRail webhook (headers + raw body saved to a file)
// and the firm's signing key, reports WHICH signature format matches — or that
// none do, printing every computed digest so you can see exactly what CallRail
// sent vs. what we computed.
//
// CallRail's documented spec (https://apidocs.callrail.com/ → Security →
// Validating Payloads): header `Signature`, HMAC-SHA1 of the raw body,
// Base64-encoded, keyed with the account's signing key.
//
// Capture file formats accepted:
//   1. Raw HTTP style — header lines, a blank line, then the raw body:
//        Signature: UZAHbUdfm3GqL7qzilGozGzWV64=
//        Content-Type: application/json
//
//        {"answered":false,...}
//      (This is what `ngrok`'s inspector, `nc -l`, or a quick capture endpoint
//      gives you. The body must be BYTE-EXACT — don't re-format the JSON.)
//   2. JSON — {"headers": {"signature": "..."}, "body": "<raw body string>"}
//
// Usage:
//   node scripts/callrail-verify.mjs <capture-file> [secret]
//   (secret falls back to $CALLRAIL_WEBHOOK_SECRET)
//
// Exit code 0 when a format matches, 1 when none do, 2 on usage errors.
//
// Self-check (uses CallRail's published test vector, bundled as a fixture):
//   node scripts/callrail-verify.mjs --self-check

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CALLRAIL_SIGNATURE_FORMATS,
  computeCallRailDigests,
  matchCallRailSignature,
} from "../ingest/callrail.mjs";

const SIGNATURE_HEADER_NAMES = ["signature", "x-callrail-signature"];

// Parse a capture file into { headers: {lowercased}, body: string }.
// Exported for tests.
export function parseCapture(text) {
  const trimmedStart = text.replace(/^﻿/, "");

  // JSON capture: {"headers": {...}, "body": "..."}
  if (trimmedStart.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmedStart);
      if (parsed && typeof parsed === "object" && parsed.headers && "body" in parsed) {
        const headers = {};
        for (const [k, v] of Object.entries(parsed.headers)) {
          headers[k.toLowerCase()] = String(v);
        }
        const body =
          typeof parsed.body === "string" ? parsed.body : JSON.stringify(parsed.body);
        return { headers, body };
      }
    } catch {
      /* fall through to HTTP-style parsing */
    }
  }

  // Raw HTTP style: header lines until the first blank line, then the raw body.
  const sep = /\r?\n\r?\n/.exec(trimmedStart);
  if (!sep) {
    throw new Error(
      "capture file needs header lines, a BLANK line, then the raw body " +
        '(or JSON: {"headers": {...}, "body": "..."})',
    );
  }
  const headerBlock = trimmedStart.slice(0, sep.index);
  const body = trimmedStart.slice(sep.index + sep[0].length);
  const headers = {};
  for (const line of headerBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/^(POST|GET|PUT|HTTP)/i.test(line) && !line.includes(":")) continue; // request line
    const i = line.indexOf(":");
    if (i === -1) continue;
    headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body };
}

export function findSignatureHeader(headers) {
  for (const name of SIGNATURE_HEADER_NAMES) {
    if (headers[name]) return { name, value: headers[name] };
  }
  return null;
}

function run(captureText, secret) {
  const { headers, body } = parseCapture(captureText);
  const sig = findSignatureHeader(headers);

  console.log(`Headers found: ${Object.keys(headers).join(", ") || "(none)"}`);
  console.log(`Body: ${Buffer.byteLength(body, "utf8")} bytes`);

  if (!sig) {
    console.error(
      `\nNO SIGNATURE HEADER. Looked for: ${SIGNATURE_HEADER_NAMES.join(", ")}.\n` +
        "If CallRail sent this webhook, the header should be `Signature`. Check that\n" +
        "your capture preserved headers, and that no proxy stripped it.",
    );
    return 1;
  }

  console.log(`Signature header: ${sig.name}: ${sig.value}`);
  const format = matchCallRailSignature(body, sig.value, secret);

  if (format) {
    console.log(`\nMATCH ✓  format=${format}`);
    console.log(
      format === "sha1-base64"
        ? "That is CallRail's documented format (HMAC-SHA1, Base64) — all good."
        : "NOTE: that is NOT the documented sha1-base64 format. It still verifies, but note it in the firm's record.",
    );
    return 0;
  }

  console.error("\nNO FORMAT MATCHED ✗. Computed digests for this body + secret:");
  const digests = computeCallRailDigests(body, secret);
  for (const f of CALLRAIL_SIGNATURE_FORMATS) {
    console.error(`  ${f.padEnd(14)} ${digests[f]}`);
  }
  console.error(`  received       ${sig.value}`);
  console.error(
    "\nMost likely causes:\n" +
      "  1. Wrong signing key (each CallRail ACCOUNT has its own — copy it from the\n" +
      "     firm's account, not ours).\n" +
      "  2. The captured body isn't byte-exact (re-formatted / re-encoded JSON).\n" +
      "  3. A proxy modified the body in transit.",
  );
  return 1;
}

// --- entrypoint ---------------------------------------------------------------
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const args = process.argv.slice(2);

  if (args[0] === "--self-check") {
    // CallRail's published test vector (apidocs.callrail.com → Validating
    // Payloads): this fixture + this key must match sha1-base64.
    const here = dirname(fileURLToPath(import.meta.url));
    const body = readFileSync(join(here, "../tests/fixtures/callrail-docs-payload.json"), "utf8");
    const capture = `Signature: UZAHbUdfm3GqL7qzilGozGzWV64=\n\n${body}`;
    const code = run(capture, "072e77e426f92738a72fe23c4d1953b4");
    console.log(code === 0 ? "\nSelf-check PASSED." : "\nSelf-check FAILED.");
    process.exit(code);
  }

  const [file, secretArg] = args;
  const secret = secretArg ?? process.env.CALLRAIL_WEBHOOK_SECRET;
  if (!file || !secret) {
    console.error(
      "Usage: node scripts/callrail-verify.mjs <capture-file> [secret]\n" +
        "       (secret falls back to $CALLRAIL_WEBHOOK_SECRET)\n" +
        "       node scripts/callrail-verify.mjs --self-check",
    );
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`Could not read ${file}: ${e.message}`);
    process.exit(2);
  }
  process.exit(run(text, secret));
}
