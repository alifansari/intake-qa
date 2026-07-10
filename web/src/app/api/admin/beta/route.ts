// GET /api/admin/beta — founder view over the beta program (module 0c review
// side): per-tester status, tagged waitlist, and aggregated structured
// feedback. Same auth convention as the other admin routes.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { openPipelineDb, closePipelineDb } from "../../../../../ingest/store.mjs";
import { listBetaApplicants, listWaitlist } from "../../../../../beta/store.mjs";
import { feedbackSummary } from "../../../../../beta/feedback.mjs";

export const runtime = "nodejs";

export async function GET() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!user || !founderEmail || user.email?.trim().toLowerCase() !== founderEmail) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await openPipelineDb();
  try {
    const [applicants, waitlist, feedback] = await Promise.all([
      listBetaApplicants(db),
      listWaitlist(db),
      feedbackSummary({ db }),
    ]);
    return NextResponse.json({
      applicants,
      waitlist,
      feedback: feedback.aggregate,
      feedbackRows: feedback.rows,
    });
  } finally {
    await closePipelineDb(db);
  }
}
