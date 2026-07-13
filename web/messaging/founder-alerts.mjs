// Founder alerting — the "you cannot run a beta blind" outbound half.
//
// A periodic sweep (POST/GET /api/alerts/sweep, cron or manual) gathers every
// trigger since the last sweep and sends ONE batched email to FOUNDER_EMAIL —
// never a spam stream. It ALSO sends ONE terse text (sendFounderSms) when the
// sweep found a MATERIAL event — new application, firm added, leaked-signable
// flagged, case signed, or a health issue — so the founder's phone buzzes for
// money/urgent items while the email carries the full detail (uploads, clean
// scores, routine actions). The cron runs near-real-time (every minute); the
// stuck-scoring watchdog is muted per firm (STUCK_REALERT_HOURS) so an ongoing
// outage can't text every minute. Triggers:
//   (a) any failed_scoring (errors table + calls with a failed_* status)
//   (b) 3+ CallRail signature failures within an hour for one firm
//   (c) a digest run that skipped or failed any firm
//   (d) a new beta application
//   (e) a once-daily 8am America/Los_Angeles one-line beta pulse
//   (f) calls received but never scored past STUCK_SCORING_HOURS (Inngest-outage
//       safety net — scoring has no non-Inngest fallback)
//   (g) a founder-activity digest: every new firm added, call uploaded, call
//       scored, and intake action (callback worked) since the last sweep, read
//       from the first-party product-event log (ids/counts only, never PII)
//
// Delivery follows the SAME EMAIL_ENABLED gate + injectable-mailer pattern as
// digest.mjs / alerts.mjs: KILL_SWITCH engaged, EMAIL_ENABLED off (default), or
// no Resend key → render to an HTML file, transmit NOTHING. This is an
// INTERNAL founder-directed email (compliance §VII allows operator alerts); it
// never touches a firm or a caller.
//
// Watermarks live in alert_state (migration 0027/0035) so each trigger fires
// exactly once: 'alerts.error_watermark' (last errors.id examined),
// 'alerts.apps_watermark' (last application created_at), 'alerts.pulse_date'
// (last pulse day in LA time), 'alerts.events_watermark' (last events.id
// reported in the activity digest). The errors `alerted` flag is NOT reused — it
// belongs to the older sendErrorAlert path.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isEmailEnabled, killSwitchEngaged } from "./compliance.mjs";
import { defaultOutDir } from "./out-dir.mjs";
import { sendFounderSms } from "./founder-sms.mjs";

const DEFAULT_OUT_DIR = defaultOutDir();

export const SIGNATURE_FAILURE_THRESHOLD = 3;
export const SIGNATURE_FAILURE_WINDOW_MS = 60 * 60 * 1000;

// Received-but-never-scored watchdog. Scoring is 100% Inngest-dependent: the
// webhook emits intakeqa/call.received AND the "fallback" 15-min score sweep is
// ITSELF an Inngest cron (inngest/functions.mjs scheduledScoreSweep) — so an
// Inngest outage has NO fallback and strands calls at "processing" forever with
// nothing surfacing it. This trigger is that safety net: any call unscored
// longer than STUCK_SCORING_HOURS trips the batched founder alert. Env-
// overridable so the threshold can be tuned without a deploy.
export const STUCK_SCORING_HOURS = Number(process.env.STUCK_SCORING_HOURS) || 2;

// How long a stuck-scoring incident stays MUTED after it texts once. The sweep
// now runs near-real-time (every minute), so without this an ongoing outage
// would text the founder every single minute. Re-alert only every N hours.
export const STUCK_REALERT_HOURS = Number(process.env.STUCK_REALERT_HOURS) || 6;

const WM_ERRORS = "alerts.error_watermark";
const WM_APPS = "alerts.apps_watermark";
const WM_PULSE = "alerts.pulse_date";
const WM_EVENTS = "alerts.events_watermark";
const WM_STUCK = "alerts.stuck_state";

// Which product events the founder-activity digest reports, in display order,
// with their human labels. Deliberately CURATED: the noisy, low-signal events
// (sign_in, desk_view, digest_*, upload_started, audit_started) are excluded so
// the digest is the pulse of real activity, not every page view. apply_submitted
// is excluded here because it already has its own richer dedicated section.
const ACTIVITY_ORDER = [
  "firm_created",
  "upload_completed",
  "score_completed",
  "callback_marked",
  "audit_completed",
];
const ACTIVITY_LABELS = {
  firm_created: "New firm added",
  upload_completed: "New call uploaded",
  score_completed: "Call scored",
  callback_marked: "Intake action (callback worked)",
  audit_completed: "Leak audit completed (public)",
};
// Cap lines per section so a busy hour never produces a wall-of-text email.
const ACTIVITY_LINE_CAP = 25;

function esc(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Coarse human age ("3h", "2d", "45m") of an ISO timestamp relative to `now`.
// Used only for the stuck-unscored alert line — precision beyond this is noise.
function ageFromIso(iso, now = new Date()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "unknown age";
  const hours = (new Date(now).getTime() - t) / (60 * 60 * 1000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  return `${Math.max(1, Math.floor(hours * 60))}m`;
}

// --- Pure classifiers (unit-tested, no I/O) -----------------------------------

// Does an errors-table row describe a failed scoring attempt? The rows may be
// written by sibling branches, so match on shape, not one exact source string.
export function isScoringFailure(row) {
  const source = String(row?.source ?? "").toLowerCase();
  const message = String(row?.message ?? "").toLowerCase();
  return (
    source.includes("score") ||
    message.includes("failed to score") ||
    message.includes("failed_scoring")
  );
}

// Does a row describe a CallRail signature rejection? (The rows may come from
// a sibling branch's webhook hardening — key off the shape defensively.)
export function isSignatureFailure(row) {
  const source = String(row?.source ?? "").toLowerCase();
  const message = String(row?.message ?? "").toLowerCase();
  if (!source.includes("callrail") && !message.includes("callrail")) return false;
  return source.includes("signature") || message.includes("signature");
}

// Does a digest.run ledger row report trouble? Returns null when fine, else a
// short plain-English description. Defensive JSON parse (sibling-branch rows).
export function digestRunProblem(row) {
  if (!row || row.source !== "digest.run") return null;
  let ctx = row.context;
  try {
    if (typeof ctx === "string") ctx = JSON.parse(ctx);
  } catch {
    ctx = null;
  }
  const results = ctx && Array.isArray(ctx.results) ? ctx.results : null;
  if (!results) {
    // The fail-loud rows (missing CRON_SECRET, KILL_SWITCH halt) have no
    // results array — the message itself is the problem statement.
    const msg = String(row.message ?? "");
    return /halted|not set|cannot|never/i.test(msg) ? msg : null;
  }
  const bad = results.filter((r) => r && (r.mode === "skipped" || r.mode === "error"));
  if (bad.length === 0) return null;
  return `${bad.length} firm(s) skipped or failed in the digest run: ${bad
    .map((r) => `${r.firm} (${r.mode}${r.reason ? ` — ${r.reason}` : ""})`)
    .join(", ")}`;
}

// Firms with >= threshold signature failures inside the trailing window.
// Rows without a firm_id are grouped under "unknown" — a flood of unattributed
// signature failures is still a probe worth a phone-sized alert.
export function signatureFailureFirms(
  rows = [],
  { threshold = SIGNATURE_FAILURE_THRESHOLD, windowMs = SIGNATURE_FAILURE_WINDOW_MS, now = new Date() } = {},
) {
  const cutoff = new Date(now).getTime() - windowMs;
  const byFirm = new Map();
  for (const row of rows) {
    if (!isSignatureFailure(row)) continue;
    const t = new Date(row.created_at ?? 0).getTime();
    if (!Number.isFinite(t) || t < cutoff) continue;
    const key = row.firm_id == null ? "unknown" : String(row.firm_id);
    byFirm.set(key, (byFirm.get(key) ?? 0) + 1);
  }
  return [...byFirm.entries()]
    .filter(([, n]) => n >= threshold)
    .map(([firmId, count]) => ({ firmId, count }));
}

// --- Founder-activity digest (the "ping me for every good thing too" half) ----

// events.context is a small JSON blob (ids/counts only). It arrives as a JSON
// string (DB) or an already-parsed object (tests) or null — normalize to object.
function parseContext(ctx) {
  if (ctx == null) return {};
  if (typeof ctx === "object") return ctx;
  try {
    return JSON.parse(ctx);
  } catch {
    return {};
  }
}

// One human line for a single activity event. firmName maps a firm_id to its
// name (falls back to "firm <id>"); public flows (audit) have no firm.
function activityLine(ev, { firmName, now }) {
  const c = parseContext(ev.context);
  const who = ev.firm_id != null ? firmName(ev.firm_id) : "public";
  const age = ev.created_at ? ` (${ageFromIso(ev.created_at, now)} ago)` : "";
  switch (ev.event) {
    case "firm_created":
      return `${c.name ?? who}${age}`;
    case "score_completed": {
      const verdict = c.leaked ? "LEAKED SIGNABLE flagged" : "clean";
      const score = c.score != null && c.score !== "" ? `, score ${c.score}` : "";
      return `${who} — ${verdict}${score}${age}`;
    }
    case "callback_marked":
      return `${who} — ${c.status ?? "callback worked"}${c.via ? ` (${c.via})` : ""}${age}`;
    case "upload_completed":
      return `${who}${c.source ? ` — via ${c.source}` : ""}${age}`;
    case "audit_completed":
      return `${who} — audit finished${age}`;
    default:
      return `${who}${age}`;
  }
}

// Turn a batch of product events into founder-activity sections — one section
// per reportable type, newest first, capped. Non-reportable events are ignored.
// Returns [] when nothing reportable, so it contributes no email sections.
export function buildActivityDigest({
  events = [],
  firmName = (id) => `firm ${id}`,
  now = new Date(),
} = {}) {
  const byType = new Map();
  for (const ev of events) {
    if (!ACTIVITY_LABELS[ev?.event]) continue;
    if (!byType.has(ev.event)) byType.set(ev.event, []);
    byType.get(ev.event).push(ev);
  }
  const sections = [];
  for (const type of ACTIVITY_ORDER) {
    const rows = byType.get(type);
    if (!rows || rows.length === 0) continue;
    rows.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    const lines = rows.slice(0, ACTIVITY_LINE_CAP).map((ev) => activityLine(ev, { firmName, now }));
    if (rows.length > ACTIVITY_LINE_CAP) lines.push(`…and ${rows.length - ACTIVITY_LINE_CAP} more`);
    sections.push({ title: `${ACTIVITY_LABELS[type]}: ${rows.length}`, lines });
  }
  return sections;
}

// --- Stuck-alert mute (cadence safety) ----------------------------------------

// The stuck-unscored watchdog re-fires by design while an outage persists. At a
// 1-minute sweep cadence that would text every minute, so mute each firm after
// it alerts once and only re-alert every STUCK_REALERT_HOURS. `priorState` is
// the parsed alert_state map (firmId -> last-alerted ISO). Returns the firms to
// alert this sweep and the next state (recovered firms drop out).
export function selectStuckToAlert(
  stuckFirms = [],
  priorState = {},
  { now = new Date(), realertHours = STUCK_REALERT_HOURS } = {},
) {
  const nowMs = new Date(now).getTime();
  const windowMs = realertHours * 60 * 60 * 1000;
  const nextState = {};
  const toAlert = [];
  for (const s of stuckFirms) {
    const key = String(s.firm_id);
    const lastRaw = priorState[key];
    const last = lastRaw ? new Date(lastRaw).getTime() : 0;
    if (!Number.isFinite(last) || nowMs - last >= windowMs) {
      toAlert.push(s);
      nextState[key] = new Date(nowMs).toISOString();
    } else {
      nextState[key] = lastRaw; // still muted — keep the original alert stamp
    }
  }
  return { toAlert, nextState };
}

// --- The founder TEXT (material events only) ----------------------------------

// The terse SMS body from one sweep's MATERIAL events. Only the money/urgent set
// earns a text — the email carries full detail (uploads, clean scores, routine
// actions). Returns null when nothing material happened, so no text is sent.
export function buildMaterialSms({
  firmsAdded = [], // [{ name }]
  leakedFlags = 0, // leaked-signable calls scored this window
  signedCases = 0, // callback_marked with status 'signed'
  newApplications = [], // [{ firm_name }]
  healthIssues = 0, // scoring/signature/digest/stuck problems (count)
} = {}) {
  const parts = [];
  if (newApplications.length) {
    const names = newApplications.map((a) => a.firm_name).filter(Boolean).slice(0, 2).join(", ");
    parts.push(`${newApplications.length} new application${newApplications.length > 1 ? "s" : ""}${names ? ` (${names})` : ""}`);
  }
  if (firmsAdded.length) {
    const names = firmsAdded.map((f) => f.name).filter(Boolean).slice(0, 2).join(", ");
    parts.push(`+${firmsAdded.length} firm${firmsAdded.length > 1 ? "s" : ""}${names ? ` (${names})` : ""}`);
  }
  if (leakedFlags) parts.push(`${leakedFlags} leaked-signable`);
  if (signedCases) parts.push(`${signedCases} signed`);
  if (healthIssues) parts.push(`⚠ ${healthIssues} issue${healthIssues > 1 ? "s" : ""}`);
  if (parts.length === 0) return null;
  return `Intake QA: ${parts.join(" · ")}. Details emailed.`;
}

// One batched alert email from everything the sweep found. Empty sections are
// dropped; zero sections → null (send nothing). `activity` holds already-built
// founder-activity sections (buildActivityDigest); they render below the health
// sections and, when they are the ONLY content, still produce an email.
export function buildFounderAlert({
  scoringFailures = [],
  signatureFirms = [],
  digestProblems = [],
  newApplications = [],
  stuckUnscoredFirms = [],
  activity = [],
  now = new Date(),
} = {}) {
  const sections = [];
  if (stuckUnscoredFirms.length) {
    sections.push({
      title: "Calls received but never scored",
      lines: stuckUnscoredFirms.map(
        (s) =>
          `firm ${s.firm_id}: ${s.count} call(s) stuck unscored — oldest ${ageFromIso(s.oldest, now)} old (scoring pipeline may be down — check Inngest)`,
      ),
    });
  }
  if (scoringFailures.length) {
    sections.push({
      title: `Scoring failed on ${scoringFailures.length} call(s)`,
      lines: scoringFailures.map(
        (e) => `${e.created_at ?? ""} — firm ${e.firm_id ?? "?"} — ${e.message ?? ""}`,
      ),
    });
  }
  if (signatureFirms.length) {
    sections.push({
      title: "CallRail signature failures (3+ in an hour)",
      lines: signatureFirms.map(
        (s) => `firm ${s.firmId}: ${s.count} rejected webhooks in the last hour — check the firm's CallRail signing secret`,
      ),
    });
  }
  if (digestProblems.length) {
    sections.push({
      title: "Digest runs that skipped or failed",
      lines: digestProblems.map((p) => `${p.created_at ?? ""} — ${p.problem}`),
    });
  }
  if (newApplications.length) {
    sections.push({
      title: `${newApplications.length} new beta application(s)`,
      lines: newApplications.map(
        (a) => `${a.firm_name ?? "?"} — ${a.name ?? "?"} (${a.practice_area ?? "?"}, ${a.state ?? "?"}) — status ${a.status ?? "applied"}`,
      ),
    });
  }

  // Health/alert titles drive the subject; activity is appended below and, when
  // it is the only content, gets a summary subject of its own.
  const healthTitles = sections.map((s) => s.title);
  for (const s of activity) sections.push(s);
  if (sections.length === 0) return null;

  const onlyActivity = healthTitles.length === 0;
  const subject = (
    onlyActivity
      ? `Intake QA beta activity — ${activity.map((s) => s.title).join(" · ")}`
      : `Intake QA beta — ${healthTitles.join(" · ")}`
  ).slice(0, 140);
  const html = renderFounderEmail({
    heading: onlyActivity ? "Beta activity" : "Beta alerts",
    intro: onlyActivity
      ? "Activity since the last sweep. One email per sweep window — nothing else is queued."
      : `${healthTitles.length} thing(s) need your eyes${activity.length ? ", plus recent activity below" : ""}. One email per sweep window — nothing else is queued.`,
    sections,
    now,
  });
  return { subject, html, sections };
}

// --- The daily pulse -----------------------------------------------------------

// Fire the pulse exactly once per LA day, in the 8am LA hour (a cron/sweep that
// runs hourly hits this window once). `lastSentDate` is the alert_state value.
export function shouldSendDailyPulse({
  now = new Date(),
  lastSentDate = null,
  timezone = "America/Los_Angeles",
  hour = 8,
} = {}) {
  let localHour;
  let localDate;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    localHour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    localDate = `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    localHour = new Date(now).getUTCHours();
    localDate = new Date(now).toISOString().slice(0, 10);
  }
  if (localHour !== hour) return { send: false, localDate };
  if (lastSentDate === localDate) return { send: false, localDate };
  return { send: true, localDate };
}

// One line per firm: received / scored / acted in the trailing 24h.
export function buildBetaPulse({ firms = [], date, now = new Date() } = {}) {
  const lines = firms.map(
    (f) => `${f.name}: ${f.received} received / ${f.scored} scored / ${f.acted} acted on`,
  );
  const subject = `Intake QA beta pulse — ${date ?? new Date(now).toISOString().slice(0, 10)}`;
  const html = renderFounderEmail({
    heading: "Daily beta pulse",
    intro: firms.length
      ? "Last 24 hours, per firm (received / scored / acted on)."
      : "No firms onboarded yet.",
    sections: firms.length ? [{ title: "Firms", lines }] : [],
    now,
  });
  return { subject, html, lines };
}

// --- Rendering + gated delivery -------------------------------------------------

export function renderFounderEmail({ heading, intro, sections = [], now = new Date() }) {
  const blocks = sections
    .map(
      (s) => `
    <h2>${esc(s.title)}</h2>
    <ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Intake QA — ${esc(heading)}</title>
<style>
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:#1a1a1a; margin:0; background:#f4f4f5; }
  .page { max-width:680px; margin:24px auto; background:#fff; padding:28px 32px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  h1 { font-size:18px; border-bottom:2px solid #1a1a1a; padding-bottom:10px; }
  h2 { font-size:14px; margin:18px 0 6px; }
  ul { margin:0; padding-left:18px; font-size:13px; line-height:1.5; }
  .intro { font-size:14px; color:#333; }
  footer { margin-top:24px; border-top:1px solid #e2e2e2; padding-top:10px;
    font-size:11px; color:#666; text-align:center; }
</style>
</head>
<body>
<div class="page">
  <h1>Intake QA — ${esc(heading)}</h1>
  <p class="intro">${esc(intro)}</p>
  ${blocks}
  <footer>Internal founder alert · generated ${esc(new Date(now).toISOString())} · board: /studio/beta</footer>
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
  if (!to) throw new Error("FOUNDER_EMAIL is not set");
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from, to, subject, html });
  return { id: res?.data?.id ?? null };
}

// Deliver one founder email through the standard gate. No FOUNDER_EMAIL →
// skip entirely (this sender must never fall back to any other recipient).
export async function sendFounderEmail({
  subject,
  html,
  filePrefix = "founder-alert",
  mailer = defaultMailer,
  env = process.env,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
}) {
  const to = env.FOUNDER_EMAIL?.trim();
  if (!to) return { mode: "skipped", reason: "FOUNDER_EMAIL not set" };

  if (killSwitchEngaged(env) || !isEmailEnabled(env) || !env.RESEND_API_KEY) {
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
    const file = join(outDir, `${filePrefix}-${stamp}.html`);
    writeFileSync(file, html);
    console.log(`[email off] founder alert rendered to ${file} (not emailed)`);
    return { mode: "test", file };
  }
  const res = await mailer({ to, from: env.RESEND_FROM, subject, html, env });
  console.log(`Founder alert emailed to ${to} (id ${res.id})`);
  return { mode: "live", id: res.id };
}

// --- The sweep orchestrator ------------------------------------------------------

// One pass: gather triggers since the watermarks, send at most ONE alert email
// and (in the 8am LA hour) ONE pulse email, then advance the watermarks.
// Watermarks advance even in file-render mode — the file is the record, same
// rule as alerts.mjs.
export async function runAlertSweep({
  store,
  db,
  env = process.env,
  now = new Date(),
  mailer = defaultMailer,
  outDir = DEFAULT_OUT_DIR,
  listApplicants = null, // injectable for tests; default: beta/store.mjs
  smsSender = null, // injectable Twilio sender for tests; default: real Twilio
}) {
  const result = { alert: null, pulse: null, sms: null, examined: 0 };

  // ---- Errors since the id watermark (triggers a, b, c) ----
  const wmRaw = await store.getAlertState(db, WM_ERRORS).catch(() => null);
  const afterId = Number(wmRaw ?? 0) || 0;
  const errors = await store.getErrorsAfterId(db, afterId, 500).catch(() => []);
  result.examined = errors.length;

  const scoringFailures = errors.filter(isScoringFailure);
  const digestProblems = errors
    .map((row) => {
      const problem = digestRunProblem(row);
      return problem ? { created_at: row.created_at, problem } : null;
    })
    .filter(Boolean);
  // Signature counting needs the trailing HOUR, not just new rows — an attacker
  // dripping 1/sweep must still trip the threshold — so fetch the recent window
  // separately and count within it.
  const hourAgoIso = new Date(new Date(now).getTime() - SIGNATURE_FAILURE_WINDOW_MS).toISOString();
  const recentErrors = ((await store.getRecentErrors(db, 200).catch(() => [])) ?? []).filter(
    (e) => String(e.created_at ?? "") >= hourAgoIso,
  );
  const alreadyFlagged = new Set(
    String((await store.getAlertState(db, "alerts.signature_firms").catch(() => null)) ?? "")
      .split(",")
      .filter(Boolean),
  );
  // Dedupe by id — a brand-new row inside the hour appears in both reads.
  const sigRows = [...new Map([...errors, ...recentErrors].map((e) => [String(e.id), e])).values()];
  const sigAll = signatureFailureFirms(sigRows, { now });
  // Fire once per firm per ongoing incident: a firm already alerted stays
  // muted until an hour passes with no failures (the state key is rewritten
  // each sweep with the currently-tripping firms).
  const signatureFirms = sigAll.filter((s) => !alreadyFlagged.has(s.firmId));
  await store
    .setAlertState(db, "alerts.signature_firms", sigAll.map((s) => s.firmId).join(","))
    .catch(() => {});

  // ---- New beta applications since the created_at watermark (trigger d) ----
  let newApplications = [];
  try {
    const appsWm = (await store.getAlertState(db, WM_APPS).catch(() => null)) ?? "";
    let applicants = [];
    if (listApplicants) {
      applicants = await listApplicants(db);
    } else {
      const betaStore = await import("../beta/store.mjs");
      applicants = await betaStore.listBetaApplicants(db);
    }
    // pg returns Date objects, sqlite returns ISO text — normalize to ISO so
    // the string watermark comparison is dialect-proof.
    const isoOf = (v) => {
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? new Date(t).toISOString() : null;
    };
    newApplications = (applicants ?? []).filter((a) => {
      const iso = a?.created_at ? isoOf(a.created_at) : null;
      return iso && (!appsWm || iso > String(appsWm));
    });
    const maxCreated = newApplications
      .map((a) => isoOf(a.created_at))
      .filter(Boolean)
      .sort()
      .at(-1);
    if (maxCreated) await store.setAlertState(db, WM_APPS, maxCreated).catch(() => {});
  } catch {
    newApplications = []; // beta tables absent (old DB) — never break the sweep
  }

  // ---- Received-but-never-scored watchdog (trigger f) ----
  // Scoring runs entirely through Inngest (the webhook event AND the 15-min
  // "fallback" sweep are both Inngest crons), so an Inngest outage has NO
  // fallback. Surface any call stranded unscored past the threshold so it never
  // dies silently at "processing". Re-fires each window while the stall
  // persists — an ongoing outage is worth an ongoing alert.
  let stuckUnscoredFirms = [];
  try {
    const stuckHours = Number(env.STUCK_SCORING_HOURS) || STUCK_SCORING_HOURS;
    const cutoffIso = new Date(new Date(now).getTime() - stuckHours * 60 * 60 * 1000).toISOString();
    stuckUnscoredFirms = (await store.stuckUnscoredCalls(db, cutoffIso).catch(() => [])) ?? [];
  } catch {
    stuckUnscoredFirms = []; // never break the sweep on an older DB shape
  }

  // ---- Founder-activity digest: every new firm/upload/score/intake action ----
  // Reads the product-event log since its own id watermark and turns the
  // reportable events into email sections. IDs/counts only — never PII. The
  // watermark advances after the send (below), alongside the error watermark.
  // The SAME events feed the material-SMS extract (firms added / leaked-signable
  // flagged / cases signed) — the money set that earns a text.
  let afterEventId = 0;
  let maxEventId = 0;
  let activity = [];
  let firmsAdded = [];
  let leakedFlags = 0;
  let signedCases = 0;
  try {
    const evWmRaw = await store.getAlertState(db, WM_EVENTS).catch(() => null);
    afterEventId = Number(evWmRaw ?? 0) || 0;
    const events = (await store.getEventsAfterId(db, afterEventId, 1000).catch(() => [])) ?? [];
    maxEventId = events.reduce((m, e) => Math.max(m, Number(e.id) || 0), afterEventId);
    if (events.length) {
      const firms = (await store.listFirms(db).catch(() => [])) ?? [];
      const nameById = new Map((firms ?? []).map((f) => [String(f.id), f.name]));
      const firmName = (id) => nameById.get(String(id)) ?? `firm ${id}`;
      activity = buildActivityDigest({ events, firmName, now });
      firmsAdded = events
        .filter((e) => e.event === "firm_created")
        .map((e) => ({ name: parseContext(e.context).name ?? firmName(e.firm_id) }));
      leakedFlags = events.filter(
        (e) => e.event === "score_completed" && parseContext(e.context).leaked,
      ).length;
      signedCases = events.filter(
        (e) => e.event === "callback_marked" && parseContext(e.context).status === "signed",
      ).length;
    }
  } catch {
    activity = []; // events table absent (older DB) — never break the sweep
  }

  // ---- Stuck-alert mute so a 1-minute cadence doesn't text every minute ----
  let stuckState = {};
  try {
    stuckState =
      JSON.parse((await store.getAlertState(db, WM_STUCK).catch(() => null)) ?? "{}") || {};
  } catch {
    stuckState = {};
  }
  const { toAlert: stuckToAlert, nextState: stuckNext } = selectStuckToAlert(
    stuckUnscoredFirms,
    stuckState,
    { now },
  );
  await store.setAlertState(db, WM_STUCK, JSON.stringify(stuckNext)).catch(() => {});

  // ---- Send the batched alert (one email max) ----
  const alert = buildFounderAlert({
    scoringFailures,
    signatureFirms,
    digestProblems,
    newApplications,
    stuckUnscoredFirms: stuckToAlert,
    activity,
    now,
  });
  if (alert) {
    result.alert = await sendFounderEmail({
      subject: alert.subject,
      html: alert.html,
      filePrefix: "founder-alert",
      mailer,
      env,
      outDir,
      now,
    });
    result.alert.sections = alert.sections.length;
  }

  // ---- The material TEXT (money/urgent events only) ----
  // Email carries everything; the phone only buzzes for the material set. Fully
  // gated + best-effort inside sendFounderSms (off until FOUNDER_SMS_ENABLED +
  // Twilio creds + FOUNDER_PHONE, KILL_SWITCH halts it). null body → no text.
  const smsBody = buildMaterialSms({
    firmsAdded,
    leakedFlags,
    signedCases,
    newApplications,
    healthIssues:
      scoringFailures.length + signatureFirms.length + digestProblems.length + stuckToAlert.length,
  });
  if (smsBody) {
    result.sms = await sendFounderSms({ body: smsBody, env, ...(smsSender ? { sender: smsSender } : {}) });
  }

  // Advance the error watermark to the newest row examined (even when nothing
  // triggered — examined is examined).
  const maxId = errors.reduce((m, e) => Math.max(m, Number(e.id) || 0), afterId);
  if (maxId > afterId) await store.setAlertState(db, WM_ERRORS, String(maxId)).catch(() => {});

  // Advance the activity watermark to the newest event examined — same "examined
  // is examined" rule, so noise events (page views) also move the cursor and are
  // never re-scanned. Only after the send, so a send failure re-reports next time.
  if (maxEventId > afterEventId) {
    await store.setAlertState(db, WM_EVENTS, String(maxEventId)).catch(() => {});
  }

  // ---- Daily 8am LA pulse (trigger e) ----
  const lastPulse = await store.getAlertState(db, WM_PULSE).catch(() => null);
  const pulseCheck = shouldSendDailyPulse({ now, lastSentDate: lastPulse });
  if (pulseCheck.send) {
    const dayAgoIso = new Date(new Date(now).getTime() - 24 * 3600_000).toISOString();
    const firms = await store.listFirms(db).catch(() => []);
    const perFirm = [];
    for (const f of firms ?? []) {
      let counts = { received: 0, scored: 0, failed: 0 };
      let acted = 0;
      try {
        counts = await store.callCountsSince(db, f.id, dayAgoIso);
      } catch { /* table shape older than 0014 — zeros are honest */ }
      try {
        acted = await store.countEvents(db, {
          event: "callback_marked",
          firm_id: f.id,
          sinceIso: dayAgoIso,
        });
      } catch { /* events table not migrated yet */ }
      perFirm.push({ name: f.name, received: counts.received, scored: counts.scored, acted });
    }
    const pulse = buildBetaPulse({ firms: perFirm, date: pulseCheck.localDate, now });
    result.pulse = await sendFounderEmail({
      subject: pulse.subject,
      html: pulse.html,
      filePrefix: "beta-pulse",
      mailer,
      env,
      outDir,
      now,
    });
    if (result.pulse.mode !== "skipped") {
      await store.setAlertState(db, WM_PULSE, pulseCheck.localDate).catch(() => {});
    }
  }

  return result;
}
