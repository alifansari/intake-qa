import "server-only";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// ---------------------------------------------------------------------------
// Which firm does the signed-in user see? THE simplicity rule of the desk:
// you see your firm’s data, full stop.
//
// Resolution order:
//   1. firm_members mapping for the signed-in user (the real answer)
//   2. fallback: the demo firm (name contains "DEMO"), then the first firm —
//      preserves the founder/pilot behavior when no membership exists yet.
//
// Works on the shared pipeline handle (pg or sqlite): firm_members only
// exists on Postgres, so the sqlite path quietly falls through to the demo
// fallback (exactly the pilot behavior).
// ---------------------------------------------------------------------------

export interface DeskFirm {
  id: string | number;
  name: string;
  source: "membership" | "fallback";
}

type PipelineDb = { query?: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export async function resolveDeskFirm(
  db: PipelineDb,
  listFirms: (db: unknown) => Promise<Array<{ id: string | number; name?: string }>>,
): Promise<DeskFirm | null> {
  // 1) Membership (pg only).
  if (typeof db.query === "function") {
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        const r = await db.query(
          `select f.id, f.name from firm_members m join firms f on f.id = m.firm_id
           where m.user_id = $1 limit 1`,
          [user.id],
        );
        const row = r.rows[0];
        if (row) return { id: row.id as string, name: String(row.name ?? "Your firm"), source: "membership" };
      }
    } catch {
      // membership tables absent/unreadable — do NOT fall through to another
      // firm’s data when real auth is in play (see the hard rule below).
      if (isSupabaseConfigured()) return null;
    }

    // Signed-in but no membership row, on a real (Supabase-configured) deploy:
    // NEVER bind them to firms[0] — that would show a stranger, or a firm whose
    // onboarding half-failed, another firm’s callers and phone numbers. Only a
    // firm explicitly named DEMO is a safe fallback (founder demo/seed data);
    // otherwise there is no firm for this user.
    if (isSupabaseConfigured()) {
      const firms = await listFirms(db);
      const demo = firms.find((f) => (f.name ?? "").includes("DEMO"));
      return demo ? { id: demo.id, name: String(demo.name ?? "Firm"), source: "fallback" } : null;
    }
  }

  // 2) Local/pilot fallback (no Supabase auth): demo firm, then first firm.
  const firms = await listFirms(db);
  const firm = firms.find((f) => (f.name ?? "").includes("DEMO")) ?? firms[0];
  return firm ? { id: firm.id, name: String(firm.name ?? "Firm"), source: "fallback" } : null;
}

// ---------------------------------------------------------------------------
// Route-handler guard: the desk API pattern from /api/desk/flag-status, in one
// place. When Supabase auth is configured the caller MUST be signed in; the
// firm is then resolved with the same rules as every desk page. Returns either
// { response } (send it back verbatim) or { user, firm }.
// ---------------------------------------------------------------------------

export async function requireDeskFirm(
  db: PipelineDb,
  listFirms: (db: unknown) => Promise<Array<{ id: string | number; name?: string }>>,
): Promise<
  | { response: Response; user?: undefined; firm?: undefined }
  | { response?: undefined; user: { id?: string; email?: string | null } | null; firm: DeskFirm }
> {
  let user: { id?: string; email?: string | null } | null = null;
  if (isSupabaseConfigured()) {
    user = await getCurrentUser();
    if (!user) {
      return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };
    }
  }
  const firm = await resolveDeskFirm(db, listFirms);
  if (!firm) {
    return { response: Response.json({ error: "no firm on this account" }, { status: 403 }) };
  }
  return { user, firm };
}
