// Generic outbound webhooks — the escape hatch that lets any CRM/agency integrate
// without us building a bespoke connector. We POST signed JSON events
// (flag.created, outcome.recorded, audit.completed) to a firm-configured URL,
// HMAC-SHA256 signed with the firm's webhook_secret so the receiver can verify
// authenticity. See docs/webhooks.md. The `fetchImpl` is injectable for tests.

import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_EVENTS = ["flag.created", "outcome.recorded", "audit.completed"];

// Canonical JSON body for an event (stable key order not required — we sign the
// exact string we send).
export function buildEventBody({ event, data, now }) {
  return JSON.stringify({
    event,
    data,
    sent_at: (now ?? new Date()).toISOString(),
  });
}

// Hex HMAC-SHA256 signature of `body` under `secret`.
export function signBody(secret, body) {
  return createHmac("sha256", String(secret)).update(String(body)).digest("hex");
}

// Constant-time verification of a webhook signature (for a receiver, and tests).
export function verifySignature(secret, body, signature) {
  const expected = signBody(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature ?? ""));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Deliver a signed event. Returns { delivered, status } or { delivered:false,
// skipped } when no URL/secret is configured. Never throws on a delivery error —
// integration failures must not break the pipeline (they are logged upstream).
export async function deliverWebhook({ url, secret, event, data, now, fetchImpl }) {
  if (!url || !secret) return { delivered: false, skipped: true, reason: "not_configured" };
  if (!WEBHOOK_EVENTS.includes(event)) {
    return { delivered: false, skipped: true, reason: "unknown_event" };
  }
  const body = buildEventBody({ event, data, now });
  const signature = signBody(secret, body);
  const doFetch = fetchImpl ?? fetch;
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-intakeqa-event": event,
        "x-intakeqa-signature": `sha256=${signature}`,
      },
      body,
    });
    return { delivered: res.ok, status: res.status };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : String(err) };
  }
}
