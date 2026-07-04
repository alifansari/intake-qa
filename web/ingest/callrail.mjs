// CallRail webhook ingestion: verify signature, parse the payload, upsert a
// `calls` row. Handles both the post-call and call-modified webhook shapes.

import { createHmac, timingSafeEqual } from "node:crypto";
import { upsertCall } from "./db.mjs";

// Verify the webhook signature. CallRail signs the raw request body with a
// shared secret; we recompute the HMAC-SHA256 and compare in constant time.
// NOTE: the exact header name / digest encoding is configurable per CallRail
// account — adjust `expected` here to match your webhook settings if needed.
export function verifyCallRailSignature(rawBody, signatureHeader, secret) {
  if (!secret) throw new Error("CALLRAIL_WEBHOOK_SECRET is not set");
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signatureHeader), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Map a CallRail post_call / call_modified payload to our calls columns.
// CallRail field names vary a little by webhook version, so we read a few
// common aliases and fall back gracefully.
export function parseCallRailPayload(payload) {
  const p = payload ?? {};
  const external_call_id = p.id ?? p.call_id ?? p.resource_id ?? null;
  const recording_url = p.recording ?? p.recording_url ?? null;
  const transcript =
    p.transcription ?? p.transcript ?? p.call_transcription ?? null;
  const caller_phone =
    p.customer_phone_number ?? p.caller_id ?? p.customer_phone ?? null;
  const caller_name = p.customer_name ?? p.caller_name ?? null;
  const received_at =
    p.start_time ?? p.created_at ?? p.received_at ?? new Date().toISOString();

  return {
    source: "callrail",
    external_call_id: external_call_id != null ? String(external_call_id) : null,
    recording_url,
    transcript,
    caller_phone,
    caller_name,
    received_at,
  };
}

// Full ingest: verify → parse → upsert. Throws on a bad signature so callers
// can return 401. Returns the upsertCall result ({ id, created }).
export function ingestCallRail({ db, rawBody, signature, secret, firmId }) {
  if (!verifyCallRailSignature(rawBody, signature, secret)) {
    const err = new Error("Invalid CallRail signature");
    err.code = "BAD_SIGNATURE";
    throw err;
  }
  const payload = JSON.parse(rawBody);
  const fields = parseCallRailPayload(payload);
  return upsertCall(db, { firm_id: firmId, ...fields });
}
