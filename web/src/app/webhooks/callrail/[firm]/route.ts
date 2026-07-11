// POST /webhooks/callrail/[firm] — the PER-FIRM CallRail webhook.
//
// Identical contract to /webhooks/callrail (same shared secret, same ingest
// module, same durable-scoring event), except the firm comes from the URL, so
// every firm gets one paste-once webhook address shown in their desk Settings:
//   https://plaintiffops.com/webhooks/callrail/<firm-id>
// This is what makes phone-system setup a single copy-paste on a 15-minute
// call. The legacy env-pinned route stays for the original pilot firm.
import { ingestCallRail } from "../../../../../ingest/callrail.mjs";
import { openPipelineDb, closePipelineDb, logError, getFirm } from "../../../../../ingest/store.mjs";
import { inngest } from "../../../../../inngest/client.mjs";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ firm: string }> },
) {
  const { firm } = await params;
  // Sanity-bound the id (uuid on Postgres, integer on the local pilot).
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(firm)) {
    return Response.json({ error: "invalid firm id" }, { status: 400 });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-callrail-signature") ?? req.headers.get("signature") ?? "";

  const db = await openPipelineDb();
  try {
    // Prefer this firm's OWN CallRail account signing secret; fall back to the
    // shared env secret (the original single-pilot firm). CallRail issues one
    // token per account, so five firms each need their own.
    let secret = process.env.CALLRAIL_WEBHOOK_SECRET ?? null;
    try {
      const firmRow = await getFirm(db, firm);
      if (firmRow?.callrail_webhook_secret) secret = firmRow.callrail_webhook_secret;
    } catch {
      /* fall back to env secret */
    }
    if (!secret) {
      return Response.json(
        { error: "no CallRail secret configured for this firm" },
        { status: 500 },
      );
    }

    const result = await ingestCallRail({
      db,
      rawBody,
      signature,
      secret,
      firmId: firm,
    });

    // Hand the ingested call to the durable scoring pipeline (best-effort —
    // the score sweep cron is the fallback; scoreUnscored is idempotent).
    try {
      await inngest.send({
        name: "intakeqa/call.received",
        data: { firmId: firm, callId: result.id },
      });
    } catch (sendErr: unknown) {
      await logError(db, {
        source: "webhooks.callrail_firm.inngest_send",
        message: sendErr instanceof Error ? sendErr.message : "inngest send failed",
        firm_id: null,
      }).catch(() => {});
    }

    return Response.json(
      { ok: true, call_id: result.id, created: result.created },
      { status: 200 },
    );
  } catch (err: unknown) {
    if (err instanceof Error && (err as { code?: string }).code === "BAD_SIGNATURE") {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
    if (err instanceof Error && (err as { code?: string }).code === "BAD_PAYLOAD") {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    // Never echo raw internals; log server-side, answer generically.
    await logError(db, {
      source: "webhooks.callrail_firm",
      message: err instanceof Error ? err.message : "ingest failed",
      firm_id: null,
    }).catch(() => {});
    return Response.json({ error: "ingest failed" }, { status: 400 });
  } finally {
    await closePipelineDb(db);
  }
}
