// Onboarding: message-template pack — parse, validate, version.
//
// A "pack" is the firm's editable set of first-contact SMS templates. It uses
// the SAME "=== TEMPLATE id=... | name=... ===" format as templates.mjs, but
// operates on TEXT (the wizard's textarea) rather than a file. Validation reuses
// the compliance guard from messaging/draft.mjs so the wizard can only accept a
// pack that would actually pass the send chokepoint's rules — the constraints
// are enforced in code, not left to the operator to remember.
//
// This is pure logic (no I/O, no network); the DB versioning + persistence lives
// in ingest/db.mjs (saveTemplateVersion). Tested in tests/onboard.test.mjs.

import { validateDraft, fillTemplate, MAX_SMS_CHARS } from "../messaging/draft.mjs";

export { MAX_SMS_CHARS };

const HEADER = /^===\s*TEMPLATE\s+id=([^\s|]+)\s*\|\s*name=(.+?)\s*===$/;

// Parse pack text into [{ id, name, body }]. Any preamble before the first
// delimiter is ignored (it is human-facing documentation, like templates.mjs).
export function parseTemplatePack(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const out = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(HEADER);
    if (m) {
      if (current) out.push(finalize(current));
      current = { id: m[1], name: m[2].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) out.push(finalize(current));
  return out;
}

function finalize(t) {
  return { id: t.id, name: t.name, body: t.bodyLines.join("\n").trim() };
}

// Validate a whole pack for a given firm. Every template is checked with the
// caller placeholder filled by a representative first name, so the character
// count + opt-out + firm-name + banned-content rules match a real first send.
// Returns { valid, results: [{ id, name, errors[] }], packErrors[] }.
/** @param {string} text @param {{ firmName?: string | null }} [opts] */
export function validateTemplatePack(text, { firmName = null } = {}) {
  const templates = parseTemplatePack(text);
  const packErrors = [];
  if (templates.length === 0) packErrors.push("no templates found");

  const seen = new Set();
  const results = templates.map((t) => {
    const errors = [];
    if (seen.has(t.id)) errors.push(`duplicate template id "${t.id}"`);
    seen.add(t.id);
    // Fill placeholders as a real first message would, then run the SAME guard
    // used at draft time (opt-out required, firm named, length, no advice).
    const filled = fillTemplate(t.body, { firmName, firstName: "there" });
    for (const e of validateDraft(filled, { firstMessage: true, firmName })) {
      errors.push(e);
    }
    return { id: t.id, name: t.name, errors };
  });

  const valid = packErrors.length === 0 && results.every((r) => r.errors.length === 0);
  return { valid, results, packErrors, count: templates.length };
}

// Version numbering is monotonic per firm: the next pack is the previous top
// version + 1 (first pack is version 1). Pure so it is trivially testable.
export function nextVersion(currentVersion) {
  const n = Number(currentVersion);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) + 1 : 1;
}
