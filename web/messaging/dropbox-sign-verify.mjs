// Dropbox Sign webhook signature verification — kept in its OWN module (only
// node:crypto, no SDK) so the /webhooks/dropbox-sign route can import it without
// pulling in the lazy `@dropbox/sign` provider from handoff.mjs. That mirrors how
// the Twilio SDK stays out of the twilio route's graph.

import { createHmac, timingSafeEqual } from "node:crypto";

// Verify Dropbox Sign's event hash: HMAC-SHA256 (hex) of the string
// `event_time + event_type`, keyed by the account API key. Compared in constant
// time. Returns false on any mismatch/missing hash.
export function verifyDropboxSignEvent({ event, apiKey }) {
  if (!apiKey) throw new Error("DROPBOX_SIGN_API_KEY is not set");
  const eventHash = event?.event_hash;
  if (!eventHash) return false;

  const data = `${event.event_time}${event.event_type}`;
  const expected = createHmac("sha256", apiKey).update(data, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(eventHash), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
