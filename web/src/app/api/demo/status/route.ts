// GET /api/demo/status?id=... — poll a demo call's processing state + result.
// Public (no-auth) but returns ONLY demo data (never firm data). Node runtime.

import { openPipelineDb, closePipelineDb, getDemoCall } from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  const db = await openPipelineDb();
  try {
    const row = await getDemoCall(db, id);
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    let result = null;
    if (row.result_json) {
      try { result = JSON.parse(row.result_json); } catch { result = null; }
    }
    return Response.json({
      id: String(row.id),
      status: row.status,
      error: row.error ?? null,
      audioDeleted: row.audio_deleted === 1 || row.audio_deleted === true,
      result,
    });
  } finally {
    await closePipelineDb(db);
  }
}
