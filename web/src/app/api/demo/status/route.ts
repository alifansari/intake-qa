// GET /api/demo/status?token=... — poll a demo call's processing state + result.
// Public (no-auth). The result contains the uploader's OWN callers' names and
// callback numbers, so the handle is an unguessable per-row token, never the
// sequential integer id (which any visitor could enumerate to harvest PII).
// The legacy ?id= parameter is intentionally NOT honored.

import { openPipelineDb, closePipelineDb, getDemoCallByToken } from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.json({ error: "missing token" }, { status: 400 });

  const db = await openPipelineDb();
  try {
    const row = await getDemoCallByToken(db, token);
    if (!row) return Response.json({ error: "not found" }, { status: 404 });
    let result = null;
    if (row.result_json) {
      try { result = JSON.parse(row.result_json); } catch { result = null; }
    }
    return Response.json({
      id: String(row.id),
      // Echo the caller's own poll token so the client can build a resume
      // deep-link (/demo?t=…) — e.g. the emailed "view your result" link.
      token: token,
      status: row.status,
      error: row.error ?? null,
      audioDeleted: row.audio_deleted === 1 || row.audio_deleted === true,
      result,
    });
  } finally {
    await closePipelineDb(db);
  }
}
