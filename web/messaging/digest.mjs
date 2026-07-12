// Daily approval-queue digest — a once-a-day nudge to the firm listing the
// drafted texts still awaiting human approval, with the STALE ones (waited >=
// STALE_DRAFT_HOURS) called out first so nothing rots in the queue.
//
// This is the labor-fix companion to the queue UI: instead of the reviewer
// remembering to check, the digest comes to them. It NEVER sends SMS and never
// approves anything — it only reports queue state. Email delivery follows the
// same EMAIL_ENABLED gate + injectable-mailer pattern as weekly-report.mjs:
// while EMAIL_ENABLED is off (the default) or the Resend key is missing, it
// renders to an HTML file and transmits nothing. TEST_MODE stays out of the
// email decision on purpose — it arms SMS, not email.
//
// RECIPIENT GUARD: this digest is an INTERNAL operator email. DIGEST_TO must be
// an internal address (the founder/operator), never a firm contact — the
// firm-facing daily email is missed-digest.mjs, sent to the firm's sign-in
// emails via /api/digest/run. Both crons fire at 0 15 * * *; to make a
// mix-up impossible, this sender SKIPS ENTIRELY unless DIGEST_TO is set.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDraftedMessages, getFirm } from "../ingest/store.mjs";
import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";
import { draftSla } from "./sla.mjs";

const DEFAULT_OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../output");

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pure: turn the drafted-message rows into a digest view model. `stale` rows are
// sorted to the top (oldest first) so the reviewer sees the most overdue first.
export function buildDigest({ firm, drafted, now = new Date() }) {
  const items = (drafted ?? []).map((m) => {
    const sla = draftSla(m.created_at, now);
    return {
      messageId: String(m.id),
      name: m.caller_name || "Unknown caller",
      phone: m.caller_phone ?? null,
      body: m.body ?? "",
      ageLabel: sla.label,
      hours: sla.hours,
      stale: sla.stale,
    };
  });
  items.sort((a, b) => Number(b.stale) - Number(a.stale) || b.hours - a.hours);
  const staleCount = items.filter((i) => i.stale).length;
  return {
    firmName: firm?.name ?? "Your firm",
    generatedAt: new Date(now).toISOString(),
    pendingCount: items.length,
    staleCount,
    items,
  };
}

export function renderDigest(data) {
  const rows = data.items
    .map(
      (i) => `
      <tr class="${i.stale ? "stale" : ""}">
        <td>
          <div class="name">${esc(i.name)}</div>
          ${i.phone ? `<div class="phone">${esc(i.phone)}</div>` : ""}
        </td>
        <td class="body">${esc(i.body)}</td>
        <td class="age">${i.stale ? `<span class="badge">${esc(i.ageLabel)} — overdue</span>` : esc(i.ageLabel)}</td>
      </tr>`
    )
    .join("");

  const headline = data.pendingCount === 0
    ? "Your approval queue is clear — nothing is waiting."
    : `${data.pendingCount} text${data.pendingCount === 1 ? "" : "s"} awaiting your approval${
        data.staleCount ? `, ${data.staleCount} overdue` : ""
      }.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA — Approval queue digest for ${esc(data.firmName)}</title>
<style>
  :root { --accent:#1a4d8f; --amber:#b45309; --ink:#1a1a1a; --muted:#666; --line:#e2e2e2; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#f4f4f5; }
  .page { max-width:680px; margin:24px auto; background:#fff; padding:32px 36px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  header { border-bottom:2px solid var(--ink); padding-bottom:14px; }
  .h-firm { font-size:18px; font-weight:700; }
  .h-sub { font-size:13px; color:var(--muted); margin-top:4px; }
  .hero { border-radius:8px; padding:18px 20px; margin:20px 0; background:var(--accent); color:#fff;
    font-size:16px; font-weight:600; line-height:1.4; }
  table { width:100%; border-collapse:collapse; font-size:14px; margin-top:8px; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { text-transform:uppercase; font-size:11px; letter-spacing:.04em; color:var(--muted); }
  .name { font-weight:700; }
  .phone { font-size:12px; color:var(--muted); margin-top:2px; }
  .body { color:#333; }
  .age { white-space:nowrap; text-align:right; color:var(--muted); }
  tr.stale { background:#fff7ed; }
  .badge { display:inline-block; background:var(--amber); color:#fff; border-radius:4px;
    padding:2px 6px; font-size:11px; font-weight:700; }
  .empty { font-size:14px; color:var(--muted); }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px;
    font-size:12px; color:var(--muted); text-align:center; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="h-firm">${esc(data.firmName)}</div>
    <div class="h-sub">Approval queue digest</div>
  </header>
  <div class="hero">${esc(headline)}</div>
  ${
    data.pendingCount === 0
      ? `<p class="empty">Nothing to review right now.</p>`
      : `<table>
      <thead><tr><th>Caller</th><th>Drafted text</th><th class="age">Waiting</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  }
  <footer>Intake QA — PILOT MODE: a human approves every text before it can be sent. Nothing sends automatically.</footer>
</div>
</body>
</html>`;
}

// Default (production) mailer: Resend. Lazy-imported so pilot/tests need no
// `resend` dependency — only reached with EMAIL_ENABLED on AND a key present.
async function defaultMailer({ to, from, subject, html, env = process.env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!from) throw new Error("RESEND_FROM is not set");
  if (!to) throw new Error("DIGEST_TO is not set");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, html });
  return { id: res?.data?.id ?? null };
}

// Produce (and, gated, deliver) the daily digest for one firm.
//   * No DIGEST_TO: SKIP ENTIRELY — this internal operator digest must never
//     fall back to any other recipient (see the recipient guard above).
//   * KILL_SWITCH, EMAIL_ENABLED off (default), or no RESEND_API_KEY: render
//     to an HTML file, transmit NOTHING.
//   * otherwise: email DIGEST_TO via the injectable mailer (default Resend).
export async function sendDailyDigest({
  db,
  firmId,
  mailer = defaultMailer,
  env = process.env,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
}) {
  // Recipient guard first: without an explicit internal DIGEST_TO there is
  // nothing safe to do — don't render, don't send, just say why.
  if (!env.DIGEST_TO || !String(env.DIGEST_TO).trim()) {
    return { mode: "skipped", reason: "DIGEST_TO not set (internal-only digest; must be an operator address, never a firm contact)" };
  }

  const [firm, drafted] = await Promise.all([
    getFirm(db, firmId),
    getDraftedMessages(db, firmId),
  ]);
  const data = buildDigest({ firm, drafted, now });
  const html = renderDigest(data);
  const subject = data.pendingCount
    ? `Intake QA — ${data.pendingCount} text(s) awaiting approval${data.staleCount ? ` (${data.staleCount} overdue)` : ""}`
    : "Intake QA — approval queue clear";

  if (killSwitchEngaged(env) || !isEmailEnabled(env) || !env.RESEND_API_KEY) {
    mkdirSync(outDir, { recursive: true });
    const dayStamp = data.generatedAt.slice(0, 10);
    const file = join(outDir, `digest-${firmId}-${dayStamp}.html`);
    writeFileSync(file, html);
    console.log(`[email off] daily digest rendered to ${file} (not emailed)`);
    return { mode: "test", file, data };
  }

  const to = env.DIGEST_TO;
  const from = env.RESEND_FROM;
  const res = await mailer({ to, from, subject, html, env });
  console.log(`Daily digest emailed to ${to} (id ${res.id})`);
  return { mode: "live", id: res.id, data };
}
