// Open-tracking for the missed-cases digest — the least-invasive mechanism
// that makes BETA_ONBOARDING.md's "three consecutive unopened digests = call
// the firm" measurable. There is no Resend-webhook plumbing in this codebase,
// so this is a 1x1 pixel: the digest embeds <img src="/api/digest/open?t=...">
// and the route records a digest_opened event.
//
// Same fail-closed HMAC discipline as digest-links.mjs, with a DIFFERENT
// purpose tag baked into the payload (p:"open") so an open token can never be
// replayed against the confirm flow or vice versa. Properties:
//   * No PII in the URL — a firm id and a day only (compliance §VI).
//   * No secret configured → no pixel rendered, nothing degrades to insecure.
//   * Read-only: the route only appends an events row; it can't mutate cases.
//   * Honest limits: image-blocking clients undercount, prefetch proxies can
//     overcount — /studio/beta labels opens as approximate.

import { createHmac, timingSafeEqual } from "node:crypto";
import { digestLinkSecret } from "./digest-links.mjs";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest();
}

// → token string, or null when no secret is configured (fail closed, and the
// digest simply renders without a pixel).
export function signOpenToken({ firmId, day }, env = process.env) {
  const secret = digestLinkSecret(env);
  if (!secret) return null;
  const payload = b64url(JSON.stringify({ v: 1, p: "open", f: String(firmId), d: String(day) }));
  return `${payload}.${b64url(hmac(payload, secret))}`;
}

// → { firmId, day } on success, or { error } (never throws).
export function verifyOpenToken(token, env = process.env) {
  const secret = digestLinkSecret(env);
  if (!secret) return { error: "not_configured" };
  if (typeof token !== "string" || token.length > 1024) return { error: "malformed" };
  const dot = token.indexOf(".");
  if (dot <= 0) return { error: "malformed" };
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected;
  let given;
  try {
    expected = hmac(payload, secret);
    given = Buffer.from(sig, "base64url");
  } catch {
    return { error: "malformed" };
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { error: "bad_signature" };
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { error: "malformed" };
  }
  if (data?.v !== 1 || data.p !== "open" || !data.f || !data.d) return { error: "malformed" };
  return { firmId: data.f, day: data.d };
}

// The <img> tag for a digest, or "" when tracking isn't configured.
export function openPixelTag({ base, firmId, day }, env = process.env) {
  const token = signOpenToken({ firmId, day }, env);
  if (!token) return "";
  const src = `${String(base).replace(/\/$/, "")}/api/digest/open?t=${encodeURIComponent(token)}`;
  return `<img src="${src}" width="1" height="1" alt="" style="display:none" />`;
}
