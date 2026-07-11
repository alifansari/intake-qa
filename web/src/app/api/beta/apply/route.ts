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
import { defaultNdaClient } from "../../../../../beta/dropbox-sign-nda.mjs";
import { openPipelineDb, closePipelineDb, logError } from "../../../../../ingest/store.mjs";
import { rateLimited } from "@/lib/intake/rate-limit";

export const runtime = "nodejs";

// Founder ping on a new application. This is an INTERNAL ops notification to
// Ali, not a message to a firm or a lead, so it is deliberately not behind
// TEST_MODE / KILL_SWITCH (those gate outbound product sends). Best-effort:
// the studio "Applications waiting on you" tile remains the source of truth.
async function notifyFounder(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.FOUNDER_EMAIL;
  if (!apiKey || !from || !to) return;
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({ from, to, subject, text });
}

export async function POST(req: Request) {
  if (rateLimited(req)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

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
      // NDA is the hard gate before any data access. When Dropbox Sign is
      // configured AND TEST_MODE is off, inject the real client (which itself
      // stays in sandbox until DROPBOX_SIGN_LIVE=true); otherwise the send is
      // simulated and the founder emails the NDA by hand.
      const liveDropbox =
        process.env.TEST_MODE === "false" &&
        Boolean(process.env.DROPBOX_SIGN_API_KEY) &&
        Boolean(process.env.DROPBOX_SIGN_NDA_TEMPLATE_ID);
      const dropboxSign = liveDropbox ? defaultNdaClient({ env: process.env }) : null;
      nda = await sendNdaRequest({ db, applicantId: result.applicantId, dropboxSign }).catch(async (err) => {
        await logError(db, {
          source: "beta_apply",
          message: `NDA send failed: ${String((err as Error)?.message ?? err)}`,
          context: JSON.stringify({ applicantId: result.applicantId }),
        }).catch(() => {});
        return null;
      });
    }

    // Ping the founder so an application never sits unseen until the next
    // /studio visit (the tile is the fallback, not the only signal).
    const firmName = typeof body.firm_name === "string" ? body.firm_name : "unknown firm";
    notifyFounder(
      `New beta application: ${firmName}`,
      `Status: ${result.status}\nApplicant: ${String(body.name ?? "?")} <${String(body.email ?? "?")}>\nFirm: ${firmName}\nReview and onboard: /studio`,
    ).catch(() => {});

    // True only when the NDA actually went out through Dropbox Sign. In
    // TEST_MODE (or with no API key) the send is simulated and the founder
    // emails the NDA manually — the copy must say so (never claim a send
    // that didn't happen).
    const ndaSent = Boolean(nda && !nda.simulated);

    return NextResponse.json({
      ok: true,
      applicantId: result.applicantId,
      status: result.status,
      // Plain-language next step for the applicant-facing UI — truthful in
      // both modes.
      next:
        result.status === "nda_pending"
          ? ndaSent
            ? "Check your email for the NDA. Nothing connects until it is signed."
            : "You're in the queue — we'll email your NDA within one business day. Nothing connects until it is signed."
          : "You're on the waitlist for your practice area. The current beta is California personal-injury firms only.",
      ndaSent,
      nda: nda ? { sent: true, simulated: Boolean(nda.simulated) } : null,
    });
  } finally {
    await closePipelineDb(db);
  }
}
