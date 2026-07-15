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

// --- Signature verification ---------------------------------------------------
//
// CallRail's DOCUMENTED webhook signature spec (apidocs.callrail.com, section
// "Security" → "Validating Payloads", https://apidocs.callrail.com/#validating-payloads):
//
//   * Header name: `Signature` (Node lowercases it to `signature`).
//   * Algorithm:   HMAC-**SHA1** over the RAW request body.
//   * Key:         your company signing key (issued per CallRail account; the
//                  webhook-integration API response calls it `signing_key`).
//   * Encoding:    **Base64** (Ruby `Base64.strict_encode64` in their example).
//
// The docs publish a test vector — signing key `072e77e426f92738a72fe23c4d1953b4`
// over their sample JSON body must produce `UZAHbUdfm3GqL7qzilGozGzWV64=` — and
// we reproduce it exactly in tests/callrail-signature.test.mjs (fixture:
// tests/fixtures/callrail-docs-payload.json, byte-for-byte from the docs page).
//
// Because CallRail's docs have historically been thin here and this codebase
// previously assumed SHA256-hex, we accept a small ordered set of formats,
// DOCUMENTED FORMAT FIRST, and report which one matched so the assumption is
// visible in logs the first time each firm's webhook verifies.
export const CALLRAIL_SIGNATURE_FORMATS = [
  "sha1-base64", // the documented format — try first
  "sha256-base64",
  "sha256-hex", // legacy assumption in this codebase (kept for back-compat)
  "sha1-hex",
];

// Compute the digest of `rawBody` under `secret` for every supported format.
// Used by verification and by scripts/callrail-verify.mjs (the setup-call
// diagnostic that prints all candidates when nothing matches).
export function computeCallRailDigests(rawBody, secret) {
  const out = {};
  for (const format of CALLRAIL_SIGNATURE_FORMATS) {
    const [algo, encoding] = format.split("-");
    out[format] = createHmac(algo, secret).update(rawBody, "utf8").digest(encoding);
  }
  return out;
}

// Constant-time string comparison (length leak is fine — digest lengths are
// public per format).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Which supported signature format does this header match? Returns the format
// name (e.g. "sha1-base64") or null. Tries the documented format first.
export function matchCallRailSignature(rawBody, signatureHeader, secret) {
  if (!secret) throw new Error("CallRail webhook secret is not set");
  if (!signatureHeader) return null;
  const received = String(signatureHeader).trim();
  if (!received) return null;

  const digests = computeCallRailDigests(rawBody, secret);
  for (const format of CALLRAIL_SIGNATURE_FORMATS) {
    if (safeEqual(digests[format], received)) return format;
  }
  return null;
}

// Boolean wrapper kept for existing callers/tests.
export function verifyCallRailSignature(rawBody, signatureHeader, secret) {
  return matchCallRailSignature(rawBody, signatureHeader, secret) !== null;
}

// Log the matched signature format ONCE per firm per process, so the first
// verified webhook for each firm records which format assumption held.
const loggedFormatForFirm = new Set();
function logFirstVerifiedFormat(firmId, format) {
  const key = String(firmId);
  if (loggedFormatForFirm.has(key)) return;
  loggedFormatForFirm.add(key);
  console.log(
    `[callrail] firm=${key} first verified webhook: signature format=${format}` +
      (format === "sha1-base64" ? " (documented format)" : " (NON-documented format — note it)"),
  );
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

  // Marketing attribution: CallRail sends these on the call payload; the mapper
  // used to drop them. Kept so we can attribute SIGNABLE value to lead source.
  // Marketing metadata only — no claimant PII (§VI).
  const lead_source =
    p.source_name ?? p.formatted_tracking_source ?? p.lead_source ?? p.utm_source ?? null;
  const lead_campaign = p.campaign ?? p.utm_campaign ?? null;
  const attribution = {
    source_name: p.source_name ?? null,
    tracking_source: p.formatted_tracking_source ?? null,
    campaign: p.campaign ?? null,
    utm_source: p.utm_source ?? null,
    utm_medium: p.utm_medium ?? null,
    utm_campaign: p.utm_campaign ?? null,
    utm_term: p.utm_term ?? null,
    keywords: p.keywords ?? null,
    gclid: p.gclid ?? null,
    tracking_number: p.tracking_phone_number ?? null,
    landing_page: p.landing_page_url ?? null,
    referrer: p.referrer ?? null,
  };
  const hasAttribution = Object.values(attribution).some((v) => v != null);

  return {
    source: "callrail",
    external_call_id: external_call_id != null ? String(external_call_id) : null,
    recording_url,
    transcript,
    caller_phone,
    caller_name,
    received_at,
    lead_source: lead_source != null ? String(lead_source) : null,
    lead_campaign: lead_campaign != null ? String(lead_campaign) : null,
    attribution_json: hasAttribution ? JSON.stringify(attribution) : null,
  };
}

// Full ingest: verify → parse → upsert. Throws on a bad signature so callers
// can return 401 (the error carries `formatsTried` so routes can log loudly
// which formats were attempted). Returns the upsertCall result ({ id, created })
// plus `signature_format` (which format verified).
export async function ingestCallRail({ db, rawBody, signature, secret, firmId }) {
  const signatureFormat = matchCallRailSignature(rawBody, signature, secret);
  if (!signatureFormat) {
    const err = new Error("Invalid CallRail signature");
    err.code = "BAD_SIGNATURE";
    err.formatsTried = [...CALLRAIL_SIGNATURE_FORMATS];
    err.hadSignatureHeader = Boolean(signature && String(signature).trim());
    throw err;
  }
  logFirstVerifiedFormat(firmId, signatureFormat);
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
  const result = await upsertCall(db, { firm_id: firmId, ...fields });
  return { ...result, signature_format: signatureFormat };
}
