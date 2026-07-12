// POST /api/studio/send-welcome — founder-only, founder-CLICKED (§VII).
//
// The one path that emails a firm its welcome email. It exists so the founder
// can press one button instead of copy-pasting into a mail client — it is NOT
// an autonomous sender: no cron, webhook, or onboarding flow calls it; the only
// caller is the Send button in the studio onboarding success card, and the
// send is gated the same way as every other email in the system
// (KILL_SWITCH halts, EMAIL_ENABLED must be explicitly true, Resend key must
// exist). A gated non-send is reported honestly so the founder copies the
// email by hand instead of believing it went out.
//
// The body carries the full email text from the onboarding response (the only
// place the temp password exists — it is never stored readable, so the server
// could not re-render it). Founder-gated, so this is equivalent to the founder
// pasting the same text into their own mail client.
import { z } from "zod";
import { Pool } from "pg";
import { requireFounderRoute } from "@/lib/studio/guard";
import { sendWelcomeEmail as sendWelcomeEmailUntyped } from "../../../../../messaging/welcome-email.mjs";

const sendWelcomeEmail = sendWelcomeEmailUntyped as unknown as (opts: {
  to: string;
  subject: string;
  text: string;
}) => Promise<{ mode: "live" | "test" | "halted"; id?: string | null; reason?: string }>;

export const runtime = "nodejs";

const Body = z.object({
  firm_id: z.string().min(1).max(64),
  to: z.string().email().max(200),
  subject: z.string().min(1).max(300),
  text: z.string().min(20).max(20000),
});

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
  }
  return _pool;
}

// Best-effort: stamp the persisted (redacted) welcome-email row as sent. A
// missing table or row never turns a real send into an error.
async function stampSent(firmId: string, messageId: string | null): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool().query(
      `update welcome_emails set sent_at = now(), sent_message_id = $2
        where id = (select id from welcome_emails where firm_id = $1
                    order by created_at desc limit 1)`,
      [firmId, messageId],
    );
  } catch {
    /* best-effort */
  }
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const res = await sendWelcomeEmail({
    to: body.to.trim().toLowerCase(),
    subject: body.subject,
    text: body.text,
  }).catch((e: unknown) => ({
    mode: "error" as const,
    reason: e instanceof Error ? e.message : "send failed",
  }));

  if (res.mode === "live") {
    await stampSent(body.firm_id, ("id" in res ? res.id : null) ?? null);
    return Response.json({ sent: true, id: "id" in res ? res.id : null });
  }
  // Honest non-send: tell the founder exactly why nothing went out.
  const status = res.mode === "error" ? 502 : 409;
  return Response.json({ sent: false, mode: res.mode, reason: res.reason }, { status });
}
