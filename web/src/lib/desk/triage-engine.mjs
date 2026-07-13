// Server bridge to the live triage engine (scoring-v2/triage-live.mjs).
//
// The engine is pure and lives at the repo root (vendored into web/.engine on
// Vercel). We load it through engineRoot() exactly like the v2 shadow pass, and
// inject the web-local firm-visible SOL computer (analysis/sol.mjs) so the
// engine stays free of any cross-package import. Nothing here calls an LLM: a
// triage is deterministic and instant.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../../../engine-root.mjs";
import { computeSol } from "../../../analysis/sol.mjs";

let _mod = null;
async function loadEngine() {
  if (_mod) return _mod;
  const href = pathToFileURL(join(engineRoot(), "scoring-v2", "triage-live.mjs")).href;
  _mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
  return _mod;
}

// Run one triage. Returns the full verdict object (grade, disposition, reason,
// flip fact, SOL, CA gates, compliance). `now` is injectable for tests.
export async function runTriage(input, profile = {}, now = new Date()) {
  const { triageFromFacts } = await loadEngine();
  return triageFromFacts(input, profile, { computeSol, now });
}

// The case-type menu the form offers (id + human label).
export async function triageCaseTypes() {
  const { TRIAGE_CASE_TYPES } = await loadEngine();
  return TRIAGE_CASE_TYPES;
}
