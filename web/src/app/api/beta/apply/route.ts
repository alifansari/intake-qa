// POST /api/beta/apply — self-serve beta application (module 0a + 0b entry).
//
// Public by design (an applicant has no account yet). Thin: validate + qualify
// via the tested beta/applicants.mjs helpers, then start the NDA flow for
// qualified applicants (simulated in TEST_MODE). Non-ICP applicants land on
// the tagged waitlist and are told so plainly. No call data is touched here —
// data access begins only after the NDA is signed (invariant f).

import { NextResponse } from "next/server";
import { z } from "zod";
import { applyToBeta } from "../../../../../beta/applicants.mjs";
import { sendNdaRequest } from "../../../../../beta/nda.mjs";
import { defaultNdaClient } from "../../../../../beta/dropbox-sign-nda.mjs";
import { openPipelineDb, closePipelineDb, logError } from "../../../../../ingest/store.mjs";
import { rateLimited } from "@/lib/intake/rate-limit";

export const runtime = "nodejs";

// Zod at the boundary (repo rule): shape/type/range checks live here; the
// business qualification rules stay in beta/applicants.mjs (validateApplication
// + qualify). Unknown keys are stripped so nothing untyped rides into storage.
// records_calls and spanish_call_pct are the two truth-inputs the apply form
// now collects — without them, qualify() could only guess at recording status.
const ApplyBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  firm_name: z.string().trim().min(1).max(200),
  practice_area: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(40),
  role: z.string().trim().max(120).optional(),
  bar_number: z.string().trim().max(60).optional(),
  phone_system: z.string().trim().max(120).optional(),
  crm_system: z.string().trim().max(120).optional(),
  monthly_call_volume: z.coerce.number().int().min(0).max(1_000_000).optional(),
  // "Do you record intake calls?" — tri-state, plain-English values.
  records_calls: z.enum(["yes", "no", "not_sure"]).optional(),
  // Rough band midpoint from the form (0/10/25/50/75), any 0–100 accepted.
  spanish_call_pct: z.coerce.number().int().min(0).max(100).optional(),
});

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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = ApplyBody.safeParse(raw);
  if (!parsed.success) {
    // Same shape the form already handles: { error, details: [...] }.
    const details = parsed.error.issues.map(
      (i) => `invalid:${i.path.join(".") || "body"}`,
    );
    return NextResponse.json({ error: "invalid application", details }, { status: 400 });
  }
  const body = parsed.data;

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
