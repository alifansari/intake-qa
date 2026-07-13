// GET /api/digest/open?t=... — the digest open-tracking pixel.
//
// The missed-cases digest embeds a 1x1 image pointing here (see
// messaging/digest-open.mjs). Authority is the HMAC token (firm id + day, no
// PII, purpose-tagged "open" so it can never be replayed against the confirm
// flow). The route is READ-ONLY on product data: its only write is one
// digest_opened row in the first-party event log, which /studio/beta turns
// into unopened-streak warnings ("three consecutive unopened digests = call
// the firm" — BETA_ONBOARDING.md).
//
// It ALWAYS answers with the gif — a broken token, missing table, or closed
// database must never draw a broken-image square in an attorney’s inbox.
import { verifyOpenToken } from "../../../../../messaging/digest-open.mjs";
import { recordProductEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Smallest valid transparent GIF (43 bytes).
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    const check = verifyOpenToken(token) as { error?: string; firmId?: string; day?: string };
    if (!check.error && check.firmId) {
      await recordProductEvent({
        event: "digest_opened",
        firmId: check.firmId,
        actor: "email-pixel",
        context: { day: check.day ?? null },
      });
    }
  } catch {
    /* best-effort — the pixel never fails */
  }
  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      // Never cache: a second open the next day must reach us, not the proxy.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
