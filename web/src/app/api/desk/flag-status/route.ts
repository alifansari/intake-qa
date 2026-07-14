// POST /api/desk/flag-status — persist a missed-case workflow status click.
// Signed-in + firm-scoped: the flag must belong to the caller’s own firm
// (resolveDeskFirm), so no firm can touch another’s queue. The write is a
// sibling upsert; the frozen flags row is never mutated.
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { recordEventOn } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({
  flag_id: z.union([z.string().min(1).max(64), z.number().int()]),
  status: z.enum(["needs_callback", "reached_out", "back_in_touch", "signed", "didnt_sign", "bad_number"]),
  // Per-agent callback ownership (optional; additive). "me" claims for the caller,
  // an explicit id assigns to that user, null unassigns, omitted leaves it as-is.
  assignee_user_id: z.union([z.literal("me"), z.string().min(1).max(64), z.null()]).optional(),
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

    // Per-agent identity + assignment (migration 0044 pg / 0036 sqlite columns). setFlagStatus
    // already verified firm ownership AND upserted the flag_status row, so this
    // sibling write is guaranteed to target a row inside the caller's own firm —
    // no cross-firm leak. Attribution (who acted) always records; assignment only
    // when the client asked. Best-effort: a missing-column DB (pre-migration) must
    // not fail the status click, which already succeeded.
    const actorId = user?.id ?? null;
    const wantsAssign = Object.prototype.hasOwnProperty.call(body, "assignee_user_id");
    const assigneeId =
      body.assignee_user_id === "me" ? actorId : (body.assignee_user_id ?? null);
    try {
      if (typeof db.query === "function") {
        // Postgres: positional params.
        const params: unknown[] = [actorId];
        let clause = "updated_by_user_id = $2";
        if (wantsAssign) {
          params.push(assigneeId);
          clause += ", assignee_user_id = $3";
        }
        await db.query(`update flag_status set ${clause} where flag_id = $1`, [body.flag_id, ...params]);
      } else if (typeof db.prepare === "function") {
        // SQLite.
        if (wantsAssign) {
          db.prepare("update flag_status set updated_by_user_id = ?, assignee_user_id = ? where flag_id = ?").run(
            actorId,
            assigneeId,
            body.flag_id,
          );
        } else {
          db.prepare("update flag_status set updated_by_user_id = ? where flag_id = ?").run(actorId, body.flag_id);
        }
      }
    } catch {
      // pre-migration column absence — attribution/assignment simply no-ops.
    }
    // First-party event log: a callback-shaped status (worked the case) is what
    // the 48h activation clock on /studio/beta counts. needs_callback/bad_number
    // are bookkeeping, not callback work — they don’t count.
    if (["reached_out", "back_in_touch", "signed", "didnt_sign"].includes(body.status)) {
      await recordEventOn(db, {
        event: "callback_marked",
        firmId: firm.id,
        actor: user?.email ?? "pilot",
        context: { flagId: String(body.flag_id), status: body.status, via: "desk" },
      });
    }
    // attempts rides back so the card’s encouragement line (B-011) can update
    // without a reload. It is the coordinator’s own tally, never a score.
    return Response.json({ ok: true, status: body.status, attempts: result.attempts ?? 0 });
  } finally {
    await store.closePipelineDb(db);
  }
}
