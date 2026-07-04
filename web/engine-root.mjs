// Resolve the base directory that holds the root scoring engine + its data files
// (lib/, scoring/, config/, analysis/).
//
// IMPORTANT: we must NOT derive this from `import.meta.url`. On Vercel this module
// gets bundled into .next/server/chunks/*, so import.meta.url points at the chunk,
// not at web/ — any path math off it is wrong. Instead we anchor on the process
// working directory (the serverless function root = /var/task on Vercel, where
// next.config's outputFileTracingIncludes drops ./.engine) and probe a small set
// of candidate roots for a sentinel file. The vendored copy (web/.engine, built by
// scripts/vendor-engine.mjs) wins when present; locally we fall back to the
// repo-root originals. The originals stay the single source of truth.
import { existsSync } from "node:fs";
import { join } from "node:path";

// A file that only exists at a real engine root, used to validate a candidate.
const SENTINEL = join("scoring", "system-prompt.md");

export function engineRoot() {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, ".engine"),        // Vercel: traced into /var/task/.engine
    join(cwd, "web", ".engine"), // repo-root cwd with a built web/.engine
    cwd,                         // cwd is itself an engine root
    join(cwd, ".."),             // local `next dev` with cwd = web/
  ];
  for (const c of candidates) {
    if (existsSync(join(c, SENTINEL))) return c;
  }
  // Sensible default (the Vercel layout) if nothing matched.
  return join(cwd, ".engine");
}
