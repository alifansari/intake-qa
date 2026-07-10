// Operator feature-flag toggle endpoint. Thin by design: auth + validate (via
// the tested admin/features-admin.mjs helper) + write through the pipeline
// facade. Never touches db.mjs / db-postgres.mjs directly (ground rule 0.1).
//
// Auth: when Supabase is configured (production) a signed-in operator is
// required; when it is not configured (local/pilot) the admin area is open,
// matching the read-only /admin/status page.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { validateFeatureToggle } from "../../../../../admin/features-admin.mjs";
import * as store from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!user || !founderEmail || user.email?.trim().toLowerCase() !== founderEmail) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const v = validateFeatureToggle(json) as
    | { ok: true; value: { firmId: number | string; feature: string; enabled: boolean } }
    | { ok: false; status: number; error: string };
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: v.status });
  }

  if (!store.pipelineDbConfigured()) {
    return NextResponse.json(
      { error: "database not configured" },
      { status: 503 },
    );
  }

  const db = await store.openPipelineDb();
  try {
    await store.setFirmFeature(db, v.value.firmId, v.value.feature, v.value.enabled);
    const features = await store.getFirmFeatures(db, v.value.firmId);
    return NextResponse.json({ ok: true, firm_id: v.value.firmId, features });
  } finally {
    await store.closePipelineDb(db);
  }
}
