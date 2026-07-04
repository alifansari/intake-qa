// POST /webhooks/callrail — CallRail post-call / call-modified webhook.
//
// Thin wrapper: read the raw body + signature header, hand off to the shared
// ingest module (verifies the signature, parses the payload, upserts a `calls`
// row). No business logic lives here. Runs on the Node runtime because the
// ingest modules use node:sqlite and node:crypto.

// Plain-Node .mjs modules shared with the CLI/tests; types are inferred via
// allowJs + bundler resolution, so no explicit d.ts is needed.
import { ingestCallRail } from "../../../../ingest/callrail.mjs";
import { openMigratedDb } from "../../../../db/connection.mjs";

export const runtime = "nodejs";

// Which firm this webhook endpoint belongs to. In the pilot this is a single
// firm; a multi-tenant setup would resolve it from the URL or an account map.
const FIRM_ID = Number(process.env.CALLRAIL_FIRM_ID ?? "1");

export async function POST(req: Request) {
  const secret = process.env.CALLRAIL_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CALLRAIL_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-callrail-signature") ??
    req.headers.get("signature") ??
    "";

  const db = openMigratedDb();
  try {
    const result = ingestCallRail({
      db,
      rawBody,
      signature,
      secret,
      firmId: FIRM_ID,
    });
    return Response.json(
      { ok: true, call_id: result.id, created: result.created },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error && (err as { code?: string }).code === "BAD_SIGNATURE") {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "ingest failed";
    return Response.json({ error: message }, { status: 400 });
  } finally {
    db.close();
  }
}
