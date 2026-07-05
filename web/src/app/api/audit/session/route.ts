// POST /api/audit/session — public, no-auth. Starts a Leak Audit session and
// returns a shareable token. Enforces one session per visitor fingerprint per
// 7 days (each session then holds up to 10 calls). Demo-isolated: this only
// creates an audit_sessions row and can never send anything.

import { z } from "zod";
import { createHash } from "node:crypto";
import { openPipelineDb, closePipelineDb } from "../../../../../ingest/store.mjs";
import { startAuditSession } from "../../../../../ingest/audit.mjs";
import type { StartSessionResult } from "@/lib/audit-types";

export const runtime = "nodejs";

const Body = z.object({
  monthly_call_volume: z.number().int().positive().max(100000).nullable().optional(),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function fingerprint(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${clientIp(req)}|${ua}`).digest("hex").slice(0, 32);
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json().catch(() => ({})));
  } catch {
    return Response.json({ error: "expected { monthly_call_volume? }" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const res = (await startAuditSession({
      db,
      fingerprint: fingerprint(req),
      monthlyCallVolume: parsed.monthly_call_volume ?? null,
    })) as StartSessionResult;
    if (!res.ok) {
      return Response.json(
        { error: "You've already run an audit recently — one per week.", reason: res.reason },
        { status: 429 },
      );
    }
    return Response.json({ token: res.token }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "could not start audit";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await closePipelineDb(db).catch(() => {});
  }
}
