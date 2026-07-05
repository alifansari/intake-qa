# Intake QA outbound webhooks

Intake QA can push events to any URL you configure, so your CRM or agency tooling
can react without us building a bespoke connector. Every request is **signed** so
you can verify it genuinely came from us.

## Events

| Event              | Fires when                                   | `data` payload                     |
|--------------------|----------------------------------------------|------------------------------------|
| `flag.created`     | a call is flagged as a leaked signable case  | `{ call, flag }`                   |
| `outcome.recorded` | an outcome is recorded for a conversation    | `{ conversation_id, result }`      |
| `audit.completed`  | a Leak Audit session finishes processing     | `{ token, summary }`               |

## Request format

```
POST <your configured URL>
Content-Type: application/json
X-IntakeQA-Event: flag.created
X-IntakeQA-Signature: sha256=<hex>

{"event":"flag.created","data":{...},"sent_at":"2026-07-04T12:00:00.000Z"}
```

## Verifying the signature

The signature is an HMAC-SHA256 of the **exact raw request body**, keyed by the
`webhook_secret` you set when configuring the integration.

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret, rawBody, header) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = String(header).replace(/^sha256=/, "");
  const a = Buffer.from(expected), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Compute the HMAC over the raw bytes **before** JSON-parsing. Reject the request if
it does not match.

## Notes

- Delivery is best-effort; a failure on your end never breaks our pipeline.
- Secrets are stored encrypted at rest on our side (AES-256-GCM).
- These are **export** events only — Intake QA never sends SMS through this channel;
  all outbound messaging goes through the human-approved send chokepoint.
