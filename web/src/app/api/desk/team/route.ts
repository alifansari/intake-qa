// /api/desk/team — in-product team / member management for the firm desk.
//
//   GET   — list THIS firm's members (email, role, joined, last activity).
//           Visible to manager + admin.
//   PATCH — change a member's role. ADMIN only.
//   POST  — add a teammate: create (or link) a Supabase auth user + a
//           firm_members row scoped to THIS firm, and return a one-time temp
//           password for the admin to pass along. ADMIN only.
//
// Every path (a) resolves the CALLER's own firm the same way every desk page
// does (resolveDeskFirm) and re-checks the caller's role against THAT firm, and
// (b) scopes every query to that firm id — a firm can never read or mutate
// another firm's membership. All paths are safe pre-migration (try/catch,
// graceful): a DB without firm_members/roles degrades, it never 500s the desk.
//
// COMPLIANCE (§III/§VII): adding a teammate does NOT email anyone. The temp
// credential is returned to the admin in-UI to hand off themselves — no
// autonomous message ever reaches a person from this route.
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { getUserRole, isAdminRole, isManagerRole } from "@/lib/desk/roles";
import {
  isAssignableRole,
  wouldRemoveLastAdmin,
  generateTempPassword,
} from "@/lib/desk/team-guards.mjs";

export const runtime = "nodejs";

type PgLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
  connect?: () => Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
    release: () => void;
  }>;
};
type SqliteLike = {
  prepare: (sql: string) => {
    all: (...args: unknown[]) => Record<string, unknown>[];
    get: (...args: unknown[]) => Record<string, unknown> | undefined;
    run: (...args: unknown[]) => unknown;
  };
};
type AnyDb = Partial<PgLike> & Partial<SqliteLike>;

interface Ctx {
  db: AnyDb;
  firmId: string | number;
  userId: string | null;
  role: Awaited<ReturnType<typeof getUserRole>>;
}

// Resolve the caller's firm + role on an open handle. Returns an error Response
// (send verbatim) or the context. Never leaks across firms: the firm is the
// caller's own, resolved by membership.
async function resolveCtx(
  db: AnyDb,
  listFirms: (db: unknown) => Promise<Array<{ id: string | number; name?: string }>>,
): Promise<{ response: Response } | { ctx: Ctx }> {
  let user: { id?: string; email?: string | null } | null = null;
  if (isSupabaseConfigured()) {
    user = await getCurrentUser();
    if (!user) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const firm = await resolveDeskFirm(db as never, listFirms);
  if (!firm) return { response: Response.json({ error: "no firm on this account" }, { status: 403 }) };
  const role = await getUserRole(db as never, firm.id, user?.id ?? null);
  return { ctx: { db, firmId: firm.id, userId: user?.id ?? null, role } };
}

// Current membership of a firm, both backends. [{ user_id, role }] — enough for
// the last-admin guard and membership checks. Firm-scoped. Never throws.
async function loadMembers(db: AnyDb, firmId: string | number): Promise<Array<{ user_id: string; role: string }>> {
  try {
    if (typeof db.query === "function") {
      const r = await db.query(`select user_id, role from firm_members where firm_id = $1`, [firmId]);
      return r.rows.map((m) => ({ user_id: String(m.user_id), role: String(m.role ?? "") }));
    }
    if (typeof db.prepare === "function") {
      const rows = db.prepare(`select user_id, role from firm_members where firm_id = ?`).all(firmId);
      return rows.map((m) => ({ user_id: String(m.user_id), role: String(m.role ?? "") }));
    }
  } catch {
    // firm_members absent (pre-migration / pilot) — no members to reason about.
  }
  return [];
}

// Best-effort per-user last-activity: the most recent callback action attributed
// to that user (flag_status.updated_by_user_id), joined through flags for
// firm-scoping. Returns user_id -> ISO string. Missing columns/tables → empty.
async function lastActivityByUser(db: AnyDb, firmId: string | number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sql = (ph: string) =>
    `select fs.updated_by_user_id as user_id, max(fs.updated_at) as last_at
       from flag_status fs join flags f on f.id = fs.flag_id
      where f.firm_id = ${ph} and fs.updated_by_user_id is not null
      group by fs.updated_by_user_id`;
  try {
    let rows: Record<string, unknown>[] = [];
    if (typeof db.query === "function") rows = (await db.query(sql("$1"), [firmId])).rows;
    else if (typeof db.prepare === "function") rows = db.prepare(sql("?")).all(firmId);
    for (const r of rows) {
      if (r.user_id == null || r.last_at == null) continue;
      const iso = r.last_at instanceof Date ? r.last_at.toISOString() : String(r.last_at);
      out.set(String(r.user_id), iso);
    }
  } catch {
    // pre-migration (no updated_by_user_id) — activity simply unavailable.
  }
  return out;
}

// --------------------------------------------------------------------------
// GET — list members (manager + admin).
// --------------------------------------------------------------------------
export async function GET() {
  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured() && isSupabaseConfigured()) {
    // Supabase auth but no DB — treat as the single owner, empty roster.
    return Response.json({ members: [], role: "admin", can_manage: false });
  }
  const db: AnyDb = await store.openPipelineDb();
  try {
    const r = await resolveCtx(db, store.listFirms);
    if ("response" in r) return r.response;
    const { ctx } = r;
    if (!isManagerRole(ctx.role)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const activity = await lastActivityByUser(db, ctx.firmId);
    let members: Array<{ user_id: string; email: string | null; role: string; created_at: string | null; last_active_at: string | null }> = [];
    try {
      if (typeof db.query === "function") {
        const rows = (
          await db.query(
            `select m.user_id, m.role, m.created_at, u.email
               from firm_members m
               left join auth.users u on u.id = m.user_id
              where m.firm_id = $1
              order by m.created_at asc nulls last`,
            [ctx.firmId],
          )
        ).rows;
        members = rows.map((m) => ({
          user_id: String(m.user_id),
          email: (m.email as string | null) ?? null,
          role: String(m.role ?? "admin"),
          created_at: m.created_at ? String(m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at) : null,
          last_active_at: activity.get(String(m.user_id)) ?? null,
        }));
      } else if (typeof db.prepare === "function") {
        // SQLite / pilot: no auth.users to join, so email is unavailable.
        const rows = db
          .prepare(`select user_id, role, created_at from firm_members where firm_id = ? order by created_at asc`)
          .all(ctx.firmId);
        members = rows.map((m) => ({
          user_id: String(m.user_id),
          email: null,
          role: String(m.role ?? "admin"),
          created_at: m.created_at ? String(m.created_at) : null,
          last_active_at: activity.get(String(m.user_id)) ?? null,
        }));
      }
    } catch {
      members = [];
    }

    return Response.json({
      members,
      role: ctx.role,
      can_manage: isAdminRole(ctx.role),
      current_user_id: ctx.userId,
    });
  } finally {
    await store.closePipelineDb(db);
  }
}

// --------------------------------------------------------------------------
// PATCH — change a member's role (admin only), with the last-admin lockout.
// --------------------------------------------------------------------------
const PatchBody = z.object({
  user_id: z.string().min(1).max(128),
  role: z.string().min(1).max(32),
});

export async function PATCH(req: Request) {
  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (!isAssignableRole(body.role)) {
    return Response.json({ error: "invalid role" }, { status: 400 });
  }

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) return Response.json({ error: "no database" }, { status: 503 });
  const db: AnyDb = await store.openPipelineDb();
  try {
    const r = await resolveCtx(db, store.listFirms);
    if ("response" in r) return r.response;
    const { ctx } = r;
    if (!isAdminRole(ctx.role)) return Response.json({ error: "forbidden" }, { status: 403 });

    const members = await loadMembers(db, ctx.firmId);
    const target = members.find((m) => m.user_id === body.user_id);
    if (!target) return Response.json({ error: "not a member of your firm" }, { status: 404 });

    // Lockout guard: never demote the firm's last admin.
    if (wouldRemoveLastAdmin(members, body.user_id, body.role)) {
      return Response.json(
        { error: "This is the firm's only admin. Make someone else an admin first." },
        { status: 409 },
      );
    }

    // Firm-scoped write: the WHERE pins both firm and member, so a caller can
    // never flip a role in another firm even by guessing a user id.
    try {
      if (typeof db.query === "function") {
        await db.query(`update firm_members set role = $1 where firm_id = $2 and user_id = $3`, [
          body.role,
          ctx.firmId,
          body.user_id,
        ]);
      } else if (typeof db.prepare === "function") {
        db.prepare(`update firm_members set role = ? where firm_id = ? and user_id = ?`).run(
          body.role,
          ctx.firmId,
          body.user_id,
        );
      }
    } catch {
      return Response.json({ error: "could not update role" }, { status: 500 });
    }
    return Response.json({ ok: true, user_id: body.user_id, role: body.role });
  } finally {
    await store.closePipelineDb(db);
  }
}

// --------------------------------------------------------------------------
// POST — add a teammate (admin only). Mirrors studio/onboard-firm's auth-user
// creation (SQL: auth.users + auth.identities, bcrypt via pgcrypto) since no
// service-role key is configured. Postgres/hosted only — the pilot SQLite path
// has no auth schema, so it degrades to a clear 503.
// --------------------------------------------------------------------------
const PostBody = z.object({
  email: z.string().email().max(200),
  role: z.string().min(1).max(32),
});

const AUTH_USER_INSERT = `insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
     confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
     'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
     '', '', '', '')
  returning id`;

const AUTH_IDENTITY_INSERT = `insert into auth.identities
    (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  values (gen_random_uuid(), $1::uuid,
     jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', $2::text, now(), now(), now())`;

export async function POST(req: Request) {
  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (!isAssignableRole(body.role)) {
    return Response.json({ error: "invalid role" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();

  const store = await import("../../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) return Response.json({ error: "no database" }, { status: 503 });
  const db: AnyDb = await store.openPipelineDb();
  try {
    const r = await resolveCtx(db, store.listFirms);
    if ("response" in r) return r.response;
    const { ctx } = r;
    if (!isAdminRole(ctx.role)) return Response.json({ error: "forbidden" }, { status: 403 });

    // Adding an account needs the Supabase auth schema — Postgres only.
    if (typeof db.connect !== "function" || typeof db.query !== "function") {
      return Response.json(
        { error: "Adding teammates needs the hosted account system, which isn't configured here." },
        { status: 503 },
      );
    }

    const client = await db.connect!();
    try {
      await client.query("begin");

      // Is this email already an auth user? If so, reuse it (no new password).
      const prior = await client.query(`select id from auth.users where email = $1`, [email]);
      let userId: string;
      let password: string | null = null;
      let existingAccount = false;

      if (prior.rows.length > 0) {
        userId = String(prior.rows[0].id);
        existingAccount = true;
        // Already on THIS firm? Then there is nothing to add — refuse cleanly
        // instead of silently changing their role via a bare "add".
        const already = await client.query(
          `select 1 from firm_members where firm_id = $1 and user_id = $2`,
          [ctx.firmId, userId],
        );
        if (already.rows.length > 0) {
          await client.query("rollback");
          return Response.json({ error: "That person is already on your team." }, { status: 409 });
        }
      } else {
        password = generateTempPassword();
        const created = await client.query(AUTH_USER_INSERT, [email, password]);
        userId = String(created.rows[0].id);
        await client.query(AUTH_IDENTITY_INSERT, [userId, userId, email]);
      }

      // Scope the membership to THIS firm with the chosen role. on-conflict keeps
      // the call idempotent under a race without ever touching another firm.
      await client.query(
        `insert into firm_members (firm_id, user_id, role) values ($1, $2, $3)
         on conflict (firm_id, user_id) do update set role = excluded.role`,
        [ctx.firmId, userId, body.role],
      );

      await client.query("commit");

      const origin = process.env.APP_URL?.replace(/\/$/, "") || "https://plaintiffops.com";
      return Response.json({
        ok: true,
        email,
        role: body.role,
        existing_account: existingAccount,
        password, // null when an existing account was linked
        signin_url: `${origin}/login`,
      });
    } catch (e) {
      await client.query("rollback").catch(() => {});
      return Response.json(
        { error: e instanceof Error ? e.message : "could not add teammate" },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } finally {
    await store.closePipelineDb(db);
  }
}
