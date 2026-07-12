// POST /webhooks/callrail — CallRail post-call / call-modified webhook.
//
// Thin wrapper: read the raw body + signature header, hand off to the shared
// ingest module (verifies the signature, parses the payload, upserts a `calls`
// row). No business logic lives here. Runs on the Node runtime because the
// ingest modules use node:sqlite and node:crypto.

// Plain-Node .mjs modules shared with the CLI/tests; types are inferred via
// allowJs + bundler resolution, so no explicit d.ts is needed.
import { ingestCallRail } from "../../../../ingest/callrail.mjs";
import { openPipelineDb, closePipelineDb, logError } from "../../../../ingest/store.mjs";
import { inngest } from "../../../../inngest/client.mjs";

export const runtime = "nodejs";

// Which firm this webhook endpoint belongs to. In the pilot this is a single
// firm; a multi-tenant setup would resolve it from the URL or an account map.
// Kept as a string: numeric on local SQLite, a UUID on Supabase/Postgres.
const FIRM_ID = process.env.CALLRAIL_FIRM_ID ?? "1";

export async function POST(req: Request) {
  const secret = process.env.CALLRAIL_WEBHOOK_SECRET;
  if (!secret) {
    // FAILURE LOUDNESS: with no secret this legacy env-pinned route can never
    // verify a webhook, so the pilot firm's calls silently never ingest.
    // Persist an errors-table row (mirrors the bad_signature branch below) so
    // /admin/status and the founder sweep surface it instead of a dead 500.
    const db = await openPipelineDb();
    try {
      await logError(db, {
        source: "webhooks.callrail.no_secret",
        message: `CALLRAIL_WEBHOOK_SECRET is not configured (legacy env-pinned route, firm ${FIRM_ID}) — calls will NOT ingest until it is set`,
        context: { firm_slug: String(FIRM_ID) },
        firm_id: null,
      }).catch(() => {});
    } finally {
      await closePipelineDb(db);
    }
    return Response.json(
      { error: "CALLRAIL_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  // CallRail's documented header is literally `Signature` (Node lowercases it);
  // keep `x-callrail-signature` as a fallback for renaming proxies.
  const signature =
    req.headers.get("signature") ??
    req.headers.get("x-callrail-signature") ??
    "";

  const db = await openPipelineDb();
  try {
    const result = await ingestCallRail({
      db,
      rawBody,
      signature,
      secret,
      firmId: FIRM_ID,
    });

    // P0-1: hand the newly ingested call to the durable scoring pipeline. The
    // scorePipeline Inngest function listens for this event; without it,
    // CallRail-ingested calls would sit un-scored forever. Emitting is
    // best-effort — the retention/score cron is the fallback — so a transient
    // Inngest outage never fails the webhook (CallRail would otherwise retry and
    // re-ingest). Emitting on both created and modified is safe: scoreUnscored is
    // idempotent (it only touches calls with no flag yet).
    try {
      await inngest.send({
        name: "intakeqa/call.received",
        data: { firmId: FIRM_ID, callId: result.id },
      });
    } catch (sendErr: unknown) {
      await logError(db, {
        source: "webhooks.callrail.inngest_send",
        message:
          sendErr instanceof Error ? sendErr.message : "inngest send failed",
        firm_id: null,
      }).catch(() => {});
    }

    return Response.json(
      { ok: true, call_id: result.id, created: result.created },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error && (err as { code?: string }).code === "BAD_SIGNATURE") {
      // Failure loudness: persist the 401 with which formats were tried, so a
      // misconfigured secret is visible in /admin/status instead of silent.
      const e = err as { formatsTried?: string[]; hadSignatureHeader?: boolean };
      await logError(db, {
        source: "webhooks.callrail.bad_signature",
        message: `CallRail signature verification failed (legacy env-pinned route, firm ${FIRM_ID})`,
        context: {
          firm_slug: String(FIRM_ID),
          reason: e.hadSignatureHeader === false ? "missing Signature header" : "no format matched",
          formats_tried: e.formatsTried ?? [],
          secret_source: "env",
          body_bytes: rawBody.length,
        },
        firm_id: null,
      }).catch(() => {});
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
    if (err instanceof Error && (err as { code?: string }).code === "BAD_PAYLOAD") {
      await logError(db, {
        source: "webhooks.callrail.bad_payload",
        message: `CallRail payload rejected (legacy route): ${err.message}`,
        context: { firm_slug: String(FIRM_ID), body_bytes: rawBody.length },
        firm_id: null,
      }).catch(() => {});
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    // P1(c): don't echo raw internal error text to the caller. Log details
    // server-side; return a generic message.
    await logError(db, {
      source: "webhooks.callrail",
      message: err instanceof Error ? err.message : "ingest failed",
      firm_id: null,
    }).catch(() => {});
    return Response.json({ error: "ingest failed" }, { status: 400 });
  } finally {
    await closePipelineDb(db);
  }
}
