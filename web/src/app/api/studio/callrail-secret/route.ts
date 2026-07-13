// /api/studio/callrail-secret — founder-only. Set (or clear) a firm’s own
// CallRail webhook signing key: `firms.callrail_webhook_secret` (supabase
// migration 0034 / local 0026).
//
// WHY: CallRail issues ONE signing key per CallRail account — you don’t choose
// it — so the shared CALLRAIL_WEBHOOK_SECRET can only ever verify one firm.
// Every additional firm silently 401s until its own key is stored. This route
// is the no-DB-edits way to store it during the setup call (UI lives on
// /studio/onboard-firm).
//
// Writes go through the Repository/store seam (ingest/store.mjs), same as the
// webhook route reads, so local SQLite and hosted Postgres behave identically.
// GET reports only WHETHER a secret is set — the secret itself is never
// returned by any endpoint.
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import {
  openPipelineDb,
  closePipelineDb,
  getFirm,
  setFirmCallRailSecret,
} from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

// Same shape the per-firm webhook route accepts (uuid on Postgres, integer on
// the local pilot DB).
const FirmId = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/, "invalid firm id");

const Body = z.object({
  firm_id: FirmId,
  // CallRail signing keys are hex-ish tokens (~32 chars). Be permissive on
  // charset, strict on obvious paste accidents. `null` clears the secret so the
  // firm falls back to the shared env secret.
  secret: z
    .string()
    .trim()
    .min(8, "that looks too short to be a CallRail signing key")
    .max(200)
    .nullable(),
});

export async function GET(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  const firmId = new URL(req.url).searchParams.get("firm_id") ?? "";
  if (!FirmId.safeParse(firmId).success) {
    return Response.json({ error: "invalid firm id" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const firm = await getFirm(db, firmId);
    if (!firm) return Response.json({ error: "firm not found" }, { status: 404 });
    return Response.json({
      firm_id: String(firm.id),
      firm_name: firm.name ?? null,
      // Never the secret itself — only whether one is stored.
      secret_configured: Boolean(firm.callrail_webhook_secret),
    });
  } catch {
    return Response.json({ error: "lookup failed" }, { status: 500 });
  } finally {
    await closePipelineDb(db);
  }
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.issues[0]?.message ?? "invalid body"
        : "expected { firm_id, secret }";
    return Response.json({ error: msg }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const firm = await getFirm(db, body.firm_id);
    if (!firm) return Response.json({ error: "firm not found" }, { status: 404 });

    const updated = await setFirmCallRailSecret(db, firm.id, body.secret);
    if (!updated) {
      return Response.json({ error: "firm not updated" }, { status: 500 });
    }
    return Response.json({
      ok: true,
      firm_id: String(firm.id),
      firm_name: firm.name ?? null,
      secret_configured: body.secret !== null,
    });
  } catch (e) {
    // A missing callrail_webhook_secret column means migration 0034 (hosted) /
    // 0026 (local) hasn’t been applied — say so instead of a generic 500.
    const msg = e instanceof Error ? e.message : "";
    if (/callrail_webhook_secret/i.test(msg)) {
      return Response.json(
        { error: "migration 0034_firm_callrail_secret has not been applied to this database" },
        { status: 500 },
      );
    }
    return Response.json({ error: "could not save secret" }, { status: 500 });
  } finally {
    await closePipelineDb(db);
  }
}
