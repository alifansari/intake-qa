// POST /api/studio/onboard-firm — founder-only. The apply → account bridge.
//
// One call turns an approved beta applicant into a working firm:
//   1. creates the firm row (pipeline DB)
//   2. creates their auth user (or links an existing one by email)
//   3. maps user → firm in firm_members (what the desk scopes by)
// and returns everything the founder pastes into the welcome email: sign-in
// URL, a generated temporary password (new users only — shown ONCE, never
// stored readable), and the firm's paste-once CallRail webhook address.
//
// Auth-user creation uses the SQL pattern (auth.users + auth.identities with
// bcrypt via pgcrypto) because no service-role key is configured. If the
// password path ever misbehaves, the account still exists — the magic-link
// sign-in works regardless.
import { z } from "zod";
import { Pool } from "pg";
import { requireFounderRoute } from "@/lib/studio/guard";

export const runtime = "nodejs";

const Body = z.object({
  firm_name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  avg_case_fee: z.number().int().nonnegative().optional(),
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

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;
  if (!process.env.DATABASE_URL) return Response.json({ error: "no database" }, { status: 503 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const p = pool();
  const client = await p.connect();

  try {
    await client.query("begin");

    // 1) The firm (kill_switch stays ON — the safe default from 0001).
    const firm = (
      await client.query(
        `insert into firms (name, avg_case_fee) values ($1, $2) returning id, name`,
        [body.firm_name.trim(), body.avg_case_fee ?? 0],
      )
    ).rows[0];

    // 2) The auth user — reuse by email, else create with a temp password.
    let password: string | null = null;
    let userId: string;
    const existing = await client.query(`select id from auth.users where email = $1`, [email]);
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      password = generatePassword();
      const created = await client.query(
        `insert into auth.users
           (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
            '', '', '', '')
         returning id`,
        [email, password],
      );
      userId = created.rows[0].id;
      await client.query(
        `insert into auth.identities
           (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
         values (gen_random_uuid(), $1::uuid,
            jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', $2::text, now(), now(), now())`,
        [userId, String(userId), email],
      );
    }

    // 3) The mapping the desk scopes by.
    await client.query(
      `insert into firm_members (firm_id, user_id) values ($1, $2) on conflict do nothing`,
      [firm.id, userId],
    );

    await client.query("commit");

    const origin = process.env.APP_URL?.replace(/\/$/, "") || "https://plaintiffops.com";
    return Response.json({
      ok: true,
      firm_id: firm.id,
      firm_name: firm.name,
      email,
      password, // null when an existing account was linked
      existing_account: password === null,
      signin_url: `${origin}/login`,
      webhook_url: `${origin}/webhooks/callrail/${firm.id}`,
    });
  } catch (e) {
    await client.query("rollback").catch(() => {});
    return Response.json(
      { error: e instanceof Error ? e.message : "onboarding failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
