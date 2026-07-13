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
import { decodeCallRailSecret } from "../../../../../integrations/crypto.mjs";
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
  // CallRail’s documented header is literally `Signature`
  // (https://apidocs.callrail.com/ → Security → Validating Payloads); Node
  // normalizes header names to lowercase. Keep `x-callrail-signature` as a
  // fallback for proxies/relays that rename it.
  const signature =
    req.headers.get("signature") ?? req.headers.get("x-callrail-signature") ?? "";

  const db = await openPipelineDb();
  let firmDbId: string | number | null = null;
  let secretSource = "env";
  try {
    // Prefer this firm’s OWN CallRail account signing secret; fall back to the
    // shared env secret (the original single-pilot firm). CallRail issues one
    // token per account, so five firms each need their own.
    let secret = process.env.CALLRAIL_WEBHOOK_SECRET ?? null;
    let secretDecodeError: string | null = null;
    try {
      const firmRow = await getFirm(db, firm);
      if (firmRow?.id != null) firmDbId = firmRow.id;
      if (firmRow?.callrail_webhook_secret) {
        // Stored encrypted at rest (crypto.encodeCallRailSecret) — decode back to
        // the raw signing key before HMAC verification. Handles legacy plaintext
        // and the local pilot transparently.
        secret = decodeCallRailSecret(firmRow.callrail_webhook_secret);
        secretSource = "firm";
      }
    } catch (decErr: unknown) {
      // Don’t swallow a decode failure silently: a stored-but-undecodable secret
      // (rotated/missing CALLRAIL_SECRET_KEY) would otherwise fall through to the
      // env fallback and, if that’s also unset, die as a bare 500. Remember the
      // reason so the no-secret branch below can log it.
      secretDecodeError = decErr instanceof Error ? decErr.message : "secret decode failed";
    }
    if (!secret) {
      // FAILURE LOUDNESS: no per-firm secret AND no env fallback means this
      // firm’s CallRail webhooks can never verify — its calls silently never
      // ingest. Persist an errors-table row (mirrors the bad_signature branch)
      // so /admin/status and the founder sweep surface it instead of a dead 500.
      await logError(db, {
        source: "webhooks.callrail_firm.no_secret",
        message: `No usable CallRail signing secret for firm ${firm} — its calls will NOT ingest until a secret is configured${secretDecodeError ? ` (stored secret failed to decode: ${secretDecodeError})` : ""}`,
        context: {
          firm_id: firmDbId,
          firm_slug: firm,
          decode_error: secretDecodeError,
          env_fallback_set: Boolean(process.env.CALLRAIL_WEBHOOK_SECRET),
        },
        firm_id: firmDbId,
      }).catch(() => {});
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
      // FAILURE LOUDNESS: a silent 401 here is the #1 "firm sees 0 calls forever"
      // failure mode. Persist an error_log row with the firm slug, the reason,
      // and exactly which signature formats were tried, so /admin/status (and the
      // Session-3 alerting on top of it) can surface repeated signature failures.
      const e = err as { formatsTried?: string[]; hadSignatureHeader?: boolean };
      await logError(db, {
        source: "webhooks.callrail_firm.bad_signature",
        message: `CallRail signature verification failed for firm ${firm}`,
        context: {
          firm_slug: firm,
          reason: e.hadSignatureHeader === false ? "missing Signature header" : "no format matched",
          formats_tried: e.formatsTried ?? [],
          secret_source: secretSource,
          body_bytes: rawBody.length,
        },
        firm_id: firmDbId,
      }).catch(() => {});
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
    if (err instanceof Error && (err as { code?: string }).code === "BAD_PAYLOAD") {
      await logError(db, {
        source: "webhooks.callrail_firm.bad_payload",
        message: `CallRail payload rejected for firm ${firm}: ${err.message}`,
        context: { firm_slug: firm, body_bytes: rawBody.length },
        firm_id: firmDbId,
      }).catch(() => {});
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    // Never echo raw internals; log server-side, answer generically.
    await logError(db, {
      source: "webhooks.callrail_firm",
      message: err instanceof Error ? err.message : "ingest failed",
      context: { firm_slug: firm },
      firm_id: firmDbId,
    }).catch(() => {});
    return Response.json({ error: "ingest failed" }, { status: 400 });
  } finally {
    await closePipelineDb(db);
  }
}
