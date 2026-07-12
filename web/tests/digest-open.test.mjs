// Tests for the digest open-tracking token + pixel: fail-closed without a
// secret, purpose-tagged so open tokens and confirm-link tokens can never be
// swapped, no PII in the URL, and the pixel only renders into the digest when
// links are configured.

import { test } from "node:test";
import assert from "node:assert/strict";

import { signOpenToken, verifyOpenToken, openPixelTag } from "../messaging/digest-open.mjs";
import { signDigestToken } from "../messaging/digest-links.mjs";
import { buildMissedDigest, renderMissedDigest } from "../messaging/missed-digest.mjs";

const ENV = { DIGEST_LINK_SECRET: "0123456789abcdef0123456789abcdef" };

test("open token round-trips firm + day; carries no PII", () => {
  const token = signOpenToken({ firmId: "f-1", day: "2026-07-11" }, ENV);
  assert.ok(token);
  const back = verifyOpenToken(token, ENV);
  assert.deepEqual(back, { firmId: "f-1", day: "2026-07-11" });
  // The payload half decodes to ids only — no names, phones, or emails possible.
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  assert.deepEqual(Object.keys(payload).sort(), ["d", "f", "p", "v"]);
});

test("fail closed: no secret → no token, no pixel, verify refuses", () => {
  assert.equal(signOpenToken({ firmId: "f", day: "2026-07-11" }, {}), null);
  assert.equal(openPixelTag({ base: "https://x.test", firmId: "f", day: "2026-07-11" }, {}), "");
  assert.deepEqual(verifyOpenToken("anything", {}), { error: "not_configured" });
});

test("tampering and cross-purpose replay are rejected", () => {
  const token = signOpenToken({ firmId: "f-1", day: "2026-07-11" }, ENV);
  assert.equal(verifyOpenToken(`${token}x`, ENV).error, "bad_signature");
  assert.equal(verifyOpenToken("garbage", ENV).error, "malformed");
  // A CONFIRM-link token (different purpose) must never verify as an open.
  const confirm = signDigestToken({ firmId: "f-1", flagId: "g-1", status: "reached_out" }, ENV);
  assert.ok(verifyOpenToken(confirm, ENV).error, "confirm token must not verify as open");
  // Wrong secret fails.
  assert.equal(
    verifyOpenToken(token, { DIGEST_LINK_SECRET: "another-secret-16chars-long!!" }).error,
    "bad_signature",
  );
});

test("the digest embeds the pixel only when links are configured", () => {
  const data = buildMissedDigest({
    firm: { id: "f-1", name: "Test Firm" },
    flags: [],
    callsReceived: 3,
    now: new Date("2026-07-11T12:00:00Z"),
  });
  const withSecret = renderMissedDigest(data, { appUrl: "https://x.test", env: ENV });
  assert.match(withSecret, /\/api\/digest\/open\?t=/);
  assert.match(withSecret, /width="1" height="1"/);

  const withoutSecret = renderMissedDigest(data, { appUrl: "https://x.test", env: {} });
  assert.doesNotMatch(withoutSecret, /\/api\/digest\/open/);
});
