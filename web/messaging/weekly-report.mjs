// Weekly reconciliation report — render the HTML email and (gated) send it.
//
// The email LEADS with the recovered figure, then itemizes the funnel, the
// signed cases, a "recovered case of the week" brag, and a month-to-date total.
// The recovered $ is SIGNED-ONLY (see reconcile.mjs) — the honesty layer.
//
// EMAIL_ENABLED gate: while EMAIL_ENABLED is off (the default) or no Resend key
// is configured, we render to an HTML FILE instead of emailing — nothing is
// transmitted. TEST_MODE stays out of this decision on purpose: it arms SMS
// through the send chokepoint, never email. The email provider (Resend) is
// injectable so tests never touch the network, and the real client is
// lazy-imported so the pilot needs no dependency.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileWeek } from "./reconcile.mjs";
import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";

const DEFAULT_OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../output");

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n) {
  if (n == null || isNaN(n)) return "$0";
  return "$" + Number(n).toLocaleString("en-US");
}

// Build the plain-English headline that leads the email.
function headline(data) {
  const base = `This week Intake QA recovered ${money(data.recoveredFees)} in estimated fees`;
  if (data.subscriptionPrice && data.multiple > 0) {
    return `${base} — that's ${data.multiple}× your subscription.`;
  }
  return `${base}.`;
}

export function renderWeeklyReport(data) {
  const firmName = data.firm?.name ?? "Your firm";
  const cases = data.signedCases
    .map(
      (c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td class="case-type">${esc(c.caseType)}</td>
        <td class="num">${money(c.fee)}</td>
      </tr>`
    )
    .join("");

  const caseOfWeek = data.caseOfWeek
    ? `
    <section>
      <h2>Recovered case of the week</h2>
      <div class="brag">
        <div class="brag-fee">${money(data.caseOfWeek.fee)}</div>
        <div class="brag-body">
          <div class="brag-name">${esc(data.caseOfWeek.name)}</div>
          ${data.caseOfWeek.caseType ? `<div class="brag-type">${esc(data.caseOfWeek.caseType)}</div>` : ""}
          <div class="brag-sub">Signed this week — a case your intake team had let slip.</div>
        </div>
      </div>
    </section>`
    : "";

  const signedTable = data.signedCases.length
    ? `
    <section>
      <h2>Signed cases this week</h2>
      <table>
        <thead><tr><th>Client</th><th>Case</th><th class="num">Estimated fee</th></tr></thead>
        <tbody>${cases}</tbody>
        <tfoot><tr><td colspan="2">Recovered total</td><td class="num">${money(data.recoveredFees)}</td></tr></tfoot>
      </table>
    </section>`
    : `<section><h2>Signed cases this week</h2><p class="empty">No signed cases yet this week — the funnel is still working.</p></section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA — Weekly Recovery for ${esc(firmName)}</title>
<style>
  :root { --accent:#1a4d8f; --green:#1a7f37; --ink:#1a1a1a; --muted:#666; --line:#e2e2e2; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#f4f4f5; }
  .page { max-width:680px; margin:24px auto; background:#fff; padding:32px 36px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  header { border-bottom:2px solid var(--ink); padding-bottom:14px; }
  .h-firm { font-size:18px; font-weight:700; }
  .h-week { font-size:13px; color:var(--muted); margin-top:4px; }
  .hero { background:var(--green); color:#fff; border-radius:8px; padding:22px 20px; margin:20px 0; }
  .hero-amount { font-size:40px; font-weight:800; line-height:1.05; }
  .hero-line { font-size:16px; font-weight:600; margin-top:8px; line-height:1.4; }
  section { margin-top:22px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin:0 0 10px; }
  .funnel { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .stat { border:1px solid var(--line); border-radius:6px; padding:12px; text-align:center; }
  .stat-num { font-size:26px; font-weight:800; color:var(--accent); }
  .stat-label { font-size:12px; color:var(--muted); margin-top:4px; }
  .brag { display:flex; align-items:center; gap:16px; border:2px solid var(--green);
    border-radius:8px; padding:16px; background:#f2fbf4; }
  .brag-fee { font-size:30px; font-weight:800; color:var(--green); white-space:nowrap; }
  .brag-name { font-size:15px; font-weight:700; }
  .brag-type { font-size:13px; color:var(--muted); margin-top:2px; }
  .brag-sub { font-size:12px; color:var(--muted); margin-top:6px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); }
  th { text-transform:uppercase; font-size:11px; letter-spacing:.04em; color:var(--muted); }
  .num { text-align:right; }
  .case-type { color:var(--muted); font-size:13px; }
  tfoot td { font-weight:700; border-top:2px solid var(--ink); }
  .mtd { border:1px solid var(--line); border-radius:6px; padding:14px 16px; display:flex;
    justify-content:space-between; align-items:center; }
  .mtd-label { font-size:13px; color:var(--muted); }
  .mtd-amount { font-size:22px; font-weight:800; color:var(--accent); }
  .empty { font-size:14px; color:var(--muted); }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px;
    font-size:12px; color:var(--muted); text-align:center; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="h-firm">${esc(firmName)}</div>
    <div class="h-week">Weekly recovery report · week of ${esc(data.weekOf)}</div>
  </header>

  <div class="hero">
    <div class="hero-amount">${money(data.recoveredFees)}</div>
    <div class="hero-line">${esc(headline(data))}</div>
  </div>

  <section>
    <h2>This week's funnel</h2>
    <div class="funnel">
      <div class="stat"><div class="stat-num">${data.flaggedCount}</div><div class="stat-label">Leads flagged</div></div>
      <div class="stat"><div class="stat-num">${data.reEngagedCount}</div><div class="stat-label">Re-engaged</div></div>
      <div class="stat"><div class="stat-num">${data.repliedCount}</div><div class="stat-label">Replied</div></div>
      <div class="stat"><div class="stat-num">${data.signedCount}</div><div class="stat-label">Signed</div></div>
    </div>
  </section>

  ${caseOfWeek}

  ${signedTable}

  <section>
    <h2>Month to date</h2>
    <div class="mtd">
      <div class="mtd-label">Estimated fees recovered this month (signed cases only)</div>
      <div class="mtd-amount">${money(data.monthToDateRecovered)}</div>
    </div>
  </section>

  <footer>Intake QA — figures reflect signed retainers only. Estimated fees, not collected amounts.</footer>
</div>
</body>
</html>`;
}

// Default (production) mailer: Resend. Lazy-imported so the pilot/tests need no
// `resend` dependency — only reached with EMAIL_ENABLED on AND a key present. Run
// `npm i resend` before going live.
async function defaultMailer({ to, from, subject, html, env = process.env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!from) throw new Error("RESEND_FROM is not set");
  if (!to) throw new Error("WEEKLY_REPORT_TO is not set");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, html });
  return { id: res?.data?.id ?? null };
}

// Produce (and, gated, deliver) the weekly report for one firm.
//   * KILL_SWITCH, EMAIL_ENABLED off (default), or no RESEND_API_KEY: render
//     to an HTML file, transmit NOTHING.
//   * otherwise: email via the injectable mailer (default Resend).
export async function sendWeeklyReport({
  db,
  firmId,
  weekDate = new Date(),
  mailer = defaultMailer,
  env = process.env,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
}) {
  const data = await reconcileWeek({ db, firmId, weekDate });
  const html = renderWeeklyReport(data);
  const subject = `Intake QA — ${money(data.recoveredFees)} recovered this week (${data.weekOf})`;

  // Email off / unconfigured: write an HTML file instead of emailing.
  if (killSwitchEngaged(env) || !isEmailEnabled(env) || !env.RESEND_API_KEY) {
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, `weekly-${firmId}-${data.weekOf}.html`);
    writeFileSync(file, html);
    console.log(`[email off] weekly report rendered to ${file} (not emailed)`);
    return { mode: "test", file, data };
  }

  // LIVE — send the email.
  const to = env.WEEKLY_REPORT_TO;
  const from = env.RESEND_FROM;
  const res = await mailer({ to, from, subject, html, env });
  console.log(`Weekly report emailed to ${to} (id ${res.id})`);
  return { mode: "live", id: res.id, data };
}
