// Build-time step: copy the repo-root scoring engine + its data files INTO
// web/.engine so the Vercel serverless bundle (which is rooted at web/ and cannot
// see anything above it) can find them at runtime. See engine-root.mjs.
//
// web/.engine is a COMMITTED copy (see web/.gitignore note): it must always be
// present in the checkout because Vercel's Root Directory is web/ and the deploy
// cannot see the repo-root originals, and build/install scripts are not
// guaranteed to run. This script REFRESHES that copy from the repo-root source
// (the single source of truth) — but ONLY when the full source is reachable.
//
// CRITICAL: never delete .engine unless we can fully repopulate it. On Vercel the
// repo-root dirs may not be reachable from where this runs; deleting the committed
// copy there would leave .engine empty and break the deploy. So we check first.
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url)); // web/scripts
const WEB_ROOT = join(HERE, "..");                    // web
const REPO_ROOT = join(WEB_ROOT, "..");               // repo root
const ENGINE = join(WEB_ROOT, ".engine");

// Everything the demo + analysis passes read at runtime, by directory.
// scoring-v2 = the ENGINE V2 triage package (system-prompt, golds, firm config,
// lib/) the studio pipeline now runs (see lib/studio/pipeline.mjs cutover).
const DIRS = ["lib", "scoring", "scoring-v2", "config", "analysis"];

const missing = DIRS.filter((d) => !existsSync(join(REPO_ROOT, d)));
if (missing.length > 0) {
  // Source not reachable (e.g. web-only deploy context). Do NOT touch the
  // committed .engine — it already holds a good copy. Leave it exactly as-is.
  console.warn(
    `[vendor-engine] repo-root source not reachable (missing: ${missing.join(", ")}); ` +
      `keeping committed web/.engine as-is (no delete, no refresh).`,
  );
  process.exit(0);
}

// Full source present — safe to delete and refresh the committed copy.
rmSync(ENGINE, { recursive: true, force: true });
mkdirSync(ENGINE, { recursive: true });

for (const d of DIRS) {
  cpSync(join(REPO_ROOT, d), join(ENGINE, d), { recursive: true });
  console.log(`[vendor-engine] copied ${d} -> .engine/${d}`);
}

// The engine .js files use ESM `import`. The repo root is "type":"module", but
// web/package.json is not — so without this marker the vendored .js under web/
// would be treated as CommonJS and throw "Cannot use import statement outside a
// module". This package.json makes everything under .engine ESM. Node reads it at
// runtime to resolve module type, so it MUST ship in the traced bundle.
writeFileSync(join(ENGINE, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
console.log(`[vendor-engine] wrote .engine/package.json ({"type":"module"})`);

console.log(`[vendor-engine] engine refreshed into ${ENGINE}`);
