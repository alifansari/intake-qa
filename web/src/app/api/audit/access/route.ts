// Logs a view/download of a tokenized Intake Leak Report (Stage 5). The report is
// shareable by token (forward-to-partner by design), so we log distinct viewer
// fingerprints rather than gate behind a login. Best-effort — never blocks reading.
import { createHash } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token, event_type } = await req.json();
    if (!token || (event_type !== "view" && event_type !== "download")) {
      return Response.json({ error: "token and event_type (view|download) required" }, { status: 422 });
    }
    // Best-effort distinct-viewer fingerprint: hash of UA + language. No PII stored.
    const ua = req.headers.get("user-agent") ?? "";
    const lang = req.headers.get("accept-language") ?? "";
    const viewer_fingerprint = createHash("sha256").update(`${ua}|${lang}`).digest("hex").slice(0, 16);

    const store = await import("../../../../../ingest/store.mjs");
    const db = await store.openPipelineDb();
    try {
      await store.logReportAccess(db, { token, event_type, viewer_fingerprint });
    } finally {
      await store.closePipelineDb(db);
    }
    return Response.json({ ok: true });
  } catch {
    // Access logging must never break the reading experience.
    return Response.json({ ok: false }, { status: 200 });
  }
}
