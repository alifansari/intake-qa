import "server-only";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveDeskFirm, type DeskFirm } from "@/lib/desk/firm";

// ---------------------------------------------------------------------------
// Multi-user roles for the firm desk. THREE roles, activated by migration 0044
// (postgres) / 0036 (sqlite) on the previously-dead firm_members.role column:
//
//   * agent   — works the callback queue + their own calls. No team dashboards
//               (scorecard) and no firm settings.
//   * manager — everything an agent sees PLUS the team dashboards.
//   * admin   — manager + firm settings/config; the firm owner.
//
// BACKWARD COMPAT (the important part): the legacy default 'operator' — and any
// unrecognized/absent value — normalizes to 'admin'. The single shared login
// that every firm used until now WAS the owner and saw everything, so we never
// downgrade an existing user. 'agent' is opt-in: it only appears once an admin
// explicitly adds a rank-and-file intake agent. This also means the pilot /
// sqlite path (no membership row) resolves to 'admin' and keeps the full desk —
// exactly the pre-roles behavior, no hard crash for single-user firms.
// ---------------------------------------------------------------------------

export type Role = "agent" | "manager" | "admin";

export function normalizeRole(raw: string | null | undefined): Role {
  if (raw === "agent" || raw === "manager" || raw === "admin") return raw;
  // legacy 'operator' + anything blank/unknown → admin (never lock anyone out).
  return "admin";
}

export function isManagerRole(role: Role): boolean {
  return role === "manager" || role === "admin";
}

export function isAdminRole(role: Role): boolean {
  return role === "admin";
}

type PipelineDb = {
  query?: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  prepare?: (sql: string) => { get: (...args: unknown[]) => Record<string, unknown> | undefined };
};

// Raw membership lookup on the shared pipeline handle (pg via .query, sqlite via
// .prepare). Returns the stored role string or null when there is no row / the
// table is absent (pilot). Never throws — a lookup failure must degrade to the
// backward-compatible default, not break the desk.
async function readMemberRole(
  db: PipelineDb,
  firmId: string | number,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  try {
    if (typeof db.query === "function") {
      const r = await db.query(
        `select role from firm_members where firm_id = $1 and user_id = $2 limit 1`,
        [firmId, userId],
      );
      return (r.rows[0]?.role as string | undefined) ?? null;
    }
    if (typeof db.prepare === "function") {
      const row = db.prepare(`select role from firm_members where firm_id = ? and user_id = ? limit 1`).get(firmId, userId);
      return (row?.role as string | undefined) ?? null;
    }
  } catch {
    // firm_members missing/unreadable (pilot, or pre-migration) — fall through.
  }
  return null;
}

// The signed-in user's role in a firm. `userId` optional: when omitted we read
// the current Supabase user. Defaults to 'admin' when unresolved (see header).
export async function getUserRole(
  db: PipelineDb,
  firmId: string | number,
  userId?: string | null,
): Promise<Role> {
  let uid = userId ?? null;
  if (uid === undefined || uid === null) {
    const user = isSupabaseConfigured() ? await getCurrentUser() : null;
    uid = user?.id ?? null;
  }
  return normalizeRole(await readMemberRole(db, firmId, uid));
}

export async function isManager(
  db: PipelineDb,
  firmId: string | number,
  userId?: string | null,
): Promise<boolean> {
  return isManagerRole(await getUserRole(db, firmId, userId));
}

export async function isAdmin(
  db: PipelineDb,
  firmId: string | number,
  userId?: string | null,
): Promise<boolean> {
  return isAdminRole(await getUserRole(db, firmId, userId));
}

// ---------------------------------------------------------------------------
// Convenience for chrome that has no db handle of its own (the desk layout):
// open the pipeline db, resolve the firm the same way every desk page does,
// read the current user + role, and clean up. Fully self-contained and
// crash-proof — any failure yields the graceful default (admin, no firm), so an
// existing single-user firm never hits an error page from role resolution.
// ---------------------------------------------------------------------------

export interface CurrentRole {
  role: Role;
  firm: DeskFirm | null;
  userId: string | null;
  email: string | null;
}

export async function resolveCurrentRole(): Promise<CurrentRole> {
  let user: { id?: string; email?: string | null } | null = null;
  if (isSupabaseConfigured()) user = await getCurrentUser();

  const store = await import("../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured() && isSupabaseConfigured()) {
    // Supabase auth but no DB configured — treat as owner, no firm resolvable.
    return { role: "admin", firm: null, userId: user?.id ?? null, email: user?.email ?? null };
  }
  let db: PipelineDb | undefined;
  try {
    const opened: PipelineDb = await store.openPipelineDb();
    db = opened;
    const firm = await resolveDeskFirm(opened as never, store.listFirms);
    if (!firm) return { role: "admin", firm: null, userId: user?.id ?? null, email: user?.email ?? null };
    const role = await getUserRole(opened, firm.id, user?.id ?? null);
    return { role, firm, userId: user?.id ?? null, email: user?.email ?? null };
  } catch {
    return { role: "admin", firm: null, userId: user?.id ?? null, email: user?.email ?? null };
  } finally {
    if (db) await store.closePipelineDb(db);
  }
}
