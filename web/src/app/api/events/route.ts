// POST /api/events — the ONLY client-reachable door into the first-party
// event log, and it is deliberately tiny: an authenticated session may report
// `sign_in` (the password flow signs in browser→Supabase directly, so no
// server code sees it happen — the login page calls here right after).
// Everything else is recorded server-side at its own call site; a client can
// never write arbitrary rows into the log.
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { recordEventOn } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  event: z.literal("sign_in"),
  method: z.enum(["password", "magic_link"]).optional(),
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

  const store = await import("../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured() && process.env.NODE_ENV === "production") {
    return Response.json({ ok: true }); // nothing to write to — still a 200, logging is best-effort
  }
  try {
    const db = await store.openPipelineDb();
    try {
      const firm = await resolveDeskFirm(db, store.listFirms).catch(() => null);
      await recordEventOn(db, {
        event: body.event,
        firmId: firm?.id ?? null,
        actor: user?.email ?? "pilot",
        context: { method: body.method ?? "password" },
      });
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    /* best-effort — a lost event must never surface as a login error */
  }
  return Response.json({ ok: true });
}
