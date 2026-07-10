// One digest pass over every firm — the digest-first desk's engine.
// Callable two ways:
//   * the founder, signed in (the "Send today's digests" button / manual run)
//   * Vercel Cron, authorized by `Authorization: Bearer ${CRON_SECRET}` (GET)
// Delivery is fully gated inside sendMissedDigest: KILL_SWITCH halts here,
// TEST_MODE (or no Resend key) renders files and transmits nothing.
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sendMissedDigest as sendMissedDigestUntyped } from "../../../../../messaging/missed-digest.mjs";

// The .mjs module carries no types; give the one call site an explicit shape.
const sendMissedDigest = sendMissedDigestUntyped as unknown as (opts: {
  store: unknown;
  db: unknown;
  firm: { id: string | number; name?: string };
  recipients: string[];
}) => Promise<{ mode: string; [k: string]: unknown }>;
import { killSwitchEngaged } from "../../../../../messaging/compliance.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;
  if (!isSupabaseConfigured()) return true; // local pilot, nothing to protect
  const user = await getCurrentUser();
  const founder = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  return Boolean(founder && user?.email?.trim().toLowerCase() === founder);
}

// Sign-in emails for a firm's members (pg only; sqlite pilot has no members).
async function memberEmails(db: unknown, firmId: string | number): Promise<string[]> {
  const q = (db as { query?: (sql: string, p: unknown[]) => Promise<{ rows: { email: string | null }[] }> }).query;
  if (typeof q !== "function") return [];
  try {
    const r = await q.call(db,
      `select u.email from firm_members m join auth.users u on u.id = m.user_id
       where m.firm_id = $1`,
      [firmId],
    );
    return r.rows.map((x) => x.email).filter((e): e is string => Boolean(e));
  } catch {
    return [];
  }
}

async function run(req: Request) {
  if (!(await authorized(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (killSwitchEngaged(process.env)) {
    return Response.json({ halted: "KILL_SWITCH" }, { status: 200 });
  }
  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return Response.json({ error: "no database" }, { status: 503 });
  }
  const db = await store.openPipelineDb();
  const results: Record<string, unknown>[] = [];
  try {
    const firms = await store.listFirms(db);
    for (const firm of firms ?? []) {
      try {
        const recipients = await memberEmails(db, firm.id);
        const res = await sendMissedDigest({ store, db, firm, recipients });
        results.push({ firm: firm.id, ...res });
      } catch (e) {
        // One broken firm never blocks the rest of the pass.
        results.push({ firm: firm.id, mode: "error", error: String(e) });
      }
    }
  } finally {
    await store.closePipelineDb(db);
  }
  return Response.json({ ok: true, firms: results.length, results });
}

export async function POST(req: Request) {
  return run(req);
}

// Vercel Cron invokes with GET.
export async function GET(req: Request) {
  return run(req);
}
