// POST /api/desk/flag-status — persist a missed-case workflow status click.
// Signed-in + firm-scoped: the flag must belong to the caller's own firm
// (resolveDeskFirm), so no firm can touch another's queue. The write is a
// sibling upsert; the frozen flags row is never mutated.
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveDeskFirm } from "@/lib/desk/firm";

export const runtime = "nodejs";

const Body = z.object({
  flag_id: z.union([z.string().min(1).max(64), z.number().int()]),
  status: z.enum(["needs_callback", "reached_out", "back_in_touch", "signed", "didnt_sign"]),
});

export async function POST(req: Request) {
  let user = null;
  if (isSupabaseConfigured()) {
    user = await getCurrentUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) return Response.json({ error: "no database" }, { status: 503 });
  const db = await store.openPipelineDb();
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) return Response.json({ error: "no firm" }, { status: 403 });

    // Scoping is enforced inside setFlagStatus BEFORE any write: passing our
    // firm id means a mismatched flag is refused, not written-then-checked.
    const result = await store.setFlagStatus(db, {
      flag_id: body.flag_id,
      status: body.status,
      updated_by: user?.email ?? "pilot",
      firm_id: firm.id,
    });
    if (!result) return Response.json({ error: "not found" }, { status: 404 });
    if (result.forbidden) return Response.json({ error: "forbidden" }, { status: 403 });
    return Response.json({ ok: true, status: body.status });
  } finally {
    await store.closePipelineDb(db);
  }
}
