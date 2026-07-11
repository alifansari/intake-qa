// scoring-v2/lib/parse.mjs — pure text/JSON parsing helpers. No I/O.

// Extract the first complete, balanced top-level JSON object at or after
// `fromIndex`. Handles strings and escapes. Returns the raw substring or null.
export function extractJsonObject(text, fromIndex = 0) {
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

// Split a model response into { analysis, json } — free-text <analysis> block
// first, one JSON object after. Tolerates a missing analysis block and
// markdown fences. Returns { analysis: string, parsed: object|null }.
export function parseModelResponse(text) {
  let analysis = "";
  let rest = text;
  const open = text.indexOf("<analysis>");
  const close = text.indexOf("</analysis>");
  if (open !== -1 && close > open) {
    analysis = text.slice(open + "<analysis>".length, close).trim();
    rest = text.slice(close + "</analysis>".length);
  }
  const raw = extractJsonObject(rest);
  if (!raw) return { analysis, parsed: null };
  try {
    return { analysis, parsed: JSON.parse(raw) };
  } catch {
    return { analysis, parsed: null };
  }
}

// Pull a section of a document between two markers (marker line included in
// neither). endMarker null = to end of text.
export function section(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker);
  if (s === -1) return "";
  const from = s + startMarker.length;
  const e = endMarker ? text.indexOf(endMarker, from) : -1;
  return text.slice(from, e === -1 ? text.length : e).trim();
}
