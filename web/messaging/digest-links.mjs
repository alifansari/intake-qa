// Signed one-click action tokens for the missed-cases digest email.
//
// The digest's "We called them" link must work with NO login (the attorney is
// in their inbox, not the app), so authority comes from the token itself:
// an HMAC-SHA256 signature over {firm, flag, status, exp} using
// DIGEST_LINK_SECRET. Properties, in order of importance:
//   * No PII ever enters the URL (compliance §VI) — IDs and a status only.
//   * Fail closed: no secret configured → signing throws, and the digest
//     simply renders without action links.
//   * Single-purpose: a token can only set ONE pre-agreed status on ONE flag
//     of ONE firm, and it expires.
// Clicking the link never mutates anything — email scanners prefetch GET
// links, so the confirm page requires a human POST before the write.

import { createHmac, timingSafeEqual } from "node:crypto";

export const DIGEST_TOKEN_TTL_DAYS = 14;

// The only statuses a mail link may set. Deliberately excludes terminal
// outcomes (signed / didn't sign) — those deserve the desk, not a stray click.
export const LINKABLE_STATUSES = ["reached_out", "back_in_touch"];

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest();
}

export function digestLinkSecret(env = process.env) {
  const s = env.DIGEST_LINK_SECRET;
  return typeof s === "string" && s.length >= 16 ? s : null;
}

// → token string, or throws if the secret is missing/weak (fail closed).
export function signDigestToken(
  { firmId, flagId, status, exp },
  env = process.env,
  now = new Date(),
) {
  const secret = digestLinkSecret(env);
  if (!secret) throw new Error("DIGEST_LINK_SECRET is not set (need >= 16 chars)");
  if (!LINKABLE_STATUSES.includes(status)) throw new Error(`status not linkable: ${status}`);
  const expiry =
    exp ?? Math.floor(now.getTime() / 1000) + DIGEST_TOKEN_TTL_DAYS * 24 * 60 * 60;
  const payload = b64url(
    JSON.stringify({ v: 1, f: String(firmId), g: String(flagId), s: status, e: expiry }),
  );
  return `${payload}.${b64url(hmac(payload, secret))}`;
}

// → {firmId, flagId, status} on success, or {error} (never throws).
export function verifyDigestToken(token, env = process.env, now = new Date()) {
  const secret = digestLinkSecret(env);
  if (!secret) return { error: "not_configured" };
  if (typeof token !== "string" || token.length > 2048) return { error: "malformed" };
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
  if (data?.v !== 1 || !data.f || !data.g || !LINKABLE_STATUSES.includes(data.s)) {
    return { error: "malformed" };
  }
  if (typeof data.e !== "number" || data.e * 1000 < now.getTime()) {
    return { error: "expired" };
  }
  return { firmId: data.f, flagId: data.g, status: data.s };
}
