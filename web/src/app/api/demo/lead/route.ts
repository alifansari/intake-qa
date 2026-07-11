// POST /api/demo/lead — lead-gen capture ("email me this report").
// Stores { email, demoCallId } in demo_leads. Emails the report link via Resend
// only when a key is configured AND TEST_MODE is off; otherwise it just logs the
// capture (CLAUDE.md guardrail f: nothing transmitted in TEST_MODE). Node runtime.

import { z } from "zod";
import { openPipelineDb, closePipelineDb, createDemoLead } from "../../../../../ingest/store.mjs";
import { saveAuditContact } from "../../../../../ingest/audit.mjs";
import { isTestMode } from "../../../../../messaging/compliance.mjs";
import { rateLimited } from "@/lib/intake/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  demoCallId: z.string().optional(),
  // Intake Quality Audit report capture: attach the email (+ any supplied volume) to the
  // audit session so the operator console can follow up on hot audits.
  session_token: z.string().min(1).max(128).optional(),
  monthly_call_volume: z.number().int().positive().max(100000).optional(),
});

export async function POST(req: Request) {
  if (rateLimited(req)) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "enter a valid email address" }, { status: 422 });
  }
  const { email, demoCallId, session_token, monthly_call_volume } = parsed.data;

  const db = await openPipelineDb();
  try {
    await createDemoLead(db, { demo_call_id: demoCallId ?? null, email });
    if (session_token) {
      await saveAuditContact({
        db,
        token: session_token,
        email,
        monthlyCallVolume: monthly_call_volume,
      }).catch(() => {}); // never fail the capture on a session-write error
    }
  } finally {
    await closePipelineDb(db);
  }

  // Transmit only when explicitly configured and NOT in TEST_MODE.
  const key = process.env.RESEND_API_KEY;
  if (key && !isTestMode()) {
    try {
      // Computed specifier so Turbopack doesn't try to bundle the optional
      // `resend` dep at build time (installed only before live email is enabled).
      const mod = "resend";
      const { Resend } = await import(mod);
      const resend = new Resend(key);
      const base = process.env.PUBLIC_BASE_URL ?? "";
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Intake QA <onboarding@resend.dev>",
        to: email,
        subject: "Your Intake QA call score",
        html: `<p>Thanks for trying Intake QA. Your demo report:</p>
               <p><a href="${base}/demo?id=${demoCallId ?? ""}">View your call score</a></p>
               <p style="color:#6b6b6b;font-size:12px">Demo estimates. Not legal advice.</p>`,
      });
    } catch {
      // Never fail the capture on a mailer error.
    }
  }

  return Response.json({ ok: true, transmitted: Boolean(key) && !isTestMode() });
}
