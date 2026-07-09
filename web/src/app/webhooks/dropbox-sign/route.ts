// POST /webhooks/dropbox-sign — e-sign completion webhook (sandbox/test mode).
//
// Dropbox Sign POSTs multipart/form-data with a single `json` field holding the
// event. We parse it, verify the event_hash (HMAC-SHA256 of event_time+event_type
// keyed by the API key) when DROPBOX_SIGN_API_KEY is set, and on a
// `signature_request_all_signed` event correlate the signature_request_id back to
// its handoff and record the signed outcome + recovery. No business logic here.
//
// Dropbox Sign REQUIRES the literal ack body `Hello API Event Received` on 200,
// or it retries and eventually disables the callback. Node runtime — the shared
// modules use node:sqlite and node:crypto. Nothing here sends anything.

// Plain-Node .mjs modules shared with the CLI/tests; types are inferred via
// allowJs + bundler resolution, so no explicit d.ts is needed.
import { completeSignatureRequest } from "../../../../messaging/outcome.mjs";
import { completeNdaSignature } from "../../../../beta/nda.mjs";
import { verifyDropboxSignEvent } from "../../../../messaging/dropbox-sign-verify.mjs";
import { openPipelineDb, closePipelineDb } from "../../../../ingest/store.mjs";

export const runtime = "nodejs";

const ACK = "Hello API Event Received";

export async function POST(req: Request) {
  let event: {
    event?: { event_type?: string; event_time?: string; event_hash?: string };
    signature_request?: { signature_request_id?: string };
  };
  try {
    const form = await req.formData();
    const json = form.get("json");
    event = JSON.parse(typeof json === "string" ? json : "");
  } catch {
    return new Response("invalid payload", { status: 400 });
  }

  // Verify the event hash when the API key is configured; skip in the bare pilot.
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (apiKey) {
    const ok = verifyDropboxSignEvent({ event: event.event, apiKey });
    if (!ok) return new Response("invalid signature", { status: 401 });
  }

  if (event.event?.event_type === "signature_request_all_signed") {
    const signatureRequestId = event.signature_request?.signature_request_id;
    if (signatureRequestId) {
      const db = await openPipelineDb();
      try {
        // Two signature flows share this callback URL; each no-ops with
        // { handled: false } when the id belongs to the other. Retainer
        // handoffs first (the original flow), then beta NDAs (migration 0021).
        const handoff = await completeSignatureRequest({ db, signatureRequestId });
        if (!handoff.handled) {
          await completeNdaSignature({ db, signatureRequestId });
        }
      } finally {
        await closePipelineDb(db);
      }
    }
  }

  // Dropbox Sign requires this exact ack body regardless of what we did.
  return new Response(ACK, { status: 200 });
}
