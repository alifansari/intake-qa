#!/usr/bin/env node
// scoring-v2/compare-v1-v2.js — score the SAME transcript through v1 (frozen
// engine, reused by import, untouched) and v2 (this package), print a
// side-by-side. Phase-1 validation tooling (objective-spec §5).
//
//   node scoring-v2/compare-v1-v2.js <transcript.txt | x.transcript.json | --fixture>
//     [--v1-config config/test-firm.md] [--v2-config scoring-v2/firm-config-template.md]

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
// v1 engine — imported AS-IS from the frozen track. Never modified.
import { scoreCall } from "../lib/score-call.js";
import { scoreV2, resolveTranscript, loadEnv, MODEL } from "./score-v2.js";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_DIR = join(REPO_ROOT, "output");
const DEFAULT_V1_CONFIG = join(REPO_ROOT, "config", "test-firm.md");
const DEFAULT_V2_CONFIG = join(REPO_ROOT, "scoring-v2", "firm-config-template.md");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

function pad(s, w) {
  s = String(s == null ? "—" : s);
  return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
}

function row(label, v1, v2) {
  console.log(`  ${pad(label, 26)} ${pad(v1, 34)} ${pad(v2, 46)}`);
}

async function main() {
  loadEnv();
  const flags = new Set(["--v1-config", "--v2-config"]);
  const positional = process.argv
    .slice(2)
    .filter((a, i, arr) => !flags.has(a) && !flags.has(arr[i - 1]));
  const target = positional[0];
  if (!target) {
    console.error(
      "Usage: node scoring-v2/compare-v1-v2.js <transcript | --fixture> [--v1-config p] [--v2-config p]"
    );
    process.exit(1);
  }
  const v1Config = arg("--v1-config", DEFAULT_V1_CONFIG);
  const v2Config = arg("--v2-config", DEFAULT_V2_CONFIG);

  const { transcript, callId } = await resolveTranscript(target, v1Config);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Comparing v1 vs v2 on ${callId} (model ${MODEL}, temp 0)...\n`);
  const [v1, v2] = await Promise.all([
    scoreCall({
      transcript,
      callId: `${callId}-compare`,
      firmConfigPath: v1Config,
      outPath: join(OUTPUT_DIR, `${callId}.compare.v1.score.json`),
      rawOutPath: join(OUTPUT_DIR, `${callId}.compare.v1.raw.txt`),
    }),
    scoreV2({ transcript, callId, firmConfigPath: v2Config }),
  ]);

  const a1 = v1.alerts || {};
  const v1Alerts = Object.entries(a1)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  const rec = v2.recommendation || {};
  const gatesFired = Object.entries(v2.gates)
    .filter(([k, g]) => k.startsWith("g") && g.fired)
    .map(([k]) => k);
  const dimLine = Object.entries(v2.dimension_reads)
    .map(([k, d]) => `${k.split("_")[0]}:${d.level}`)
    .join(" ");

  console.log(`  ${pad("", 26)} ${pad("V1 (frozen, serving beta)", 34)} ${pad("V2 (scoring-v2, staged)", 46)}`);
  console.log("  " + "-".repeat(106));
  row("headline", `overall ${v1.scores?.overall} (${v1.scores?.band})`, v2.abstained ? "ABSTAINED → attorney review" : `recommend ${rec.recommended_disposition}`);
  row("case view", `signability: ${v1.case_signability}`, dimLine);
  row("value", a1.revenue_at_risk ? `revenue_at_risk $${a1.revenue_at_risk.amount_usd}` : "no dollar output", `value tier: ${v2.tiers.value_tier} (tiers only, no dollars)`);
  row("effort/carry/capital", "—", `${v2.tiers.effort_tier} / ${v2.tiers.carry_tier} / ${v2.tiers.capital_tier}`);
  row("alerts / gates", v1Alerts.length ? v1Alerts.join(", ") : "none", gatesFired.length ? `gates fired: ${gatesFired.join(", ")}` : "no gates fired");
  row("urgency", "—", (rec.urgency_flags || []).join(", ") || "none");
  row("confidence", v1.scores?.confidence, `${v2.confidence.tier}${v2.abstained ? " (abstained)" : ""}`);
  row("critical fails", (v1.critical_fails || []).length, rec.attorney_review_required ? "attorney_review_required" : "—");
  console.log("  " + "-".repeat(106));
  console.log(
    `\n  v2 basis: ${(rec.disposition_basis || rec.reasons || []).join(" · ") || "—"}`
  );
  if (rec.refer_comparison)
    console.log(
      `  refer-out comparison: likely per-hour winner = ${rec.refer_comparison.likely_per_hour_winner} (tier comparison, attorney ratifies)`
    );
  console.log(
    `\n  Note: v1 scores REP BEHAVIOR (0–100) with a dollar flag; v2 recommends a CASE disposition in tiers.`
  );
  console.log(`  Both outputs are decision support — a licensed attorney ratifies every disposition.`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
