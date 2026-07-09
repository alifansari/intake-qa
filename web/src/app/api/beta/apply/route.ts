// POST /api/beta/apply — self-serve beta application (module 0a + 0b entry).
//
// Public by design (an applicant has no account yet). Thin: validate + qualify
// via the tested beta/applicants.mjs helpers, then start the NDA flow for
// qualified applicants (simulated in TEST_MODE). Non-ICP applicants land on
// the tagged waitlist and are told so plainly. No call data is touched here —
// data access begins only after the NDA is signed (invariant f).

import { NextResponse } from "next/server";
import { applyToBeta } from "../../../../../beta/applicants.mjs";
import { sendNdaRequest } from "../../../../../beta/nda.mjs";
import { openPipelineDb, closePipelineDb, logError } from "../../../../../ingest/store.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const db = await openPipelineDb();
  try {
    const result = await applyToBeta({ db, application: body });
    if ("errors" in result && result.errors) {
      return NextResponse.json({ error: "invalid application", details: result.errors }, { status: 400 });
    }

    let nda: { signatureRequestId?: string; simulated?: boolean } | null = null;
    if (result.status === "nda_pending") {
      // NDA is the hard gate before any data access. TEST_MODE simulates the
      // Dropbox Sign send so the funnel works end-to-end pre-launch.
      nda = await sendNdaRequest({ db, applicantId: result.applicantId }).catch(async (err) => {
        await logError(db, {
          source: "beta_apply",
          message: `NDA send failed: ${String((err as Error)?.message ?? err)}`,
          context: JSON.stringify({ applicantId: result.applicantId }),
        }).catch(() => {});
        return null;
      });
    }

    return NextResponse.json({
      ok: true,
      applicantId: result.applicantId,
      status: result.status,
      // Plain-language next step for the applicant-facing UI.
      next:
        result.status === "nda_pending"
          ? "Check your email for the NDA. Nothing connects until it is signed."
          : "You're on the waitlist for your practice area. The current beta is California personal-injury firms only.",
      nda: nda ? { sent: true, simulated: Boolean(nda.simulated) } : null,
    });
  } finally {
    await closePipelineDb(db);
  }
}
