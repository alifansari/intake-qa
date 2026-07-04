// POST /webhooks/twilio — inbound SMS webhook (caller replies).
//
// Thin wrapper: verify Twilio's signature (when an auth token is configured),
// parse the form-encoded body, hand off to the shared inbound module which
// stores the message, honors opt-outs, and drafts a reply into the approval
// queue. No business logic here. Node runtime — the modules use node:sqlite
// and node:crypto. Nothing here sends: replies are only ever DRAFTED.

// Plain-Node .mjs modules shared with the CLI/tests; types are inferred via
// allowJs + bundler resolution, so no explicit d.ts is needed.
import { ingestInbound, verifyTwilioSignature } from "../../../../messaging/inbound.mjs";
import { openMigratedDb } from "../../../../db/connection.mjs";

export const runtime = "nodejs";

// Which firm this webhook belongs to (single-firm pilot; matches CallRail route).
const FIRM_ID = Number(process.env.CALLRAIL_FIRM_ID ?? "1");

export async function POST(req: Request) {
  const rawBody = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) params[k] = v;

  // Verify the signature when an auth token is set; skip in the bare pilot.
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const ok = verifyTwilioSignature({
      url: req.url,
      params,
      signatureHeader: signature,
      authToken,
    });
    if (!ok) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  const from = params.From ?? params.from ?? "";
  const body = params.Body ?? params.body ?? "";

  const db = openMigratedDb();
  try {
    const result = await ingestInbound({ db, firmId: FIRM_ID, from, body });
    return Response.json({ ok: true, ...result }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "inbound failed";
    return Response.json({ error: message }, { status: 400 });
  } finally {
    db.close();
  }
}
