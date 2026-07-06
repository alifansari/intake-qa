// Connector seam — one interface, many destinations. Given a firm's integration
// config, dispatch an event to either a provider adapter (Lead Docket, Filevine,
// Clio) or the generic signed webhook. Provider adapters are lazy-loaded (Twilio
// pattern) and expose: pushFlag(ctx, payload), pushOutcomePrompt(ctx, payload),
// pushCaseSummary(ctx, payload). All HTTP lives in the adapter files.
//
// These are EXPORT integrations only — they push our findings out. Nothing here
// can send SMS or touch the send chokepoint.

import { deliverWebhook } from "./webhooks.mjs";
import { decryptSecret } from "./crypto.mjs";

async function loadAdapter(provider) {
  if (provider === "leaddocket") return import("./leaddocket.mjs");
  if (provider === "filevine") return import("./filevine.mjs");
  if (provider === "clio") return import("./clio.mjs");
  return null;
}

function parseFieldMap(fieldMap) {
  if (fieldMap == null) return {};
  if (typeof fieldMap === "object") return fieldMap;
  try {
    return JSON.parse(fieldMap);
  } catch {
    return {};
  }
}

// Dispatch one event through a firm's integration. `deps` injectables:
//   fetchImpl - override global fetch (tests / mock servers)
//   decrypt   - override credential decryption (tests)
// Returns the adapter/webhook result, or { skipped, reason } when not applicable.
/**
 * @param {{ integration?: unknown, event?: string, payload?: unknown, now?: Date,
 *           fetchImpl?: unknown, decrypt?: Function }} opts
 */
export async function dispatch({
  integration,
  event,
  payload,
  now,
  fetchImpl,
  decrypt = decryptSecret,
}) {
  if (!integration || !integration.enabled) return { skipped: true, reason: "disabled" };

  if (integration.provider === "webhook") {
    return deliverWebhook({
      url: integration.webhook_url,
      secret: integration.webhook_secret,
      event,
      data: payload,
      now,
      fetchImpl,
    });
  }

  const adapter = await loadAdapter(integration.provider);
  if (!adapter) return { skipped: true, reason: "unknown_provider" };

  let creds = null;
  if (integration.credentials_encrypted) {
    try {
      creds = decrypt(integration.credentials_encrypted);
    } catch {
      return { skipped: true, reason: "credential_decrypt_failed" };
    }
  }
  const ctx = {
    creds,
    fieldMap: parseFieldMap(integration.field_map),
    baseUrl: integration.webhook_url || undefined, // optional per-provider base URL
    fetchImpl,
  };

  switch (event) {
    case "flag.created":
      return adapter.pushFlag(ctx, payload);
    case "outcome.recorded":
      return adapter.pushOutcomePrompt(ctx, payload);
    case "audit.completed":
      return adapter.pushCaseSummary
        ? adapter.pushCaseSummary(ctx, payload)
        : { skipped: true, reason: "unsupported_event" };
    default:
      return { skipped: true, reason: "unknown_event" };
  }
}
