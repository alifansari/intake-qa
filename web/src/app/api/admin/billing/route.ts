// Operator billing actions endpoint. Thin: auth + validate (tested helper) +
// facade / closePeriod orchestrator. Never imports db.mjs directly (rule 0.1).
// Auth mirrors /api/admin/features (open when Supabase unconfigured; else require
// a signed-in operator).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { validateBillingAction } from "../../../../../admin/billing-admin.mjs";
import * as store from "../../../../../ingest/store.mjs";
import { closePeriod } from "../../../../../billing/invoice.mjs";

export const runtime = "nodejs";

type Validated =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!user || !founderEmail || user.email?.trim().toLowerCase() !== founderEmail) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const v = validateBillingAction(json) as Validated;
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

  if (!store.pipelineDbConfigured()) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  const body = v.value;
  const db = await store.openPipelineDb();
  try {
    switch (body.action) {
      case "close_period": {
        const res = await closePeriod({
          db,
          firmId: body.firm_id,
          period: body.period as string,
        });
        return NextResponse.json({ ok: true, result: res });
      }
      case "dispute_event": {
        await store.setBillableEventStatus(db, body.event_id, "disputed", {
          dispute_reason: (body.reason as string) ?? "operator dispute",
        });
        return NextResponse.json({ ok: true });
      }
      case "resolve_event": {
        await store.setBillableEventStatus(db, body.event_id, "accrued", {});
        return NextResponse.json({ ok: true });
      }
      case "void_event": {
        await store.setBillableEventStatus(db, body.event_id, "voided", {});
        return NextResponse.json({ ok: true });
      }
      case "void_invoice": {
        await store.voidInvoice(db, body.invoice_id, (body.reason as string) ?? "operator void");
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 422 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "billing action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}
