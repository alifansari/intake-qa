// One digest pass over every firm — the digest-first desk's engine.
// Callable two ways:
//   * the founder, signed in (the "Send today's digests" button / manual run)
//   * Vercel Cron, authorized by `Authorization: Bearer ${CRON_SECRET}` (GET)
// Delivery is fully gated inside sendMissedDigest: KILL_SWITCH halts here AND
// inside the sender; email transmits only when EMAIL_ENABLED=true and a Resend
// key are set (otherwise it renders files and transmits nothing).
//
// FAIL-LOUD RULE: if CRON_SECRET is unset in a hosted deployment, the Vercel
// cron would silently 401 forever and firms would simply never get digests.
// That misconfiguration now returns 500 and writes an errors-table row naming
// the missing var, so it surfaces on /admin/status and in the operator alert
// email instead of dying quietly.
//
// OBSERVABILITY: every run writes one errors-table row (source "digest.run")
// whose context JSON carries the per-firm outcome (sent / skipped+reason /
// failed) — queryable in the DB and visible on /admin/status.
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

type Store = typeof import("../../../../../ingest/store.mjs");

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;
  if (!isSupabaseConfigured()) return true; // local pilot, nothing to protect
  const user = await getCurrentUser();
  const founder = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  return Boolean(founder && user?.email?.trim().toLowerCase() === founder);
}

// Best-effort errors-table write: a logging failure must never break the run
// (or mask the response we were about to return).
async function logRun(store: Store, message: string, context: unknown): Promise<void> {
  try {
    if (!store.pipelineDbConfigured()) return;
    const db = await store.openPipelineDb();
    try {
      await store.logError(db, { source: "digest.run", message, context });
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    /* best-effort */
  }
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
  const store = (await import("../../../../../ingest/store.mjs")) as Store;

  if (!(await authorized(req))) {
    // The one silent-death mode this route had: hosted deployment, no
    // CRON_SECRET, so the Vercel cron can never authenticate. Fail loud.
    if (!process.env.CRON_SECRET && isSupabaseConfigured()) {
      const message =
        "CRON_SECRET is not set — the Vercel digest cron cannot authenticate and daily digests will NEVER send until it is added to the environment.";
      await logRun(store, message, { fix: "Set CRON_SECRET in Vercel env (any long random string) and redeploy." });
      return Response.json({ error: message }, { status: 500 });
    }
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (killSwitchEngaged(process.env)) {
    await logRun(store, "digest run halted: KILL_SWITCH engaged", { halted: "KILL_SWITCH" });
    return Response.json({ halted: "KILL_SWITCH" }, { status: 200 });
  }
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

  // Per-firm outcome ledger for this run: sent / rendered-to-file / skipped /
  // failed, with reasons — one queryable row per pass.
  const counts = { live: 0, test: 0, skipped: 0, error: 0 } as Record<string, number>;
  for (const r of results) counts[String(r.mode)] = (counts[String(r.mode)] ?? 0) + 1;
  await logRun(
    store,
    `digest run: ${results.length} firm(s) — ${counts.live ?? 0} emailed, ${counts.test ?? 0} rendered-to-file, ${counts.skipped ?? 0} skipped, ${counts.error ?? 0} failed`,
    { results },
  );

  return Response.json({ ok: true, firms: results.length, results });
}

export async function POST(req: Request) {
  return run(req);
}

// Vercel Cron invokes with GET.
export async function GET(req: Request) {
  return run(req);
}
