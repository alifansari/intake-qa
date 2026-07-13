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
import { join } from "node:path";
import { signDigestToken, digestLinkSecret } from "./digest-links.mjs";
import { openPixelTag } from "./digest-open.mjs";
import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";
import { defaultOutDir } from "./out-dir.mjs";

const DEFAULT_OUT_DIR = defaultOutDir();

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

// The one font stack, inlined on every text element (email clients have no
// shared stylesheet; there is no cascade to rely on).
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

// A bulletproof, padding-based button (Litmus pattern): a padded anchor with an
// INLINE literal-hex background AND a matching border so the shape survives even
// when a dark-mode client repaints backgrounds. No CSS classes, no variables —
// Gmail strips <style>/<head> and ignores CSS custom properties.
function emailButton(href, label, { bg, textColor = "#ffffff", border } = {}) {
  return `<a href="${href}" style="display:inline-block;background-color:${bg};color:${textColor};text-decoration:none;font-weight:700;font-size:14px;font-family:${FONT};padding:11px 16px;border-radius:6px;border:1px solid ${border || bg};line-height:1;margin:0 8px 8px 0;">${label}</a>`;
}

// HTML email. Action links are one-click-to-CONFIRM-page (a human presses the
// button there — GET never mutates, so inbox link scanners can't mark cases).
//
// Rendering discipline (see the research trail in ops/decisions.md): EVERY style
// is inline with literal hex colors, layout is table-based, colored cells carry a
// bgcolor= attribute so text is never white-on-white, and a prefers-color-scheme
// block is progressive enhancement only. This template must not reintroduce a
// <style> class dependency or a CSS var() — Gmail drops both and the email breaks.
export function renderMissedDigest(data, { appUrl, env = process.env } = {}) {
  const base = (appUrl || env.APP_URL || "https://plaintiffops.com").replace(/\/$/, "");
  const canLink = Boolean(digestLinkSecret(env)) && data.firmId != null;

  const ACCENT = "#1a4d8f";
  const GREEN = "#166534";
  const heroBg = data.missCount === 0 ? GREEN : ACCENT;

  const rows = data.items
    .map((i) => {
      let action = emailButton(`${base}/desk/queue`, "Open the desk", {
        bg: "#ffffff",
        textColor: ACCENT,
        border: ACCENT,
      });
      if (canLink) {
        const token = signDigestToken(
          { firmId: data.firmId, flagId: i.flagId, status: "reached_out" },
          env,
        );
        action = emailButton(
          `${base}/digest/confirm?token=${encodeURIComponent(token)}`,
          "We called them",
          { bg: ACCENT },
        );
      }
      const meta = esc(
        [i.caseType, i.tier ? `${i.tier} confidence` : null].filter(Boolean).join(" · "),
      );
      const callCell = i.phone
        ? emailButton(`tel:${esc(i.phone.replace(/[^+\d]/g, ""))}`, `Call ${esc(i.phone)}`, {
            bg: GREEN,
          })
        : `<span style="display:inline-block;font-size:13px;color:#9ca3af;font-family:${FONT};margin:0 8px 8px 0;">No number captured</span>`;
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rowcard" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 12px 0;background-color:#ffffff;">
        <tr>
          <td style="padding:16px 18px;">
            <div class="ink" style="font-size:16px;font-weight:700;color:#111827;font-family:${FONT};">${esc(i.name)}</div>
            ${meta ? `<div class="muted" style="font-size:13px;color:#6b7280;margin-top:3px;font-family:${FONT};">${meta}</div>` : ""}
            ${i.reason ? `<div class="reason" style="font-size:14px;color:#374151;margin-top:6px;line-height:1.45;font-family:${FONT};">${esc(i.reason)}</div>` : ""}
            <div style="margin-top:12px;">${callCell}${action}</div>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  const hero =
    data.missCount === 0
      ? data.callsReceived === 0
        ? `You're connected and we're listening. No intake calls have come through to us yet. The moment they do, this digest shows any that need a callback. Nothing is broken; there's just nothing to do yet.`
        : `${data.callsReceived} call${data.callsReceived === 1 ? "" : "s"} read. Every qualified caller is signed, in progress, or accounted for. Nothing needs you today.`
      : `${data.missCount} likely-signable caller${data.missCount === 1 ? "" : "s"} walked without signing. The whole job: call them back, then tap the button.`;

  // Open-tracking pixel (1x1, HMAC-signed, no PII — firm id + day only). Renders
  // only when DIGEST_LINK_SECRET is configured; measurement never degrades to an
  // unsigned URL. Reason: BETA_ONBOARDING — "three consecutive unopened digests =
  // call the firm" must be measurable on /studio/beta.
  const pixel = canLink
    ? openPixelTag({ base, firmId: data.firmId, day: data.generatedAt.slice(0, 10) }, env)
    : "";

  return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light dark"/>
<meta name="supported-color-schemes" content="light dark"/>
<title>Intake QA — Missed cases for ${esc(data.firmName)}</title>
<style>
  /* Progressive enhancement ONLY. Apple Mail / iOS honor this; Gmail strips it,
     so the inline styles below must stand alone. Never move real styling here. */
  @media (prefers-color-scheme: dark) {
    .page { background-color:#0f172a !important; }
    .card, .rowcard { background-color:#1e293b !important; border-color:#334155 !important; }
    .ink { color:#f1f5f9 !important; }
    .muted { color:#94a3b8 !important; }
    .reason { color:#cbd5e1 !important; }
    .divider { background-color:#334155 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background-color:#f4f5f7;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="card" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:28px 32px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};font-family:${FONT};">Intake QA</div>
            <div class="ink" style="font-size:22px;font-weight:700;color:#111827;margin-top:8px;font-family:${FONT};">${esc(data.firmName)}</div>
            <div class="muted" style="font-size:14px;color:#6b7280;margin-top:3px;font-family:${FONT};">Missed cases &middot; daily digest</div>
            <div class="divider" style="height:1px;line-height:1px;font-size:0;background-color:#e5e7eb;margin:18px 0;">&nbsp;</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td bgcolor="${heroBg}" style="background-color:${heroBg};color:#ffffff;padding:18px 20px;border-radius:8px;font-size:16px;font-weight:600;line-height:1.5;font-family:${FONT};">${esc(hero)}</td>
              </tr>
            </table>
            ${data.missCount === 0 ? "" : rows}
            ${pixel}
            <div class="divider" style="height:1px;line-height:1px;font-size:0;background-color:#e5e7eb;margin:24px 0 16px;">&nbsp;</div>
            <div class="muted" style="font-size:12px;color:#9ca3af;line-height:1.5;text-align:center;font-family:${FONT};">
              Intake QA — the independent recovery desk. This digest goes to your sign-in email; the same list always lives at <a href="${base}/desk/queue" style="color:${ACCENT};text-decoration:underline;">your desk</a>.<br/>Estimates are operations estimates, not legal opinions.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
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
