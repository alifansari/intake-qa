#!/usr/bin/env node
// Orchestrator.
//   node score.js <audiofile>   -> transcript.json, score.json, report.html
//   node score.js <folder>      -> the above for every audio file + summary.html
//
// Runs transcription (AssemblyAI) -> scoring (Claude) -> HTML report.
// Reads keys from .env (no external dotenv dependency).

import {
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { transcribeFile } from "./lib/transcribe.js";
import { scoreCall } from "./lib/score-call.js";
import { writeReport, renderSummary } from "./lib/report.js";
import { writeFileSync } from "node:fs";

const ROOT = new URL(".", import.meta.url).pathname;
const OUTPUT_DIR = join(ROOT, "output");
const DEFAULT_CONFIG = join(ROOT, "config", "test-firm.md");
const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav"]);

// Minimal .env loader: KEY=VALUE lines, ignores blanks/#comments.
function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

function firmNameFromConfig(configPath) {
  try {
    const m = readFileSync(configPath, "utf8").match(/firm_name:\s*(.+)/i);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

// Runs the full pipeline for a single audio file. Returns a summary row.
async function processOne(audioPath, configPath, firmName) {
  const name = basename(audioPath, extname(audioPath));
  const transcriptPath = join(OUTPUT_DIR, `${name}.transcript.json`);
  const scorePath = join(OUTPUT_DIR, `${name}.score.json`);
  const rawPath = join(OUTPUT_DIR, `${name}.score.raw.txt`);
  const reportPath = join(OUTPUT_DIR, `${name}.report.html`);

  console.log(`\n=== ${name} ===`);
  console.log("1/3 Transcribing (~$0.05, depends on call length)...");
  const transcript = await transcribeFile(audioPath, transcriptPath, configPath);
  if (transcript.role_confidence === "low") {
    console.log(
      "    NOTE: speaker roles were assigned with LOW confidence — check the transcript's INTAKE/CALLER labels."
    );
  }

  console.log("2/3 Scoring with Claude (~$0.30 first call, less after caching)...");
  const score = await scoreCall({
    transcript: transcript.formatted_transcript,
    callId: name,
    firmConfigPath: configPath,
    outPath: scorePath,
    rawOutPath: rawPath,
  });

  console.log("3/3 Building report...");
  writeReport(score, reportPath, { firmName });
  console.log(`    Report: ${reportPath}`);

  const alerts = [];
  const a = score.alerts || {};
  if (a.lost_signable_case) alerts.push("lost_signable_case");
  if (a.missed_development_opportunity) alerts.push("missed_dev_opp");
  if (a.after_hours_leak) alerts.push("after_hours_leak");
  if ((score.critical_fails || []).length) alerts.push("critical_fail");

  return {
    name,
    reportFile: `${name}.report.html`,
    call_type: score.call_type,
    overall: score.scores && score.scores.overall,
    band: score.scores && score.scores.band,
    alerts,
    revenue_at_risk:
      (a.revenue_at_risk && a.revenue_at_risk.amount_usd) || 0,
  };
}

async function main() {
  loadEnv();
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node score.js <audiofile | folder>");
    process.exit(1);
  }
  if (!existsSync(target)) {
    console.error(`Not found: ${target}`);
    process.exit(1);
  }
  if (!existsSync(DEFAULT_CONFIG)) {
    console.error(`Missing firm config: ${DEFAULT_CONFIG}`);
    process.exit(1);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const firmName = firmNameFromConfig(DEFAULT_CONFIG);

  const isDir = statSync(target).isDirectory();
  if (!isDir) {
    await processOne(target, DEFAULT_CONFIG, firmName);
    console.log("\nDone. Open the .report.html file in your browser.");
    return;
  }

  const files = readdirSync(target)
    .filter((f) => AUDIO_EXTS.has(extname(f).toLowerCase()))
    .map((f) => join(target, f))
    .sort();

  if (files.length === 0) {
    console.error(`No audio files (.mp3/.m4a/.wav) in ${target}`);
    process.exit(1);
  }

  const rows = [];
  for (const f of files) {
    try {
      rows.push(await processOne(f, DEFAULT_CONFIG, firmName));
    } catch (e) {
      console.error(`    FAILED on ${f}: ${e.message}`);
    }
  }

  const summaryPath = join(OUTPUT_DIR, "summary.html");
  writeFileSync(summaryPath, renderSummary(rows));
  const total = rows.reduce((s, r) => s + (r.revenue_at_risk || 0), 0);
  console.log(`\nProcessed ${rows.length} call(s).`);
  console.log(`Total estimated fees at risk: $${total.toLocaleString("en-US")}`);
  console.log(`Summary: ${summaryPath}`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
