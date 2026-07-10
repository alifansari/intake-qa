// POST /api/escalations/action — founder-only. Ack / action / resolve an
// escalation. Ack and resolve are NAMED actions (Phase 4: "Ack = deliberate
// action only", "Claim = named ownership") — the name is required, recorded
// on the row, and appended to the event trail. Transitions are validated by
// the single authority in oncall/engine.mjs.
import { z } from "zod";
import { Pool } from "pg";
import { requireFounderRoute } from "@/lib/studio/guard";
import { validTransition } from "@/lib/oncall/engine.mjs";
import {
  ackEscalation,
  resolveEscalation,
  setEscalationStatus,
  appendEscalationEvent,
} from "@/lib/escalation/store";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid(),
  action: z.enum(["ack", "actioned", "resolve"]),
  by: z.string().min(1).max(120),
  note: z.string().max(2000).optional(),
});

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
  }
  return _pool;
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  if (!process.env.DATABASE_URL) return Response.json({ configured: false });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const r = await pool().query(`select status from escalations where id = $1`, [body.id]);
  if (!r.rows.length) return Response.json({ error: "not found" }, { status: 404 });
  const from = r.rows[0].status as string;
  const to = body.action === "ack" ? "acked" : body.action === "actioned" ? "actioned" : "resolved";
  if (!validTransition(from, to)) {
    return Response.json(
      { error: `invalid transition ${from} → ${to}` },
      { status: 409 },
    );
  }

  try {
    if (to === "acked") await ackEscalation(body.id, body.by);
    else if (to === "resolved") await resolveEscalation(body.id, body.by, body.note);
    else {
      await setEscalationStatus(body.id, "actioned");
      await appendEscalationEvent(body.id, "actioned", body.note ? { note: body.note } : {}, body.by);
    }
    return Response.json({ ok: true, status: to });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "action failed" },
      { status: 500 },
    );
  }
}
