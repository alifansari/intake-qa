// TEMPORARY email diagnostic — remove after use.
// Secret-gated (?key=). GET reports whether the Resend env is live in prod
// (booleans + non-secret shape only). ?send=1 attempts one real send to
// FOUNDER_EMAIL and returns the EXACT Resend error so we can see key-vs-domain.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAG_TOKEN = "b736f87fb96a2865997f8142";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== DIAG_TOKEN) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const key = process.env.RESEND_API_KEY ?? "";
  const from = process.env.RESEND_FROM ?? "";
  const to = process.env.FOUNDER_EMAIL ?? "";
  const report = {
    resendKeyPresent: Boolean(key),
    resendKeyPrefix: key ? key.slice(0, 3) : null,
    resendKeyLength: key.length,
    resendFrom: from || null,
    founderEmailPresent: Boolean(to),
    founderEmail: to || null,
    emailEnabled: process.env.EMAIL_ENABLED ?? null,
    killSwitch: process.env.KILL_SWITCH ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  if (url.searchParams.get("send") !== "1") {
    return Response.json({ mode: "report", report });
  }

  // Attempt one real send and surface the exact outcome.
  if (!key) return Response.json({ mode: "send", report, sent: false, error: "RESEND_API_KEY is empty in this runtime" });
  if (!from) return Response.json({ mode: "send", report, sent: false, error: "RESEND_FROM is empty in this runtime" });
  if (!to) return Response.json({ mode: "send", report, sent: false, error: "FOUNDER_EMAIL is empty in this runtime" });
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const res = await resend.emails.send({
      from,
      to,
      subject: "Intake QA email diagnostic",
      html: "<p>If you can read this, Resend is wired correctly in production.</p>",
    });
    return Response.json({ mode: "send", report, sent: !res.error, resend: res });
  } catch (e) {
    return Response.json({ mode: "send", report, sent: false, error: e instanceof Error ? e.message : String(e) });
  }
}
