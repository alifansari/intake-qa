// POST /api/desk/filevine/push — write the finished intake into the firm's
// Filevine as a real matter (person + project + facts). The keystone / moat: the
// record composes itself and lands in the system the firm already lives in, so
// nobody re-keys anything.
//
// SAFE BY DEFAULT: if the firm hasn't connected Filevine (no enabled integration
// + credentials), this STAGES — it composes the record and returns it, and makes
// NO external call. Going live is purely a matter of the firm adding their
// Filevine credentials + field mapping to firm_integrations. Firm-scoped + auth.
import { z } from "zod";
import { requireDeskFirm } from "@/lib/desk/firm";
import { composeIntakeFile } from "@/lib/desk/intake-file.mjs";

export const runtime = "nodejs";

const Body = z.object({
  id: z.union([z.string().max(64), z.number()]).optional().nullable(),
  form: z.record(z.string(), z.unknown()).optional().default({}),
  verdict: z.record(z.string(), z.unknown()).optional().nullable(),
});

async function openScoped() {
  const store = await import("../../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured || !store.pipelineDbConfigured()) {
    return { store, db: null as unknown };
  }
  const db = await store.openPipelineDb();
  return { store, db };
}

async function loadCaseTypes(): Promise<Array<{ id: string; label: string }>> {
  try {
    const mod = await import("@/lib/desk/triage-engine.mjs");
    return await mod.triageCaseTypes();
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { store, db } = await openScoped();
  if (!db) return Response.json({ error: "no database" }, { status: 503 });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm } = gate;

    const caseTypes = await loadCaseTypes();
    const record = composeIntakeFile({
      id: body.id ?? null,
      form: body.form ?? {},
      verdict: (body.verdict ?? null) as Record<string, unknown> | null,
      caseTypes,
    });

    const integration = await store.getFirmIntegration(db, firm.id, "filevine");
    if (!integration || !integration.enabled || !integration.credentials_encrypted) {
      // Not connected yet — stage it, no external call, honest.
      return Response.json({
        ok: true,
        staged: true,
        reason: "filevine_not_connected",
        record,
      });
    }

    const { dispatch } = await import("../../../../../../integrations/connector.mjs");
    const result = await dispatch({ integration, event: "intake.created", payload: { record } });
    return Response.json({ ok: true, staged: false, result, external_ref: record.external_ref });
  } finally {
    await store.closePipelineDb(db);
  }
}
