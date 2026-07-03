// Parses a gold-example .md file into a clean "worked example" block for
// few-shot anchoring: the FIRM CONFIG + TRANSCRIPT it was scored against
// (the input) paired with the GOLD-STANDARD OUTPUT JSON (the correct output).
// The calibration notes at the bottom of each file are intentionally dropped —
// the model should learn from the input->output mapping, not the founder notes.

import { readFileSync } from "node:fs";

// Extract the first complete top-level JSON object starting at `fromIndex`.
function extractJsonObject(text, fromIndex) {
  const start = text.indexOf("{", fromIndex);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      continue;
    }
    if (c === '"') inString = !inString;
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function section(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker);
  if (s === -1) return "";
  const from = s + startMarker.length;
  const e = endMarker ? text.indexOf(endMarker, from) : text.length;
  return text.slice(from, e === -1 ? text.length : e).trim();
}

// Returns { firmConfig, transcript, goldJson } as strings.
export function parseGoldExample(path) {
  const text = readFileSync(path, "utf8");
  const firmConfig = section(text, "FIRM CONFIG", "TRANSCRIPT");
  const transcript = section(text, "TRANSCRIPT", "GOLD-STANDARD OUTPUT");
  const goldStart = text.indexOf("GOLD-STANDARD OUTPUT");
  const goldJson = extractJsonObject(text, goldStart === -1 ? 0 : goldStart);
  return { firmConfig, transcript, goldJson };
}

// Builds the delimited worked-example text used in the user message.
export function buildExampleBlock(path, n) {
  const { firmConfig, transcript, goldJson } = parseGoldExample(path);
  return [
    `===== WORKED EXAMPLE ${n} =====`,
    `[FIRM CONFIG]`,
    firmConfig,
    ``,
    `[TRANSCRIPT]`,
    transcript,
    ``,
    `[CORRECT OUTPUT — score this call to produce exactly this JSON]`,
    goldJson,
    `===== END WORKED EXAMPLE ${n} =====`,
  ].join("\n");
}
