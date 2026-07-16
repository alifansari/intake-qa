// /api/desk/alert-recipients — who this firm's missed-call pager + daily digest
// reach.
//   GET  the firm's current list (plus the login-email fallback, for display)
//   PUT  save a normalized list; empty clears it (falls back to member emails)
//
// Signed-in + firm-scoped (requireDeskFirm) exactly like /api/desk/triage. The
// firm can only ever read/write ITS OWN row — the firm is resolved server-side,
// never taken from the request body.
//
// These are the firm's own staff addresses, not claimant data and not outreach:
// changing them re-points an internal product notification (§III unaffected).
import { z } from "zod";
import { requireDeskFirm } from "@/lib/desk/firm";
import {
  parseAlertRecipients,
  serializeAlertRecipients,
  MAX_ALERT_RECIPIENTS,
} from "../../../../../messaging/alert-recipients.mjs";

export const runtime = "nodejs";

const Body = z.object({
  // What a human types: comma / semicolon / space separated.
  emails: z.string().max(1000).optional().nullable(),
});

async function openScoped() {
  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured || !store.pipelineDbConfigured()) {
    return { store, db: null as unknown };
  }
  const db = await store.openPipelineDb();
  return { store, db };
}

export async function GET() {
  const { store, db } = await openScoped();
  if (!db) return Response.json({ emails: [], raw: "" });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm } = gate;
    const raw = (firm as { alert_emails?: string | null }).alert_emails ?? "";
    return Response.json({ emails: parseAlertRecipients(raw), raw: raw ?? "" });
  } finally {
    await store.closePipelineDb(db);
  }
}

export async function PUT(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseAlertRecipients(body.emails ?? "");
  const typedSomething = Boolean((body.emails ?? "").trim());
  // Typed something but nothing survived validation → tell them, don't silently
  // save nothing (a silent no-op is exactly what this control replaced).
  if (typedSomething && parsed.length === 0) {
    return Response.json(
      { error: "No valid email addresses. Separate multiple addresses with commas." },
      { status: 400 },
    );
  }
  if (parsed.length > MAX_ALERT_RECIPIENTS) {
    return Response.json(
      { error: `That's more than ${MAX_ALERT_RECIPIENTS} addresses. A pager everyone gets is a pager nobody answers.` },
      { status: 400 },
    );
  }

  const { store, db } = await openScoped();
  if (!db) return Response.json({ error: "no database" }, { status: 503 });
  try {
    const gate = await requireDeskFirm(db, store.listFirms);
    if (gate.response) return gate.response;
    const { firm } = gate;
    await store.setFirmAlertEmails(db, firm.id, serializeAlertRecipients(body.emails ?? ""));
    return Response.json({ ok: true, emails: parsed });
  } finally {
    await store.closePipelineDb(db);
  }
}
