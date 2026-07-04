// Loader for the attorney-approved SMS templates (config/message-templates.md).
// Parses the "=== TEMPLATE id=... | name=... ===" delimited blocks into records.
// The constraints header above the first delimiter is intentionally ignored —
// it documents rules for humans; the code enforces them in draft.mjs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve via dirname+join (NOT `new URL(<literal>, import.meta.url)`) so the
// Next/Turbopack bundler doesn't try to treat the .md file as a bundled asset
// when this module is pulled into the inbound webhook route. Same path at runtime.
export const DEFAULT_TEMPLATES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../config/message-templates.md"
);

const HEADER = /^===\s*TEMPLATE\s+id=([^\s|]+)\s*\|\s*name=(.+?)\s*===$/;

// Returns [{ id, name, body }]. Bodies are trimmed; placeholders left intact.
export function loadTemplates(path = DEFAULT_TEMPLATES_PATH) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const templates = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(HEADER);
    if (m) {
      if (current) templates.push(finalize(current));
      current = { id: m[1], name: m[2].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) templates.push(finalize(current));
  return templates;
}

function finalize(t) {
  return { id: t.id, name: t.name, body: t.bodyLines.join("\n").trim() };
}

// Convenience: fetch one template by id (or the first if id omitted).
export function getTemplate(id, path = DEFAULT_TEMPLATES_PATH) {
  const all = loadTemplates(path);
  if (!id) return all[0];
  const found = all.find((t) => t.id === id);
  if (!found) throw new Error(`Template not found: ${id}`);
  return found;
}
