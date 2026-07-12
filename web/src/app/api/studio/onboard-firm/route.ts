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
import { FOUNDER_NAME, FOUNDER_EMAIL } from "@/lib/site-constants";
import { composeWelcomeEmail as composeWelcomeEmailUntyped } from "../../../../../messaging/welcome-email.mjs";

// The .mjs module carries no types; give the one call site an explicit shape.
const composeWelcomeEmail = composeWelcomeEmailUntyped as unknown as (opts: {
  firmName: string;
  email: string;
  password?: string | null;
  existingAccount?: boolean;
  signinUrl: string;
  webhookUrl: string;
  uploadUrl: string;
  founderName?: string;
  founderEmail?: string;
  founderPhone?: string;
}) => { subject: string; body: string; redactedBody: string };

export const runtime = "nodejs";

// Compose the complete, firm-personalized welcome email server-side so the
// founder never hand-assembles credentials again. Founder contact comes from
// site-constants + env (FOUNDER_PHONE optional) — never hardcoded here.
function welcomeEmailFor(opts: {
  firmName: string;
  email: string;
  password: string | null;
  existingAccount: boolean;
  origin: string;
  firmId: string;
}) {
  return composeWelcomeEmail({
    firmName: opts.firmName,
    email: opts.email,
    password: opts.password,
    existingAccount: opts.existingAccount,
    signinUrl: `${opts.origin}/login`,
    webhookUrl: `${opts.origin}/webhooks/callrail/${opts.firmId}`,
    uploadUrl: `${opts.origin}/desk/upload`,
    founderName: FOUNDER_NAME,
    founderEmail: FOUNDER_EMAIL,
    founderPhone: process.env.FOUNDER_PHONE?.trim() ?? "",
  });
}

// Best-effort persistence of the REDACTED copy (password masked — it is shown
// once and never stored readable). Best-effort on purpose: a hosted DB that
// hasn't run migration 0036 yet must not break onboarding itself.
async function persistWelcomeEmail(
  client: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  firmId: string,
  toEmail: string,
  subject: string,
  bodyRedacted: string,
): Promise<boolean> {
  try {
    await client.query(
      `insert into welcome_emails (firm_id, to_email, subject, body_redacted)
       values ($1, $2, $3, $4)`,
      [firmId, toEmail, subject, bodyRedacted],
    );
    return true;
  } catch {
    return false;
  }
}

const Body = z.object({
  firm_name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  // Accept a typed dollar amount like 12000.50 without a cryptic "invalid body";
  // round to whole dollars (the column is an integer).
  avg_case_fee: z.number().nonnegative().transform((n) => Math.round(n)).optional(),
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

// Module-scoped so the production minifier can't drop it. A function-local
// const referenced inside a `.map` arrow was being inlined away by the SWC
// minifier, leaving a bare `alphabet` reference → "alphabet is not defined"
// at runtime on Vercel (dev is unminified, so it only ever failed in prod).
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }
  return out;
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

    // 0) Idempotency: if this email already has a firm, DON'T create a second
    // one. Re-running onboarding (e.g. clicking a still-listed application after
    // already onboarding it) would otherwise mint a duplicate firm and split the
    // desk between two firm_members rows — calls flow to one, the desk shows the
    // other. Reuse the existing firm instead.
    const priorUser = await client.query(`select id from auth.users where email = $1`, [email]);
    if (priorUser.rows.length > 0) {
      const priorFirm = await client.query(
        `select f.id, f.name from firm_members m join firms f on f.id = m.firm_id
          where m.user_id = $1 order by m.firm_id limit 1`,
        [priorUser.rows[0].id],
      );
      if (priorFirm.rows.length > 0) {
        await client.query(
          `update beta_applicants set status = 'onboarding' where lower(email) = $1 and status in ('applied','nda_pending','nda_signed')`,
          [email],
        );
        await client.query("commit");
        const origin = process.env.APP_URL?.replace(/\/$/, "") || "https://plaintiffops.com";
        const welcome = welcomeEmailFor({
          firmName: priorFirm.rows[0].name,
          email,
          password: null,
          existingAccount: true,
          origin,
          firmId: priorFirm.rows[0].id,
        });
        const persisted = await persistWelcomeEmail(
          client, priorFirm.rows[0].id, email, welcome.subject, welcome.redactedBody,
        );
        return Response.json({
          ok: true,
          firm_id: priorFirm.rows[0].id,
          firm_name: priorFirm.rows[0].name,
          email,
          password: null,
          existing_account: true,
          already_onboarded: true,
          signin_url: `${origin}/login`,
          webhook_url: `${origin}/webhooks/callrail/${priorFirm.rows[0].id}`,
          welcome_email: { subject: welcome.subject, body: welcome.body, persisted },
        });
      }
    }

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
    const existing = priorUser;
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

    // 4) Clear this firm from the "Applications waiting on you" tile — otherwise
    // it lingers with a live prefill link that invites a duplicate onboarding.
    await client.query(
      `update beta_applicants set status = 'onboarding' where lower(email) = $1 and status in ('applied','nda_pending','nda_signed')`,
      [email],
    );

    await client.query("commit");

    const origin = process.env.APP_URL?.replace(/\/$/, "") || "https://plaintiffops.com";
    const welcome = welcomeEmailFor({
      firmName: firm.name,
      email,
      password,
      existingAccount: password === null,
      origin,
      firmId: firm.id,
    });
    // After commit + redacted on purpose: the raw password lives only in this
    // response (shown once), and a missing table can't roll back the firm.
    const persisted = await persistWelcomeEmail(
      client, firm.id, email, welcome.subject, welcome.redactedBody,
    );
    return Response.json({
      ok: true,
      firm_id: firm.id,
      firm_name: firm.name,
      email,
      password, // null when an existing account was linked
      existing_account: password === null,
      signin_url: `${origin}/login`,
      webhook_url: `${origin}/webhooks/callrail/${firm.id}`,
      welcome_email: { subject: welcome.subject, body: welcome.body, persisted },
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
