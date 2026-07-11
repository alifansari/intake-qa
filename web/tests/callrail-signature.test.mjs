// CallRail webhook signature verification — every supported format, anchored
// on CallRail's OWN published test vector.
//
// The documented spec (https://apidocs.callrail.com/ → Security → Validating
// Payloads): header `Signature`, HMAC-SHA1 of the raw request body, Base64.
// The docs publish a test vector — signing key 072e77e426f92738a72fe23c4d1953b4
// over their sample body must yield UZAHbUdfm3GqL7qzilGozGzWV64= — and
// tests/fixtures/callrail-docs-payload.json is that body, byte-for-byte.
//
// We additionally accept sha256-base64, sha256-hex (this codebase's previous
// assumption — back-compat), and sha1-hex, documented format tried first.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import {
  CALLRAIL_SIGNATURE_FORMATS,
  computeCallRailDigests,
  matchCallRailSignature,
  verifyCallRailSignature,
  ingestCallRail,
} from "../ingest/callrail.mjs";
import { parseCapture, findSignatureHeader } from "../scripts/callrail-verify.mjs";
import { openMigratedDb } from "../db/connection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DOCS_BODY = readFileSync(join(here, "fixtures/callrail-docs-payload.json"), "utf8");
const DOCS_KEY = "072e77e426f92738a72fe23c4d1953b4";
const DOCS_SIGNATURE = "UZAHbUdfm3GqL7qzilGozGzWV64=";

// --- The documented format, proven against CallRail's own test vector --------

test("CallRail's published test vector verifies as sha1-base64 (the documented format)", () => {
  assert.equal(matchCallRailSignature(DOCS_BODY, DOCS_SIGNATURE, DOCS_KEY), "sha1-base64");
  assert.equal(verifyCallRailSignature(DOCS_BODY, DOCS_SIGNATURE, DOCS_KEY), true);
});

test("the computed sha1-base64 digest reproduces the docs' expected signature exactly", () => {
  const digests = computeCallRailDigests(DOCS_BODY, DOCS_KEY);
  assert.equal(digests["sha1-base64"], DOCS_SIGNATURE);
});

test("the documented format is tried FIRST", () => {
  assert.equal(CALLRAIL_SIGNATURE_FORMATS[0], "sha1-base64");
});

// --- One test per supported format -------------------------------------------

const SECRET = "per-format-test-secret";
const BODY = JSON.stringify({ id: "CR-42", customer_phone_number: "5105550123" });

test("format sha1-base64 verifies", () => {
  const sig = createHmac("sha1", SECRET).update(BODY, "utf8").digest("base64");
  assert.equal(matchCallRailSignature(BODY, sig, SECRET), "sha1-base64");
});

test("format sha256-base64 verifies", () => {
  const sig = createHmac("sha256", SECRET).update(BODY, "utf8").digest("base64");
  assert.equal(matchCallRailSignature(BODY, sig, SECRET), "sha256-base64");
});

test("format sha256-hex verifies (legacy back-compat — pre-existing tests sign this way)", () => {
  const sig = createHmac("sha256", SECRET).update(BODY, "utf8").digest("hex");
  assert.equal(matchCallRailSignature(BODY, sig, SECRET), "sha256-hex");
});

test("format sha1-hex verifies", () => {
  const sig = createHmac("sha1", SECRET).update(BODY, "utf8").digest("hex");
  assert.equal(matchCallRailSignature(BODY, sig, SECRET), "sha1-hex");
});

// --- Rejections ----------------------------------------------------------------

test("a wrong secret matches no format", () => {
  const sig = createHmac("sha1", "the-wrong-secret").update(BODY, "utf8").digest("base64");
  assert.equal(matchCallRailSignature(BODY, sig, SECRET), null);
  assert.equal(verifyCallRailSignature(BODY, sig, SECRET), false);
});

test("a tampered body matches no format", () => {
  const sig = createHmac("sha1", SECRET).update(BODY, "utf8").digest("base64");
  assert.equal(matchCallRailSignature(BODY + " ", sig, SECRET), null);
});

test("a missing/empty signature header is rejected, not crashed on", () => {
  assert.equal(matchCallRailSignature(BODY, "", SECRET), null);
  assert.equal(matchCallRailSignature(BODY, null, SECRET), null);
  assert.equal(matchCallRailSignature(BODY, undefined, SECRET), null);
  assert.equal(matchCallRailSignature(BODY, "   ", SECRET), null);
});

test("surrounding whitespace on the header is tolerated", () => {
  const sig = createHmac("sha1", SECRET).update(BODY, "utf8").digest("base64");
  assert.equal(matchCallRailSignature(BODY, `  ${sig}\n`, SECRET), "sha1-base64");
});

test("a missing secret throws (configuration error, not a silent 401)", () => {
  assert.throws(() => matchCallRailSignature(BODY, "sig", ""), /secret/);
});

// --- ingestCallRail: format on success, formats-tried on failure ---------------

test("ingestCallRail returns which signature format verified", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-sig-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('F', 0, 1)`).run()
      .lastInsertRowid,
  );
  const sig = createHmac("sha1", SECRET).update(BODY, "utf8").digest("base64");
  const result = await ingestCallRail({ db, rawBody: BODY, signature: sig, secret: SECRET, firmId });
  assert.ok(result.id, "call stored");
  assert.equal(result.signature_format, "sha1-base64");
});

test("ingestCallRail's BAD_SIGNATURE error carries the formats tried (for error_log loudness)", async () => {
  await assert.rejects(
    ingestCallRail({ db: null, rawBody: BODY, signature: "nope", secret: SECRET, firmId: 1 }),
    (err) => {
      assert.equal(err.code, "BAD_SIGNATURE");
      assert.deepEqual(err.formatsTried, CALLRAIL_SIGNATURE_FORMATS);
      assert.equal(err.hadSignatureHeader, true);
      return true;
    },
  );
  await assert.rejects(
    ingestCallRail({ db: null, rawBody: BODY, signature: "", secret: SECRET, firmId: 1 }),
    (err) => {
      assert.equal(err.code, "BAD_SIGNATURE");
      assert.equal(err.hadSignatureHeader, false);
      return true;
    },
  );
});

// --- setFirmCallRailSecret (the store seam behind /api/studio/callrail-secret) --

test("setFirmCallRailSecret stores, replaces and clears a firm's signing key", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-secret-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const { setFirmCallRailSecret, getFirm } = await import("../ingest/store.mjs");
  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, avg_case_fee, kill_switch) VALUES ('F', 0, 1)`).run()
      .lastInsertRowid,
  );

  assert.equal(await setFirmCallRailSecret(db, firmId, "firm-own-key"), true);
  assert.equal((await getFirm(db, firmId)).callrail_webhook_secret, "firm-own-key");

  // A webhook signed with the firm's OWN key verifies against the stored value.
  const sig = createHmac("sha1", "firm-own-key").update(BODY, "utf8").digest("base64");
  const stored = (await getFirm(db, firmId)).callrail_webhook_secret;
  assert.equal(matchCallRailSignature(BODY, sig, stored), "sha1-base64");

  // Clearing falls back to null (route then uses the shared env secret).
  assert.equal(await setFirmCallRailSecret(db, firmId, null), true);
  assert.equal((await getFirm(db, firmId)).callrail_webhook_secret, null);

  // A firm id that doesn't exist updates nothing.
  assert.equal(await setFirmCallRailSecret(db, 999999, "x"), false);
});

// --- scripts/callrail-verify.mjs capture parsing --------------------------------

test("callrail-verify parses a raw HTTP-style capture (headers, blank line, byte-exact body)", () => {
  const capture = `POST /webhooks/callrail/abc HTTP/1.1\nSignature: ${DOCS_SIGNATURE}\nContent-Type: application/json\n\n${DOCS_BODY}`;
  const { headers, body } = parseCapture(capture);
  assert.equal(headers.signature, DOCS_SIGNATURE);
  assert.equal(body, DOCS_BODY, "body preserved byte-exact");
  const sig = findSignatureHeader(headers);
  assert.equal(sig.name, "signature");
  assert.equal(matchCallRailSignature(body, sig.value, DOCS_KEY), "sha1-base64");
});

test("callrail-verify parses a JSON capture with case-insensitive headers", () => {
  const capture = JSON.stringify({
    headers: { "X-CallRail-Signature": "abc123", "Content-Type": "application/json" },
    body: DOCS_BODY,
  });
  const { headers, body } = parseCapture(capture);
  assert.equal(findSignatureHeader(headers).value, "abc123");
  assert.equal(body, DOCS_BODY);
});

test("callrail-verify rejects a capture with no blank-line separator", () => {
  assert.throws(() => parseCapture("Signature: abc"), /blank line/i);
});
