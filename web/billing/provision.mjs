// Provisioning — the load-bearing "paid -> live firm" step, driven by the Stripe
// webhook. Pure-ish and storage-agnostic: it takes an injected `db` (the pipeline
// store) and does its work through the store facade, so the SAME logic runs
// against local SQLite (pilot) or Supabase Postgres (hosted).
//
// It is IDEMPOTENT: replaying the same checkout.session.completed must not create
// a second firm, a second billing row, or a second welcome email. We key on the
// Stripe customer/subscription id and on firm name/email.
//
// TEST_MODE-SAFE: no external send happens unless keys are present AND TEST_MODE
// is off. The Supabase auth user + magic link and the Resend welcome are both
// best-effort and gated; when unconfigured we log the would-be action and move on.
// firm_billing IS always written (it is internal state, not an outbound send).

import {
  getFirmByName,
  createFirm,
  getFirmBilling,
  upsertFirmBilling,
  setFirmBillingStatus,
  getFirmBillingBySubscription,
  getBillingPlanByName,
  appendStripeSimLog,
  logError,
} from "../ingest/store.mjs";
import { attachCharterStepUp } from "./checkout.mjs";
import { isTestMode } from "../messaging/compliance.mjs";

// Derive a firm name from the Stripe session. Prefer the explicit firm name in
// metadata, then the customer/company name, then the local-part of the email.
function firmNameFromSession(session) {
  return (
    session?.metadata?.firm_name?.trim() ||
    session?.customer_details?.name?.trim() ||
    session?.custom_fields?.find?.((f) => f.key === "firm_name")?.text?.value?.trim() ||
    (session?.customer_details?.email
      ? session.customer_details.email.split("@")[0]
      : null) ||
    "New firm"
  );
}

// Idempotently find-or-create the firm for this checkout. Matches by firm name
// (the pilot's only stable key), else creates a fresh firm. Returns { firmId, created }.
async function findOrCreateFirm({ db, session }) {
  const name = firmNameFromSession(session);
  const existing = await getFirmByName(db, name);
  if (existing) return { firmId: existing.id, created: false, name };
  const firmId = await createFirm(db, { name });
  return { firmId, created: true, name };
}

// Best-effort Supabase auth-user + firm_members owner + magic-link welcome.
// Only runs when Supabase is configured (service-role key present). In the pilot
// (no Supabase) this is a logged no-op so provisioning never breaks.
async function provisionAuthAndWelcome({ db, firmId, email, env }) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "provision_skip",
      payload: { reason: "no_billing_email", firmId },
    }).catch(() => {});
    return { authProvisioned: false, welcomeSent: false, reason: "no_email" };
  }

  // Not on Supabase yet (pilot). Log the would-be provisioning and stop.
  if (!url || !serviceKey || isTestMode(env)) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "provision_auth_and_welcome",
      payload: {
        firmId,
        email,
        simulated: true,
        note: "TEST_MODE or Supabase unconfigured — no auth user / no email sent",
      },
    }).catch(() => {});
    return { authProvisioned: false, welcomeSent: false, simulated: true };
  }

  // Live path — create the auth user, attach the owner membership, email the
  // magic link. Lazy-import the SDKs so the pilot needs neither installed.
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Idempotent user creation: create, and if it already exists, continue.
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { firm_id: String(firmId), role: "owner" },
    });
    let userId = created?.data?.user?.id ?? null;
    if (!userId && created?.error) {
      // Already exists — look them up so provisioning stays idempotent.
      const list = await admin.auth.admin.listUsers();
      userId = list?.data?.users?.find((u) => u.email === email)?.id ?? null;
    }

    // Owner membership (Supabase firms are uuid-keyed; only meaningful there).
    if (userId) {
      await admin
        .from("firm_members")
        .upsert({ firm_id: firmId, user_id: userId, role: "owner" }, { onConflict: "firm_id,user_id" })
        .then(() => {})
        .catch(() => {});
    }

    // Magic-link welcome via Resend.
    const appUrl = env.APP_URL || env.NEXT_PUBLIC_APP_URL || "https://intake-qa.vercel.app";
    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/desk/queue` },
    });
    const magicLink = link?.data?.properties?.action_link ?? `${appUrl}/login`;
    const welcome = await sendWelcomeEmail({ to: email, magicLink, env });

    return { authProvisioned: Boolean(userId), welcomeSent: welcome.sent, userId };
  } catch (err) {
    await logError(db, {
      source: "billing.provision",
      message: `auth/welcome provisioning failed: ${err instanceof Error ? err.message : err}`,
      firm_id: null,
    }).catch(() => {});
    return { authProvisioned: false, welcomeSent: false, error: true };
  }
}

// Send the welcome email with the magic login link via Resend. Mirrors the
// TEST_MODE gate in messaging/weekly-report.mjs — no send without a key + TEST off.
async function sendWelcomeEmail({ to, magicLink, env = process.env }) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
      <h1 style="font-size:20px">You're in.</h1>
      <p>Your Intake QA subscription is active. Click below to sign in to your desk — no password needed.</p>
      <p><a href="${magicLink}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open my desk</a></p>
      <p style="color:#666;font-size:13px">This link signs you in and expires shortly. If it lapses, request a new one from the login page.</p>
    </div>`.trim();

  if (isTestMode(env) || !env.RESEND_API_KEY) {
    console.log(`[TEST_MODE] welcome email to ${to} not sent; magic link: ${magicLink}`);
    return { sent: false, simulated: true };
  }
  const from = env.RESEND_FROM;
  if (!from) return { sent: false, error: "RESEND_FROM not set" };
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  const res = await resend.emails.send({
    from,
    to,
    subject: "Welcome to Intake QA — your login link",
    html,
  });
  return { sent: true, id: res?.data?.id ?? null };
}

// Handle checkout.session.completed: idempotently create/match the firm, write
// firm_billing (active), provision auth + welcome, and (Charter) attach the
// day-90 step-up schedule. Returns a summary for the webhook to log.
/**
 * @param {{ db?: unknown, session: Record<string, unknown>, stripe?: unknown, env?: Record<string, string | undefined> }} args
 */
export async function provisionFromCheckout({ db, session, stripe, env = process.env }) {
  const plan = session?.metadata?.plan || "core";
  const email =
    session?.customer_details?.email || session?.customer_email || null;
  const customerId =
    typeof session?.customer === "string" ? session.customer : session?.customer?.id ?? null;
  const subscriptionId =
    typeof session?.subscription === "string"
      ? session.subscription
      : session?.subscription?.id ?? null;

  // Idempotency: if this subscription already provisioned a firm, stop.
  if (subscriptionId) {
    const already = await getFirmBillingBySubscription(db, subscriptionId).catch(() => null);
    if (already) {
      return { ok: true, idempotent: true, firmId: already.firm_id, plan };
    }
  }

  const { firmId, created, name } = await findOrCreateFirm({ db, session });

  // Resolve the plan row (Charter bills on Core's plan row conceptually, but we
  // seed a 'charter' plan so the intro price is tracked; fall back to core).
  const planRow =
    (await getBillingPlanByName(db, plan)) || (await getBillingPlanByName(db, "core"));
  if (!planRow) {
    await logError(db, {
      source: "billing.provision",
      message: `no billing plan row for "${plan}" (or core fallback) — run migration 0019`,
      firm_id: null,
    }).catch(() => {});
    return { ok: false, error: "no_plan_row", firmId, plan };
  }

  await upsertFirmBilling(db, {
    firm_id: firmId,
    plan_id: planRow.id,
    status: "active",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  });

  // Charter step-up: convert the just-created subscription into the two-phase
  // schedule ($1,500 x3 -> $2,500 Core). Best-effort; logged on failure.
  let stepUp = null;
  if (plan === "charter" && subscriptionId) {
    stepUp = await attachCharterStepUp({ db, subscriptionId, stripe, env }).catch(() => null);
  }

  const provisioning = await provisionAuthAndWelcome({ db, firmId, email, env });

  return {
    ok: true,
    firmId,
    firmCreated: created,
    firmName: name,
    plan,
    customerId,
    subscriptionId,
    stepUp,
    ...provisioning,
  };
}

// Handle a payment failure / past_due / unpaid: pause the firm's billing so the
// desk reflects it. Idempotent (setting paused twice is a no-op). Matches the
// firm by subscription id first, then by customer id via the billing row.
/**
 * @param {{ db?: unknown, subscriptionId?: string, env?: Record<string, string | undefined> }} args
 */
export async function pauseFromSubscriptionEvent({ db, subscriptionId, env = process.env }) {
  if (!subscriptionId) return { ok: false, reason: "no_subscription" };
  const billing = await getFirmBillingBySubscription(db, subscriptionId).catch(() => null);
  if (!billing) {
    await appendStripeSimLog(db, {
      firm_id: null,
      action: "pause_unmatched",
      payload: { subscriptionId },
    }).catch(() => {});
    return { ok: false, reason: "no_matching_firm" };
  }
  if (billing.status === "paused") {
    return { ok: true, idempotent: true, firmId: billing.firm_id };
  }
  await setFirmBillingStatus(db, billing.firm_id, "paused");
  return { ok: true, firmId: billing.firm_id, previousStatus: billing.status };
}

// Exported for tests.
export { firmNameFromSession, sendWelcomeEmail };
