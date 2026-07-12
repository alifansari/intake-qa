// scoring-v2/lib/golds.mjs — loads the six gold examples in PINNED order and
// builds the few-shot block. The expected-pipeline-verdict and calibration
// blocks are stripped: they are harness/test material and are NEVER shown to
// the model (the LLM sees analysis + facts + reads only).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractJsonObject, section } from "./parse.mjs";

// Pinned order — calibration state. Keep in sync with golds/ORDER.md.
export const GOLD_ORDER = Object.freeze([
  "gold-1.md",
  "gold-2.md",
  "gold-3.md",
  "gold-4.md",
  "gold-5.md",
  "gold-6.md",
]);

const M_CONFIG = "FIRM CONFIG (PART A)";
const M_TRANSCRIPT = "TRANSCRIPT";
const M_GOLD = "GOLD-STANDARD OUTPUT";
const M_EXPECTED = "EXPECTED PIPELINE VERDICT";
const M_NOTES = "CALIBRATION NOTES";

// Parse one gold file into its parts.
export function parseGold(text) {
  const partA = section(text, M_CONFIG, M_TRANSCRIPT);
  const transcript = section(text, M_TRANSCRIPT, M_GOLD);
  const goldOutput = section(text, M_GOLD, M_EXPECTED); // <analysis> + JSON
  const expectedStart = text.indexOf(M_EXPECTED);
  const notesStart = text.indexOf(M_NOTES);
  const expectedRegion =
    expectedStart === -1
      ? ""
      : text.slice(expectedStart, notesStart === -1 ? text.length : notesStart);
  const expectedRaw = extractJsonObject(expectedRegion);
  return {
    partA,
    transcript,
    goldOutput,
    expectedVerdict: expectedRaw ? JSON.parse(expectedRaw) : null,
  };
}

export function loadGold(goldsDir, filename) {
  return parseGold(readFileSync(join(goldsDir, filename), "utf8"));
}

// One worked example block for the user message. Mirrors v1's delimited
// format so the model sees input → correct output pairs.
export function buildGoldBlock(gold, n) {
  return [
    `===== WORKED EXAMPLE ${n} =====`,
    `[FIRM CONFIG — PART A]`,
    gold.partA,
    ``,
    `[TRANSCRIPT]`,
    gold.transcript,
    ``,
    `[CORRECT OUTPUT — analyze this call to produce exactly this]`,
    gold.goldOutput,
    `===== END WORKED EXAMPLE ${n} =====`,
  ].join("\n");
}

// The full pinned few-shot block (all six, in order).
export function buildAllGoldBlocks(goldsDir) {
  return GOLD_ORDER.map((f, i) => buildGoldBlock(loadGold(goldsDir, f), i + 1)).join(
    "\n\n"
  );
}
