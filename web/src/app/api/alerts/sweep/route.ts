// One founder-alert sweep — the "you cannot run a beta blind" cron.
// Callable two ways (same auth convention as /api/digest/run):
//   * Vercel Cron, authorized by `Authorization: Bearer ${CRON_SECRET}` (GET)
//   * the founder, signed in (a manual "sweep now" from /studio/beta)
//
// Each pass batches every trigger since the last watermark into AT MOST one
// alert email — (a) failed scoring, (b) 3+ CallRail signature failures in an
// hour for a firm, (c) digest runs that skipped/failed, (d) new beta
// applications, (e) calls received but never scored past the staleness
// threshold (the Inngest-outage safety net) — plus, once per day in the 8am
// America/Los_Angeles hour, the one-line beta pulse. Never a spam stream: one
// email per trigger window.
//
// Delivery is fully gated inside sendFounderEmail: KILL_SWITCH engaged,
// EMAIL_ENABLED off (the default), or no Resend key → render to an HTML file
// in output/, transmit NOTHING. Recipient is FOUNDER_EMAIL only — this is an
// internal founder-directed alert, never a firm-facing message.
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { bearerMatches } from "@/lib/http/bearer";
import { runAlertSweep as runAlertSweepUntyped } from "../../../../../messaging/founder-alerts.mjs";

const runAlertSweep = runAlertSweepUntyped as unknown as (opts: {
  store: unknown;
  db: unknown;
  env: NodeJS.ProcessEnv;
}) => Promise<{ alert: unknown; pulse: unknown; examined: number }>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Store = typeof import("../../../../../ingest/store.mjs");

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (bearerMatches(header, secret)) return true;
  if (!isSupabaseConfigured()) return true; // local pilot, nothing to protect
  const user = await getCurrentUser();
  const founder = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  return Boolean(founder && user?.email?.trim().toLowerCase() === founder);
}

// Best-effort errors-table write for the fail-loud branch (a logging failure
// must never mask the response). Mirrors digest/run's logRun.
async function logSweep(store: Store, message: string, context: unknown): Promise<void> {
  try {
    if (!store.pipelineDbConfigured()) return;
    const db = await store.openPipelineDb();
    try {
      await store.logError(db, { source: "alerts.sweep", message, context });
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    /* best-effort */
  }
}

async function run(req: Request) {
  const store = (await import("../../../../../ingest/store.mjs")) as Store;

  if (!(await authorized(req))) {
    // Same silent-death mode digest/run guards: a hosted (Supabase-configured)
    // deploy with no CRON_SECRET means the Vercel sweep cron can never
    // authenticate, so NO founder alert ever fires — the beta runs blind. Fail
    // loud with an errors-table row naming the missing var, exactly as
    // digest/run does; keep the local-pilot bypass + wrong-secret 401 intact.
    if (!process.env.CRON_SECRET && isSupabaseConfigured()) {
      const message =
        "CRON_SECRET is not set — the Vercel alerts-sweep cron cannot authenticate and founder alerts will NEVER fire until it is added to the environment.";
      await logSweep(store, message, { fix: "Set CRON_SECRET in Vercel env (any long random string) and redeploy." });
      return Response.json({ error: message }, { status: 500 });
    }
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!store.pipelineDbConfigured() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "no database" }, { status: 503 });
  }
  const db = await store.openPipelineDb();
  try {
    const result = await runAlertSweep({ store, db, env: process.env });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    // The sweep is monitoring — it must never crash-loop the cron. Log and 200.
    try {
      await store.logError(db, {
        source: "alerts.sweep",
        message: e instanceof Error ? e.message : "sweep failed",
      });
    } catch {
      /* best-effort */
    }
    return Response.json({ ok: false, error: "sweep failed" });
  } finally {
    await store.closePipelineDb(db);
  }
}

export async function POST(req: Request) {
  return run(req);
}

// Vercel Cron invokes with GET.
export async function GET(req: Request) {
  return run(req);
}
