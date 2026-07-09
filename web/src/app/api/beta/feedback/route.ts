// POST /api/beta/feedback — structured per-artifact feedback capture (module 0c).
//
// Auth follows the admin-route convention: when Supabase is configured a
// signed-in user is required (testers are firm members); when it is not
// configured (local/pilot) the endpoint is open. Validation lives in the
// tested beta/feedback.mjs helper.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { recordFeedback } from "../../../../../beta/feedback.mjs";
import { openPipelineDb, closePipelineDb } from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const result = await recordFeedback({ db, feedback: body });
    if ("errors" in result && result.errors) {
      return NextResponse.json({ error: "invalid feedback", details: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, feedbackId: result.feedbackId });
  } finally {
    await closePipelineDb(db);
  }
}
