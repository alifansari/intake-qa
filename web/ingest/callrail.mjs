// CallRail webhook ingestion: verify signature, parse the payload, upsert a
// `calls` row. Handles both the post-call and call-modified webhook shapes.

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { upsertCall } from "./store.mjs";

// P1(b): CallRail payloads are attacker-influencable (a spoofed webhook body, or
// a benign but malformed one). Validate the shape after JSON.parse; a call that
// doesn't parse to an object is rejected (the route returns 400). The schema is
// permissive on fields (CallRail's field names vary by webhook version — see
// parseCallRailPayload) but requires the top level to be an object.
const CallRailPayloadSchema = z.object({}).passthrough();

// Normalize a caller phone to E.164 (+<countrycode><number>) BEFORE it can reach
// any store / send path. US-centric for the pilot: 10 digits -> +1XXXXXXXXXX,
// 11 digits starting with 1 -> +1XXXXXXXXXX, an existing +… is validated. Returns
// null when the input can't be normalized to a plausible E.164 number, so a
// garbage/injection value never flows downstream.
export function normalizeE164(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

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
export async function ingestCallRail({ db, rawBody, signature, secret, firmId }) {
  if (!verifyCallRailSignature(rawBody, signature, secret)) {
    const err = new Error("Invalid CallRail signature");
    err.code = "BAD_SIGNATURE";
    throw err;
  }
  // P1(b): parse + validate the boundary. A body that isn't valid JSON, or isn't
  // an object, is a bad payload (400 upstream) — never a 500.
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const err = new Error("CallRail payload is not valid JSON");
    err.code = "BAD_PAYLOAD";
    throw err;
  }
  const validated = CallRailPayloadSchema.safeParse(payload);
  if (!validated.success) {
    const err = new Error("CallRail payload is not a valid object");
    err.code = "BAD_PAYLOAD";
    throw err;
  }

  const fields = parseCallRailPayload(validated.data);
  // Normalize the caller phone to E.164 before it can reach any store/send path.
  // Keep the raw value out of the DB when it can't be normalized (null instead).
  fields.caller_phone = normalizeE164(fields.caller_phone);
  return upsertCall(db, { firm_id: firmId, ...fields });
}
