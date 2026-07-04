// Operator error alert — emails the operator when the pipeline logs failures.
//
// The errors table (migration 0007) is written best-effort by any stage that
// fails (webhook parse, transcription, scoring, send, onboarding). This module
// is the OUTBOUND half: it gathers un-alerted errors from a recent window and
// mails a single digest to the operator, then marks those rows alerted so each
// failure is surfaced exactly once.
//
// It is NOT an SMS path and never touches a caller — it emails an operator. It
// follows the SAME TEST_MODE gate + injectable-mailer pattern as digest.mjs /
// weekly-report.mjs: while TEST_MODE is on (or no Resend key) it renders to an
// HTML file and transmits nothing. Errors are STILL marked alerted in test mode
// so re-runs don't re-report the same rows (the file is the record).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getUnalertedErrors, markErrorsAlerted } from "../ingest/store.mjs";
import { isTestMode } from "./compliance.mjs";

const DEFAULT_OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../output");

// Default lookback: alert on errors from the trailing 24h that we haven't yet
// reported. Callers can widen/narrow via `sinceIso`.
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Pure: turn error rows into an alert view model.
export function buildAlert({ errors, now = new Date() }) {
  const items = (errors ?? []).map((e) => ({
    id: e.id,
    source: e.source ?? "unknown",
    message: e.message ?? "",
    context: e.context ?? null,
    firmId: e.firm_id ?? null,
    createdAt: e.created_at ?? null,
  }));
  // Bucket a count per source so the operator sees where things break most.
  const bySource = {};
  for (const i of items) bySource[i.source] = (bySource[i.source] ?? 0) + 1;
  return {
    generatedAt: new Date(now).toISOString(),
    count: items.length,
    bySource,
    items,
  };
}

export function renderAlert(data) {
  const rows = data.items
    .map(
      (i) => `
      <tr>
        <td class="src">${esc(i.source)}</td>
        <td class="msg">${esc(i.message)}${i.context ? `<div class="ctx">${esc(i.context)}</div>` : ""}</td>
        <td class="firm">${i.firmId == null ? "—" : esc(i.firmId)}</td>
        <td class="ts">${esc(i.createdAt)}</td>
      </tr>`
    )
    .join("");

  const summary = Object.entries(data.bySource)
    .map(([s, n]) => `${esc(s)} (${n})`)
    .join(", ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA — operator error alert</title>
<style>
  :root { --accent:#1a4d8f; --red:#b91c1c; --ink:#1a1a1a; --muted:#666; --line:#e2e2e2; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#f4f4f5; }
  .page { max-width:720px; margin:24px auto; background:#fff; padding:32px 36px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  header { border-bottom:2px solid var(--ink); padding-bottom:14px; }
  .h-firm { font-size:18px; font-weight:700; }
  .h-sub { font-size:13px; color:var(--muted); margin-top:4px; }
  .hero { border-radius:8px; padding:18px 20px; margin:20px 0; background:var(--red); color:#fff;
    font-size:16px; font-weight:600; line-height:1.4; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { text-transform:uppercase; font-size:11px; letter-spacing:.04em; color:var(--muted); }
  .src { font-weight:700; white-space:nowrap; }
  .msg { color:#333; }
  .ctx { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; color:var(--muted);
    margin-top:4px; white-space:pre-wrap; word-break:break-word; }
  .firm, .ts { color:var(--muted); white-space:nowrap; }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px;
    font-size:12px; color:var(--muted); text-align:center; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="h-firm">Intake QA — operator error alert</div>
    <div class="h-sub">Generated ${esc(data.generatedAt)}</div>
  </header>
  <div class="hero">${data.count} new error${data.count === 1 ? "" : "s"} logged${summary ? ` — ${esc(summary)}` : ""}.</div>
  <table>
    <thead><tr><th>Source</th><th>Message</th><th>Firm</th><th>When</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Intake QA — this is an internal operator alert, not a client-facing message. No SMS is sent from here.</footer>
</div>
</body>
</html>`;
}

// Default (production) mailer: Resend. Lazy-imported so pilot/tests need no
// `resend` dependency — only reached with TEST_MODE off AND a key present.
async function defaultMailer({ to, from, subject, html, env = process.env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!from) throw new Error("RESEND_FROM is not set");
  if (!to) throw new Error("ALERT_TO is not set");
  const mod = "resend";
  const { Resend } = await import(mod);
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, html });
  return { id: res?.data?.id ?? null };
}

// Gather un-alerted errors in the window and (gated) email the operator.
//   * No new errors: return { mode:"none", count:0 } — nothing sent or written.
//   * TEST_MODE (or no RESEND_API_KEY): render to an HTML file, transmit NOTHING.
//   * otherwise: email via the injectable mailer (default Resend).
// Either way the reported rows are marked alerted so they fire only once.
export async function sendErrorAlert({
  db,
  mailer = defaultMailer,
  env = process.env,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
  windowMs = DEFAULT_WINDOW_MS,
  sinceIso = null,
}) {
  const since = sinceIso ?? new Date(new Date(now).getTime() - windowMs).toISOString();
  const errors = await getUnalertedErrors(db, since);
  const data = buildAlert({ errors, now });
  if (data.count === 0) return { mode: "none", count: 0, data };

  const html = renderAlert(data);
  const subject = `Intake QA — ${data.count} new pipeline error${data.count === 1 ? "" : "s"}`;
  const ids = data.items.map((i) => i.id);

  if (isTestMode(env) || !env.RESEND_API_KEY) {
    mkdirSync(outDir, { recursive: true });
    const stamp = data.generatedAt.replace(/[:.]/g, "-");
    const file = join(outDir, `alert-${stamp}.html`);
    writeFileSync(file, html);
    await markErrorsAlerted(db, ids);
    console.log(`[TEST_MODE] operator error alert rendered to ${file} (not emailed)`);
    return { mode: "test", file, count: data.count, data };
  }

  const to = env.ALERT_TO;
  const from = env.RESEND_FROM;
  const res = await mailer({ to, from, subject, html, env });
  await markErrorsAlerted(db, ids);
  console.log(`Operator error alert emailed to ${to} (id ${res.id})`);
  return { mode: "live", id: res.id, count: data.count, data };
}
