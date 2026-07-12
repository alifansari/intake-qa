// The missed-cases daily digest — the digest-FIRST desk (ROADMAP item, shipped
// on Ali's sign-off). The email IS the daily loop: every missed caller in the
// body with a tap-to-call number and a signed "We called them" link that needs
// no login. It sends EVEN ON ZERO-MISS DAYS ("N calls read, all handled") so
// silence is never ambiguous with "broken" (BETA_ONBOARDING).
//
// Delivery posture (same chokepoint discipline as every sender here):
//   * KILL_SWITCH halts everything (checked by the caller, /api/digest/run,
//     AND belt-and-braces here — the kill switch halts ALL sends, email too).
//   * EMAIL_ENABLED off (default) or no Resend key: render to an HTML file,
//     transmit NOTHING. Email is gated by EMAIL_ENABLED, NOT by TEST_MODE —
//     TEST_MODE arms SMS and stays out of the email decision on purpose.
//   * Action links are omitted entirely when DIGEST_LINK_SECRET is unset —
//     the digest degrades to informational, it never degrades to insecure.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signDigestToken, digestLinkSecret } from "./digest-links.mjs";
import { openPixelTag } from "./digest-open.mjs";
import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";

const DEFAULT_OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../output");

// A case leaves the digest only once it reaches a TERMINAL outcome (signed,
// passed, or bad number) — matching the desk queue's active/Handled split
// exactly. A caller you only left a message for stays on the list so the second
// and later attempts happen (most conversions land by the 6th attempt; most
// firms quit after 2 — Velocify). "Anything not terminal still needs action."
const TERMINAL_STATUSES = new Set(["signed", "didnt_sign", "bad_number"]);
function isOpen(status) {
  return !TERMINAL_STATUSES.has(status ?? "");
}

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pure: flags (listLeakedFlags rows) → digest view model.
export function buildMissedDigest({ firm, flags, callsReceived = 0, now = new Date() }) {
  const open = (flags ?? []).filter((f) => isOpen(f.save_status ?? null));
  const items = open.map((f) => ({
    flagId: f.id,
    name: f.caller_name || "Unknown caller",
    phone: f.caller_phone ?? null,
    caseType: f.case_type ?? null,
    receivedAt: f.received_at ?? null,
    tier: f.confidence_tier ?? null,
    reason: f.reason ?? null,
  }));
  return {
    firmId: firm?.id ?? null,
    firmName: firm?.name ?? "Your firm",
    generatedAt: new Date(now).toISOString(),
    callsReceived: Number(callsReceived) || 0,
    missCount: items.length,
    items,
  };
}

export function digestSubject(data) {
  if (data.missCount === 0) {
    // Empty-FIRST-digest guard: a brand-new firm whose webhook just connected has
    // scored nothing yet. "0 calls read, all handled" reads as broken/pointless and
    // gives no first value — the documented activation killer. Say the honest thing:
    // you're connected, we're listening. (An established firm with real volume still
    // gets the reassuring "N read, all handled".)
    if (data.callsReceived === 0) {
      return "Intake QA — you're connected; we're listening for calls";
    }
    return `Intake QA — ${data.callsReceived} call${data.callsReceived === 1 ? "" : "s"} read, all handled`;
  }
  return `Intake QA — ${data.missCount} missed case${data.missCount === 1 ? "" : "s"} need${data.missCount === 1 ? "s" : ""} a callback`;
}

// HTML email. Action links are one-click-to-CONFIRM-page (a human presses the
// button there — GET never mutates, so inbox link scanners can't mark cases).
export function renderMissedDigest(data, { appUrl, env = process.env } = {}) {
  const base = (appUrl || env.APP_URL || "https://plaintiffops.com").replace(/\/$/, "");
  const canLink = Boolean(digestLinkSecret(env)) && data.firmId != null;

  const rows = data.items
    .map((i) => {
      let action = `<a class="btn secondary" href="${base}/desk/queue">Open the desk</a>`;
      if (canLink) {
        const token = signDigestToken(
          { firmId: data.firmId, flagId: i.flagId, status: "reached_out" },
          env,
        );
        action = `<a class="btn" href="${base}/digest/confirm?token=${encodeURIComponent(token)}">We called them</a>`;
      }
      return `
      <tr>
        <td>
          <div class="name">${esc(i.name)}</div>
          <div class="meta">${esc([i.caseType, i.tier ? `${i.tier} confidence` : null].filter(Boolean).join(" · "))}</div>
          ${i.reason ? `<div class="reason">${esc(i.reason)}</div>` : ""}
        </td>
        <td class="call">${i.phone ? `<a class="btn call-btn" href="tel:${esc(i.phone.replace(/[^+\d]/g, ""))}">Call ${esc(i.phone)}</a>` : `<span class="meta">no number captured</span>`}</td>
        <td class="act">${action}</td>
      </tr>`;
    })
    .join("");

  const hero =
    data.missCount === 0
      ? data.callsReceived === 0
        ? `You're connected and we're listening. No intake calls have come through to us yet. The moment they do, this digest shows any that need a callback. Nothing is broken; there's just nothing to do yet.`
        : `${data.callsReceived} call${data.callsReceived === 1 ? "" : "s"} read. Every qualified caller is signed, in progress, or accounted for. Nothing needs you today.`
      : `${data.missCount} likely-signable caller${data.missCount === 1 ? "" : "s"} walked without signing. The whole job: call them back, then tap the button.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA — Missed cases for ${esc(data.firmName)}</title>
<style>
  :root { --accent:#1a4d8f; --ink:#1a1a1a; --muted:#666; --line:#e2e2e2; --green:#166534; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#f4f4f5; }
  .page { max-width:680px; margin:24px auto; background:#fff; padding:32px 36px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  header { border-bottom:2px solid var(--ink); padding-bottom:14px; }
  .h-firm { font-size:18px; font-weight:700; }
  .h-sub { font-size:13px; color:var(--muted); margin-top:4px; }
  .hero { border-radius:8px; padding:18px 20px; margin:20px 0; font-size:16px; font-weight:600;
    line-height:1.45; color:#fff; background:${data.missCount === 0 ? "var(--green)" : "var(--accent)"}; }
  table { width:100%; border-collapse:collapse; font-size:14px; margin-top:8px; }
  td { text-align:left; padding:12px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  .name { font-weight:700; }
  .meta { font-size:12px; color:var(--muted); margin-top:2px; }
  .reason { font-size:13px; color:#333; margin-top:4px; }
  .call, .act { white-space:nowrap; text-align:right; }
  .btn { display:inline-block; background:var(--accent); color:#fff !important; border-radius:6px;
    padding:8px 12px; font-size:13px; font-weight:700; text-decoration:none; }
  .btn.secondary { background:#fff; color:var(--accent) !important; border:1px solid var(--accent); }
  .btn.call-btn { background:var(--green); }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px;
    font-size:12px; color:var(--muted); text-align:center; }
  footer a { color:var(--muted); }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="h-firm">${esc(data.firmName)}</div>
    <div class="h-sub">Missed cases — daily digest</div>
  </header>
  <div class="hero">${esc(hero)}</div>
  ${
    data.missCount === 0
      ? ""
      : `<table><tbody>${rows}</tbody></table>`
  }
  ${
    // Open-tracking pixel (1x1, HMAC-signed, no PII — firm id + day only). Renders
    // only when DIGEST_LINK_SECRET is configured; measurement never degrades to
    // an unsigned URL. Reason: BETA_ONBOARDING — "three consecutive unopened
    // digests = call the firm" must be measurable on /studio/beta.
    canLink ? openPixelTag({ base, firmId: data.firmId, day: data.generatedAt.slice(0, 10) }, env) : ""
  }
  <footer>
    Intake QA — the independent recovery desk. This digest goes to your sign-in email;
    the same list always lives at <a href="${base}/desk/queue">your desk</a>.
    Estimates are operations estimates, not legal opinions.
  </footer>
</div>
</body>
</html>`;
}

// Default (production) mailer: Resend. Lazy-imported; only reached with
// EMAIL_ENABLED on AND a key present AND the kill switch off.
async function defaultMailer({ to, from, subject, html, env = process.env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!from) throw new Error("RESEND_FROM is not set");
  if (!to || to.length === 0) throw new Error("no recipients");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, html });
  return { id: res?.data?.id ?? null };
}

// Build + (gated) deliver one firm's digest.
//   * KILL_SWITCH, EMAIL_ENABLED off (default), or no RESEND_API_KEY →
//     render to output/, transmit NOTHING.
//   * otherwise → email `recipients` via the injectable mailer.
export async function sendMissedDigest({
  store,
  db,
  firm,
  recipients = [],
  appUrl,
  mailer = defaultMailer,
  env = process.env,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
}) {
  const flags = await store.listLeakedFlags(db, firm.id);
  let callsReceived = 0;
  try {
    const recon = await store.getCallReconciliation(db, firm.id);
    callsReceived = Number(recon?.received ?? 0);
  } catch {
    callsReceived = 0;
  }
  const data = buildMissedDigest({ firm, flags, callsReceived, now });
  const html = renderMissedDigest(data, { appUrl, env });
  const subject = digestSubject(data);

  if (killSwitchEngaged(env) || !isEmailEnabled(env) || !env.RESEND_API_KEY) {
    const reason = killSwitchEngaged(env)
      ? "KILL_SWITCH engaged"
      : !isEmailEnabled(env)
        ? "EMAIL_ENABLED is not true"
        : "RESEND_API_KEY not set";
    mkdirSync(outDir, { recursive: true });
    const dayStamp = data.generatedAt.slice(0, 10);
    const file = join(outDir, `missed-digest-${firm.id}-${dayStamp}.html`);
    writeFileSync(file, html);
    return { mode: "test", reason, file, missCount: data.missCount, subject };
  }

  if (recipients.length === 0) return { mode: "skipped", reason: "no recipients" };
  const res = await mailer({ to: recipients, from: env.RESEND_FROM, subject, html, env });
  return { mode: "live", id: res.id, missCount: data.missCount, subject };
}
