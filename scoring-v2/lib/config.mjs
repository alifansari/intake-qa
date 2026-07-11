// scoring-v2/lib/config.mjs — firm-config splitting (PART A vs PART B) and a
// minimal two-level YAML parser for PART B. Pure functions, no I/O.
//
// PART A is prompt-visible fact text. PART B is code-side configuration and
// NEVER enters the prompt — the wall between them is enforced here: the
// harness only ever sends `splitFirmConfig(...).partA`.

import { section } from "./parse.mjs";

export const PART_A_BEGIN = "<!-- PART A: BEGIN";
export const PART_A_END = "<!-- PART A: END -->";
export const PART_B_BEGIN = "<!-- PART B: BEGIN";
export const PART_B_END = "<!-- PART B: END -->";

export function splitFirmConfig(text) {
  const partARaw = section(text, PART_A_BEGIN, PART_A_END);
  const partBRaw = section(text, PART_B_BEGIN, PART_B_END);
  // PART A: drop the trailing "-->" of the begin-marker comment line.
  const partA = partARaw.replace(/^[^\n]*-->\s*/, "").trim();
  // PART B: pull the fenced yaml block.
  const fence = partBRaw.match(/```yaml\n([\s\S]*?)```/);
  const partBYaml = fence ? fence[1] : "";
  return { partA, partBYaml };
}

// Minimal YAML subset parser: `key: value` plus ONE nesting level of maps
// (two-space indent). Values: true/false, integers, plain strings. Comments
// (#) and blank lines ignored. Deliberately tiny — PART B is ours to shape.
export function parsePartB(yamlText) {
  const out = {};
  let currentMap = null;
  for (const rawLine of yamlText.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    const indented = /^\s{2,}/.test(line);
    const m = line.trim().match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, valueRaw] = m;
    if (!indented) {
      if (valueRaw === "") {
        out[key] = {};
        currentMap = out[key];
      } else {
        out[key] = coerce(valueRaw);
        currentMap = null;
      }
    } else if (currentMap) {
      if (valueRaw === "") continue; // deeper nesting unsupported by design
      currentMap[key] = coerce(valueRaw);
    }
  }
  return out;
}

function coerce(v) {
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  return t;
}

// Defaults + normalization so downstream code never branches on undefined.
export function normalizeConfig(raw = {}) {
  return {
    posture_default: raw.posture_default === "volume" ? "volume" : "selective",
    posture_by_case_type: raw.posture_by_case_type || {},
    develop_thin_threshold: Number.isInteger(raw.develop_thin_threshold)
      ? raw.develop_thin_threshold
      : 2,
    thin_threshold_by_case_type: raw.thin_threshold_by_case_type || {},
    trial_capital: raw.trial_capital === true,
    capital_budget_tier: ["minimal", "moderate", "deep"].includes(
      raw.capital_budget_tier
    )
      ? raw.capital_budget_tier
      : "moderate",
    mist_handling: ["develop", "decline", "sign"].includes(raw.mist_handling)
      ? raw.mist_handling
      : "develop",
  };
}

export function postureFor(config, caseType) {
  return config.posture_by_case_type[caseType] || config.posture_default;
}

export function thinThresholdFor(config, caseType) {
  const t = config.thin_threshold_by_case_type[caseType];
  return Number.isInteger(t) ? t : config.develop_thin_threshold;
}
