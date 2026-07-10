// POST /api/crm/run — founder-only. Exercises the CRM handoff pipeline
// against the MOCK connector (the only one that exists; real CRMs are gated).
// Actions:
//   { action: "enqueue" }                 → enqueue completed book/escalate
//                                           leads to provider 'mock'
//   { action: "process" }                 → one worker pass (duplicate check,
//                                           review hold, write, retry)
//   { action: "approve", id, by }         → named approval of a review item
// The mock's memory is per-process; this route exists to demonstrate and
// verify the contract, not to move real data.
import { z } from "zod";
import { Pool } from "pg";
import { requireFounderRoute } from "@/lib/studio/guard";
import {
  enqueueHandoff,
  processQueue,
  approveHandoff,
  isCrmQueueConfigured,
} from "@/lib/crm/worker";
import { createMockCrm } from "@/lib/crm/mock.mjs";

export const runtime = "nodejs";

// One mock CRM per server process — keeps created leads across calls so
// duplicate flagging is demonstrable.
const globalMock = globalThis as unknown as { __mockCrm?: ReturnType<typeof createMockCrm> };
function mockCrm() {
  if (!globalMock.__mockCrm) globalMock.__mockCrm = createMockCrm();
  return globalMock.__mockCrm;
}

const Body = z.object({
  action: z.enum(["enqueue", "process", "approve"]),
  id: z.string().uuid().optional(),
  by: z.string().max(120).optional(),
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
  if (!isCrmQueueConfigured()) return Response.json({ configured: false });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    if (body.action === "enqueue") {
      const leads = await pool().query(
        `select id, matter_type, bucket, confidence, contact, incident, path_data,
                routing, consent_version, consent_at
         from intake_leads
         where status = 'complete' and bucket in ('book','escalate') limit 20`,
      );
      let enqueued = 0;
      for (const l of leads.rows) {
        const r = await enqueueHandoff({
          leadId: l.id,
          provider: "mock",
          record: l as Record<string, unknown>,
        });
        if (r.enqueued) enqueued++;
      }
      return Response.json({ enqueued, considered: leads.rows.length });
    }
    if (body.action === "approve") {
      if (!body.id || !body.by) return Response.json({ error: "id and by required" }, { status: 400 });
      await approveHandoff(body.id, body.by);
      return Response.json({ approved: body.id, by: body.by });
    }
    const result = await processQueue(mockCrm());
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "crm run failed" },
      { status: 500 },
    );
  }
}
