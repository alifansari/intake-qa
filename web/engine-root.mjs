// Resolve the base directory that holds the root scoring engine + its data files
// (lib/, scoring/, config/, analysis/). These live at the REPO ROOT, one level
// ABOVE this web/ app. Locally that repo root is reachable, so we use it directly.
//
// On Vercel the project deploys ONLY web/ (Root Directory = web), so there is
// nothing above web/ in the serverless bundle — the repo-root dirs would resolve
// to a non-existent path. To fix that, `scripts/vendor-engine.mjs` copies those
// dirs into web/.engine at build time, and this resolver returns that vendored
// copy when it is present. The originals stay the single source of truth; the
// copy is generated (git-ignored) and never edited.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WEB_ROOT = dirname(fileURLToPath(import.meta.url)); // web/
const VENDORED = join(WEB_ROOT, ".engine");               // web/.engine (Vercel)
const REPO_ROOT = join(WEB_ROOT, "..");                   // repo root (local dev)

export function engineRoot() {
  return existsSync(VENDORED) ? VENDORED : REPO_ROOT;
}
