// Build-time step: copy the repo-root scoring engine + its data files INTO
// web/.engine so the Vercel serverless bundle (which is rooted at web/ and cannot
// see anything above it) can find them at runtime. See engine-root.mjs.
//
// This is a COPY, regenerated on every build. The originals in the repo root stay
// the single source of truth — the calibrated scoring prompts/examples are never
// edited or forked here. web/.engine is git-ignored.
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url)); // web/scripts
const WEB_ROOT = join(HERE, "..");                    // web
const REPO_ROOT = join(WEB_ROOT, "..");               // repo root
const ENGINE = join(WEB_ROOT, ".engine");

// Everything the demo + analysis passes read at runtime, by directory.
const DIRS = ["lib", "scoring", "config", "analysis"];

rmSync(ENGINE, { recursive: true, force: true });
mkdirSync(ENGINE, { recursive: true });

for (const d of DIRS) {
  const src = join(REPO_ROOT, d);
  if (!existsSync(src)) {
    console.warn(`[vendor-engine] WARNING: source dir missing, skipped: ${d}`);
    continue;
  }
  cpSync(src, join(ENGINE, d), { recursive: true });
  console.log(`[vendor-engine] copied ${d} -> .engine/${d}`);
}

console.log(`[vendor-engine] engine vendored into ${ENGINE}`);
