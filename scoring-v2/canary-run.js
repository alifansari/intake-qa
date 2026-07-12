#!/usr/bin/env node
// scoring-v2/canary-run.js — score the canary set live and compare the
// CODE-LAYER outputs against the pinned baseline (canaries/expected.json).
//
//   node scoring-v2/canary-run.js              # run all 7, compare, exit 1 on drift
//   node scoring-v2/canary-run.js c4 c7        # run a subset
//   node scoring-v2/canary-run.js --pin        # (re)write expected.json from this run
//                                              #   — a CALIBRATION CHANGE; decisions-log entry required
//   node scoring-v2/canary-run.js --json out.json   # also dump full snapshots
//
// The baseline pins outcomes, not wordings: gates fired, recommended
// disposition, value tier, confidence tier, abstained, attorney-review flag,
// MIST flag, urgency flags. Extraction rephrasing does not trip it; outcome
// drift does. Protocol: canaries/README.md.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreV2, loadEnv } from "./score-v2.js";

const PKG_ROOT = fileURLToPath(new URL(".", import.meta.url));
const CANARY_DIR = join(PKG_ROOT, "canaries");
const EXPECTED_PATH = join(CANARY_DIR, "expected.json");

// The code-layer snapshot a canary pins. Every field is a deterministic
// output of gates/decision-table/confidence over the extraction.
export function snapshotVerdict(v) {
  return {
    gates: {
      g1_underwater: v.gates.g1_underwater.fired,
      g2_deadline_trap: v.gates.g2_deadline_trap.fired,
      g3_client_risk: v.gates.g3_client_risk.fired,
      g4_trial_capital: v.gates.g4_trial_capital.fired,
    },
    // Abstained verdicts withhold the disposition — null is the pinned value.
    recommended_disposition: v.recommendation.recommended_disposition ?? null,
    value_tier: v.tiers.value_tier,
    confidence_tier: v.confidence.tier,
    abstained: v.abstained,
    attorney_review_required:
      v.abstained || v.recommendation.attorney_review_required === true,
    mist_flag: v.recommendation.mist_flag === true,
    urgency_flags: v.gates.g2_deadline_trap.flags || [],
  };
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === "object" && !Array.isArray(val))
      Object.assign(out, flatten(val, key));
    else out[key] = Array.isArray(val) ? val.join("|") : val;
  }
  return out;
}

// urgency_flags is the one extraction-ADJACENT field in the snapshot: WHICH
// of G2's three signals the model marks present wobbles on inference-rich
// profiles (observed on c6: perishable_evidence present in 1 of 2 live runs
// while the gate itself fired identically). The pinned flags are therefore a
// REQUIRED SUBSET: a pinned flag going missing is DRIFT; an extra inferred
// flag is a WARN, not a failure. Non-G2 canaries lose nothing — any urgency
// flag appearing at all flips gates.g2_deadline_trap, which is exact-matched.
export function diffSnapshots(expected, actual) {
  const e = flatten(expected);
  const a = flatten(actual);
  const diffs = [];
  const warns = [];
  const eFlags = expected.urgency_flags || [];
  const aFlags = actual.urgency_flags || [];
  delete e.urgency_flags;
  delete a.urgency_flags;
  for (const k of new Set([...Object.keys(e), ...Object.keys(a)])) {
    if (e[k] !== a[k]) diffs.push({ field: k, expected: e[k], actual: a[k] });
  }
  for (const f of eFlags)
    if (!aFlags.includes(f))
      diffs.push({ field: `urgency_flags[${f}]`, expected: "present", actual: "missing" });
  for (const f of aFlags)
    if (!eFlags.includes(f))
      warns.push(`urgency_flags extra (inference wobble, not pinned): ${f}`);
  return Object.assign(diffs, { warns });
}

function canaryFiles() {
  return readdirSync(CANARY_DIR)
    .filter((f) => /^c\d+.*\.txt$/.test(f))
    .sort((x, y) =>
      Number(x.match(/^c(\d+)/)[1]) - Number(y.match(/^c(\d+)/)[1])
    );
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const pin = args.includes("--pin");
  const jsonIdx = args.indexOf("--json");
  const jsonOut = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
  const only = args.filter((a, i) => !a.startsWith("--") && i !== jsonIdx + 1);

  let files = canaryFiles();
  if (only.length)
    files = files.filter((f) => only.some((id) => f.startsWith(`${id}-`) || f === `${id}.txt`));
  if (!files.length) {
    console.error("No canary transcripts matched.");
    process.exit(1);
  }

  let expected = {};
  if (!pin) {
    try {
      expected = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    } catch {
      console.error(
        `No baseline at ${EXPECTED_PATH}. Run with --pin to create it (calibration change).`
      );
      process.exit(1);
    }
  }

  const snapshots = {};
  const fullVerdicts = {};
  let drifted = 0;

  for (const file of files) {
    const id = file.match(/^(c\d+)/)[1];
    const transcript = readFileSync(join(CANARY_DIR, file), "utf8");
    // Per-canary firm config (e.g. c6 needs government-entity work ACCEPTED
    // so R8 — not R1 case-type fit — is the path under test). Default: the
    // template config, same as the golds were calibrated against.
    const sidecar = join(CANARY_DIR, `${id}-config.md`);
    const opts = existsSync(sidecar) ? { firmConfigPath: sidecar } : {};
    process.stdout.write(`${id} (${file}) ... `);
    const verdict = await scoreV2({ transcript, callId: `canary-${id}`, ...opts });
    const snap = snapshotVerdict(verdict);
    snapshots[id] = snap;
    fullVerdicts[id] = verdict;

    if (pin) {
      console.log(
        `pinned: ${snap.recommended_disposition ?? "WITHHELD"} · ${snap.value_tier} · conf ${snap.confidence_tier}` +
          `${snap.abstained ? " · ABSTAINED" : ""}` +
          `${Object.entries(snap.gates).filter(([, f]) => f).map(([g]) => ` · ${g}`).join("")}`
      );
      continue;
    }
    if (!expected[id]) {
      console.log("DRIFT — no pinned baseline for this canary");
      drifted++;
      continue;
    }
    const diffs = diffSnapshots(expected[id], snap);
    if (diffs.length === 0) {
      console.log(diffs.warns.length ? "PASS (with warns)" : "PASS");
    } else {
      drifted++;
      console.log("DRIFT");
      for (const d of diffs)
        console.log(`    ${d.field}: expected ${d.expected} — got ${d.actual}`);
    }
    for (const w of diffs.warns || []) console.log(`    WARN ${w}`);
  }

  if (pin) {
    // Preserve baselines for canaries not in this (subset) run.
    let prior = {};
    try {
      prior = JSON.parse(readFileSync(EXPECTED_PATH, "utf8"));
    } catch {}
    const merged = { ...prior, ...snapshots };
    writeFileSync(EXPECTED_PATH, JSON.stringify(merged, null, 2) + "\n");
    console.log(`\nBaseline written: ${EXPECTED_PATH}`);
    console.log(
      "Pinning is a calibration change — record it in ops/decisions.md."
    );
  } else {
    console.log(
      `\n${files.length - drifted}/${files.length} PASS` +
        (drifted ? ` — ${drifted} DRIFT` : "")
    );
  }
  if (jsonOut)
    writeFileSync(jsonOut, JSON.stringify({ snapshots, fullVerdicts }, null, 2));
  process.exit(drifted > 0 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => {
    console.error(`\nError: ${e.message}`);
    process.exit(1);
  });
}
