// Practice-area ruleset registry (module 2 architecture requirement).
//
// The scoring layer must not hardcode PI assumptions. A ruleset is a frozen
// config object describing WHAT to score for a practice area; the calibrated
// engine (scoring/ — FROZEN, do not edit) stays the scorer for the shipped
// california-pi ruleset. Other rulesets (employment, business, immigration)
// get a clean slot here but are intentionally NOT built, and non-PI firms are
// NOT admitted to the beta (web/beta/applicants.mjs waitlists them).
//
// Ruleset shape (every ruleset module must export `ruleset` matching this):
//   {
//     key:          'california-pi',
//     displayName:  string,
//     version:      number,
//     active:       boolean,        // only california-pi ships active
//     caseSignals:  [{ key, label, description }],   // case-quality dimensions
//     handlingSignals: [{ key, label, description }],// staff-handling dimensions
//     redFlags:     [{ key, label }],
//     tunables:     { ... defaults a firm may override (see mergeTunables) },
//     engine:       { systemPromptPath, goldExamplesOrder }  // scoring plug
//   }

import { ruleset as californiaPi } from "./california-pi.mjs";
import { getFirmRulesetOverrides, parseJson } from "../beta/store.mjs";

const REGISTRY = new Map([[californiaPi.key, californiaPi]]);

export function getRuleset(key) {
  const ruleset = REGISTRY.get(key);
  if (!ruleset) throw new Error(`unknown practice-area ruleset: ${key}`);
  return ruleset;
}

export function listRulesets() {
  return [...REGISTRY.values()];
}

export function listActiveRulesets() {
  return listRulesets().filter((r) => r.active);
}

// Deep-merge a firm's overrides over the ruleset's tunable defaults. Only keys
// that exist in the ruleset's tunables may be overridden — a firm cannot invent
// scoring criteria, only tune the published ones.
export function mergeTunables(ruleset, overrides = {}) {
  const merged = structuredClone(ruleset.tunables);
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!(key in merged)) continue; // unknown tunable -> ignored, never invented
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof merged[key] === "object" &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

// Resolve the effective ruleset for a firm: registry entry + the firm's stored
// tunable overrides (firm_ruleset_overrides). This is what the scoring worker
// and the packet builder consume.
export async function resolveFirmRuleset(db, firmId) {
  const row = await getFirmRulesetOverrides(db, firmId);
  const key = row?.ruleset_key ?? californiaPi.key;
  const ruleset = getRuleset(key);
  if (!ruleset.active) throw new Error(`ruleset ${key} is not active`);
  const overrides = parseJson(row?.overrides, {});
  return { ...ruleset, tunables: mergeTunables(ruleset, overrides) };
}
