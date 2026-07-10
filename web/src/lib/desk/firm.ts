import "server-only";
import { getCurrentUser } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Which firm does the signed-in user see? THE simplicity rule of the desk:
// you see your firm's data, full stop.
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
      // fall through — membership tables absent or unreadable
    }
  }

  // 2) Pilot fallback: demo firm, then first firm.
  const firms = await listFirms(db);
  const firm = firms.find((f) => (f.name ?? "").includes("DEMO")) ?? firms[0];
  return firm ? { id: firm.id, name: String(firm.name ?? "Firm"), source: "fallback" } : null;
}
