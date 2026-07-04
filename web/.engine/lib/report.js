// Renders a one-page, print-ready HTML report from a score JSON object.
// No external fonts, scripts, or chart libraries — a single embedded CSS block.
// Can be run standalone for testing:
//   node lib/report.js <score.json> <out.html> ["Firm Name"]

import { readFileSync, writeFileSync } from "node:fs";

const CATEGORY_LABELS = {
  qualification: "Qualification Completeness",
  conversion: "Conversion Behaviors",
  connection: "Connection & Empathy",
  risk_compliance: "Risk & Compliance",
  process: "Process & Logistics",
};

const BAND_COLORS = {
  exemplary: "#1a7f37",
  strong: "#1a4d8f",
  developing: "#b26a00",
  needs_coaching: "#c05621",
  intervention: "#b00020",
};

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n) {
  if (n == null || isNaN(n)) return "";
  return "$" + Number(n).toLocaleString("en-US");
}

function alertBanners(score) {
  const alerts = score.alerts || {};
  const criticalFails = score.critical_fails || [];
  const parts = [];

  if (criticalFails.length) {
    const items = criticalFails
      .map(
        (cf) => `
        <div class="cf-item">
          <div class="cf-code">${esc(cf.code)} · ${esc(cf.name)}${
          cf.timestamp ? ` · ${esc(cf.timestamp)}` : ""
        }</div>
          ${cf.evidence_quote ? `<div class="cf-quote">&ldquo;${esc(cf.evidence_quote)}&rdquo;</div>` : ""}
          ${cf.explanation ? `<div class="cf-exp">${esc(cf.explanation)}</div>` : ""}
        </div>`
      )
      .join("");
    parts.push(`
      <div class="banner banner-dark">
        <div class="banner-title">CRITICAL FAIL — score capped at 49 · manager review required</div>
        ${items}
      </div>`);
  }

  if (alerts.lost_signable_case) {
    const rar = alerts.revenue_at_risk || {};
    const quotes = (rar.evidence_quotes || [])
      .map((q) => `<li>&ldquo;${esc(q)}&rdquo;</li>`)
      .join("");
    parts.push(`
      <div class="banner banner-red">
        <div class="banner-title">LOST SIGNABLE CASE</div>
        ${
          rar.amount_usd != null
            ? `<div class="rar">${money(rar.amount_usd)}<span class="rar-sub"> estimated fee at risk${
                rar.case_type_matched ? ` · ${esc(rar.case_type_matched)}` : ""
              }</span></div>`
            : ""
        }
        ${quotes ? `<ul class="quotes">${quotes}</ul>` : ""}
      </div>`);
  }

  if (alerts.missed_development_opportunity) {
    parts.push(`
      <div class="banner banner-amber">
        <div class="banner-title">Missed development opportunity</div>
        <div class="banner-sub">A possibly-signable caller left without full qualification.</div>
      </div>`);
  }

  if (alerts.after_hours_leak) {
    parts.push(`
      <div class="banner banner-amber">
        <div class="banner-title">After-hours lead leak</div>
        <div class="banner-sub">A potential PI matter was described in a voicemail / no live contact.</div>
      </div>`);
  }

  return parts.join("\n");
}

function categoryBars(score) {
  const cats = (score.scores && score.scores.categories) || {};
  const rows = Object.keys(CATEGORY_LABELS)
    .filter((k) => cats[k] && typeof cats[k].score === "number")
    .map((k) => {
      const val = cats[k].score;
      return `
        <div class="bar-row">
          <div class="bar-label">${CATEGORY_LABELS[k]}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(
            0,
            Math.min(100, val)
          )}%"></div></div>
          <div class="bar-val">${val}</div>
        </div>`;
    })
    .join("");
  return rows ? `<div class="bars">${rows}</div>` : "";
}

function coachingBox(score) {
  const c = score.coaching || {};
  const ts = c.top_strength || {};
  const ot = c.one_thing || {};
  return `
    <div class="coach">
      <div class="coach-col">
        <div class="coach-h">Top strength</div>
        <div class="coach-body">${esc(ts.behavior)}</div>
        ${ts.quote ? `<div class="coach-quote">&ldquo;${esc(ts.quote)}&rdquo;${ts.timestamp ? ` <span class="ts">${esc(ts.timestamp)}</span>` : ""}</div>` : ""}
      </div>
      <div class="coach-col">
        <div class="coach-h">The one thing</div>
        <div class="coach-body">${esc(ot.behavior)}</div>
        ${ot.model_utterance ? `<div class="coach-model">Try: &ldquo;${esc(ot.model_utterance)}&rdquo;</div>` : ""}
        ${ot.why_it_matters ? `<div class="coach-why">${esc(ot.why_it_matters)}</div>` : ""}
      </div>
    </div>`;
}

export function renderReport(score, opts = {}) {
  const firmName = opts.firmName || "";
  const callDate = opts.callDate || "";
  const scores = score.scores || {};
  const band = scores.band || "";
  const bandColor = BAND_COLORS[band] || "#333";
  const overall = scores.overall != null ? scores.overall : "—";
  const scoreable =
    !score.transcript_quality || score.transcript_quality.scoreable !== false;

  const notScoreable = !scoreable
    ? `<div class="banner banner-amber"><div class="banner-title">Call not scoreable</div><div class="banner-sub">${esc(
        (score.transcript_quality &&
          (score.transcript_quality.issues || []).join("; ")) ||
          "Transcript quality gate failed."
      )}</div></div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA Report — ${esc(firmName || score.call_id || "")}</title>
<style>
  :root { --accent:#1a4d8f; --ink:#1a1a1a; --muted:#666; --line:#e2e2e2; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#f4f4f5; }
  .page { max-width:820px; margin:24px auto; background:#fff; padding:32px 36px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  header { display:flex; justify-content:space-between; align-items:flex-start;
    border-bottom:2px solid var(--ink); padding-bottom:16px; }
  .h-firm { font-size:20px; font-weight:700; }
  .h-meta { font-size:13px; color:var(--muted); margin-top:4px; line-height:1.5; }
  .score-badge { text-align:center; min-width:120px; }
  .score-num { font-size:52px; font-weight:800; line-height:1; }
  .band { display:inline-block; margin-top:6px; padding:3px 10px; border-radius:12px;
    color:#fff; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; }
  .conf { font-size:11px; color:var(--muted); margin-top:6px; }
  section { margin-top:22px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted);
    margin:0 0 10px; }
  .banner { border-radius:6px; padding:14px 16px; margin:10px 0; color:#fff; }
  .banner-title { font-weight:700; font-size:15px; }
  .banner-sub { font-size:13px; opacity:.92; margin-top:2px; }
  .banner-red { background:#b00020; }
  .banner-amber { background:#b26a00; }
  .banner-dark { background:#1e1e1e; }
  .rar { font-size:34px; font-weight:800; margin-top:6px; }
  .rar-sub { font-size:13px; font-weight:500; opacity:.9; }
  .quotes { margin:8px 0 0; padding-left:18px; font-size:13px; }
  .quotes li { margin:3px 0; }
  .cf-item { margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,.2); }
  .cf-code { font-weight:700; font-size:13px; }
  .cf-quote { font-style:italic; font-size:13px; margin:3px 0; }
  .cf-exp { font-size:12px; opacity:.9; }
  .bars { display:flex; flex-direction:column; gap:8px; }
  .bar-row { display:grid; grid-template-columns:180px 1fr 34px; align-items:center; gap:10px; }
  .bar-label { font-size:13px; }
  .bar-track { background:#eee; border-radius:4px; height:16px; overflow:hidden; }
  .bar-fill { background:var(--accent); height:100%; }
  .bar-val { font-size:13px; font-weight:700; text-align:right; }
  .coach { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .coach-col { border:1px solid var(--line); border-radius:6px; padding:14px; }
  .coach-h { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--accent);
    font-weight:700; margin-bottom:6px; }
  .coach-body { font-size:13px; line-height:1.5; }
  .coach-quote, .coach-model { font-style:italic; font-size:13px; margin-top:8px;
    border-left:3px solid var(--line); padding-left:10px; }
  .coach-model { border-left-color:var(--accent); }
  .coach-why { font-size:12px; color:var(--muted); margin-top:8px; }
  .ts { color:var(--muted); font-style:normal; }
  .summary { font-size:14px; line-height:1.6; }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px;
    font-size:12px; color:var(--muted); text-align:center; }
  @media print {
    body { background:#fff; }
    .page { box-shadow:none; margin:0; max-width:none; }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div>
      <div class="h-firm">${esc(firmName || "Intake QA Report")}</div>
      <div class="h-meta">
        Call: ${esc(score.call_id || "")}${callDate ? ` · ${esc(callDate)}` : ""}<br/>
        Type: ${esc(score.call_type || "")}${
    score.language ? ` · ${esc(score.language)}` : ""
  }${
    score.duration_assessed_sec
      ? ` · ${esc(score.duration_assessed_sec)}s`
      : ""
  }
      </div>
    </div>
    <div class="score-badge">
      <div class="score-num" style="color:${bandColor}">${esc(overall)}</div>
      ${band ? `<div class="band" style="background:${bandColor}">${esc(band.replace(/_/g, " "))}</div>` : ""}
      ${scores.confidence ? `<div class="conf">confidence: ${esc(scores.confidence)}</div>` : ""}
    </div>
  </header>

  ${notScoreable}
  ${alertBanners(score)}

  ${
    scoreable && (score.scores && score.scores.categories)
      ? `<section><h2>Category scores</h2>${categoryBars(score)}</section>`
      : ""
  }

  ${
    score.coaching
      ? `<section><h2>Coaching</h2>${coachingBox(score)}</section>`
      : ""
  }

  ${
    score.summary
      ? `<section><h2>Summary</h2><div class="summary">${esc(score.summary)}</div></section>`
      : ""
  }

  <footer>Scored by PI Intake QA — every call, every day</footer>
</div>
</body>
</html>`;
}

export function writeReport(score, outPath, opts = {}) {
  writeFileSync(outPath, renderReport(score, opts));
}

// ---- Batch summary page -------------------------------------------------

export function renderSummary(rows) {
  const totalRar = rows.reduce((s, r) => s + (r.revenue_at_risk || 0), 0);
  const body = rows
    .map(
      (r) => `
      <tr>
        <td><a href="${esc(r.reportFile)}">${esc(r.name)}</a></td>
        <td>${esc(r.call_type || "")}</td>
        <td class="num">${esc(r.overall ?? "")}</td>
        <td>${esc(r.band || "")}</td>
        <td>${r.alerts && r.alerts.length ? esc(r.alerts.join(", ")) : ""}</td>
        <td class="num">${r.revenue_at_risk ? money(r.revenue_at_risk) : ""}</td>
      </tr>`
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Intake QA — Batch Summary</title>
<style>
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:#1a1a1a; max-width:900px; margin:32px auto; padding:0 20px; }
  h1 { font-size:22px; }
  .found { font-size:15px; margin:12px 0 20px; }
  .found b { font-size:24px; color:#b00020; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #e2e2e2; }
  th { text-transform:uppercase; font-size:12px; letter-spacing:.04em; color:#666; }
  .num { text-align:right; }
  tfoot td { font-weight:700; border-top:2px solid #1a1a1a; }
</style></head>
<body>
  <h1>Intake QA — Batch Summary</h1>
  <div class="found">Found money (total estimated fees at risk): <b>${money(totalRar)}</b></div>
  <table>
    <thead><tr><th>Call</th><th>Type</th><th class="num">Score</th><th>Band</th><th>Alerts</th><th class="num">Rev. at risk</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="5">Total</td><td class="num">${money(totalRar)}</td></tr></tfoot>
  </table>
</body></html>`;
}

// Standalone CLI for quick report testing without any API calls.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , scorePath, outPath, firmName] = process.argv;
  if (!scorePath || !outPath) {
    console.error('Usage: node lib/report.js <score.json> <out.html> ["Firm Name"]');
    process.exit(1);
  }
  const score = JSON.parse(readFileSync(scorePath, "utf8"));
  writeReport(score, outPath, { firmName: firmName || "" });
  console.log(`Wrote ${outPath}`);
}
