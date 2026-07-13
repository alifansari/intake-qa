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

// Founder ping on a new demo lead. This is an INTERNAL ops notification to Ali,
// not a message to a prospect, so — like the beta-apply notifier — it is
// deliberately NOT behind TEST_MODE / KILL_SWITCH (those gate outbound PRODUCT
// sends to prospects/firms). Best-effort: the demo_leads table + the /studio
// console remain the source of truth, so a mailer hiccup never loses the lead.
// Silently no-ops if the Resend env vars are unset.
async function notifyFounder(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.FOUNDER_EMAIL;
  if (!apiKey || !from || !to) return;
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({ from, to, subject, text });
}

const Body = z.object({
  email: z.string().email(),
  demoCallId: z.string().optional(),
  // The unguessable poll token, used to build the "view your result" deep-link
  // (/demo?t=…). The legacy ?id= link no longer resolves.
  resume_token: z.string().min(1).max(128).nullish(),
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
  const { email, demoCallId, resume_token, session_token, monthly_call_volume } = parsed.data;

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

  // Internal ops ping so a demo lead never sits unseen. Best-effort and never
  // blocks the capture; not TEST_MODE-gated (see notifyFounder above).
  try {
    const base = process.env.PUBLIC_BASE_URL ?? "";
    const domain = email.split("@")[1] ?? "";
    const resultLink = resume_token
      ? `${base}/demo?t=${encodeURIComponent(resume_token)}`
      : "(no result link)";
    const volume = monthly_call_volume ? `${monthly_call_volume}/mo calls` : "volume not given";
    await notifyFounder(
      `New demo lead: ${email}`,
      `A prospect just ran the demo and left an email.\n\n` +
        `Email: ${email}\n` +
        `Domain: ${domain}\n` +
        `Monthly volume: ${volume}\n` +
        `Their result: ${resultLink}\n\n` +
        `Review leads and hot audits: ${base}/studio`,
    );
  } catch {
    // Never fail the capture on a founder-ping error.
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
      // Deep-link by the unguessable poll token (?t=…); the old ?id= no longer
      // resolves. If we somehow have no token, omit the link rather than send a
      // dead one.
      const link = resume_token
        ? `<p><a href="${base}/demo?t=${encodeURIComponent(resume_token)}">View your call score</a></p>`
        : "";
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Intake QA <onboarding@resend.dev>",
        to: email,
        subject: "Your Intake QA call score",
        html: `<p>Thanks for trying Intake QA. Your demo report:</p>
               ${link}
               <p style="color:#6b6b6b;font-size:12px">Demo estimates. Not legal advice.</p>`,
      });
    } catch {
      // Never fail the capture on a mailer error.
    }
  }

  return Response.json({ ok: true, transmitted: Boolean(key) && !isTestMode() });
}
